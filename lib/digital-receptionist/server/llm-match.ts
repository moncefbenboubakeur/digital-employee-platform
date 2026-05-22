import Anthropic from '@anthropic-ai/sdk'
import type { DemoLanguage } from '../demo-data'
import {
  cosineSimilarity,
  embedTexts,
  embeddingsAvailable,
} from './embeddings'
import { getLapiAuthToken, lapiBaseUrl, lapiIsConfigured } from './lapi-client'

export type LlmMatchCandidate = {
  id: string
  canonical: string
  answer: string
}

export type LlmMatchResult = {
  matchedAnswerId: string | null
  confidence: 'high' | 'medium' | 'low'
}

// Gated separately from DR_LLM_DRAFTS so an operator can enable visitor-facing
// matching without auto-drafting unknowns, or vice-versa.
//
// Routes through LAPI (the local llmbridge daemon) — DEP no longer holds an
// Anthropic API key. The daemon owns provider credentials.
export function isLlmMatchEnabled(): boolean {
  return process.env.DR_LLM_MATCH === '1' && lapiIsConfigured()
}

// LAPI project name. Daemon-side config lives at
// ~/.llmbridge/projects/dep-match.yaml and picks the actual provider+model.
// Changing the routing (claude-api vs openai-api vs ...) is a one-line YAML
// edit on the daemon, not a DEP code change.
const LAPI_PROJECT = 'dep-match'

// `model` is the LAPI backend id, not the underlying provider model. The
// daemon resolves to whatever Anthropic/OpenAI/Google model the backend is
// configured with.
const LAPI_MODEL_FIELD = 'claude-api'

// How many top candidates from the embedding pre-filter we forward to the
// LLM tie-break step. Smaller = faster LLM call but more chance the right
// answer is filtered out; larger = slower but safer. 8 is a balance that
// keeps the LLM input under ~1.5k tokens while leaving headroom for the
// embedding model's occasional mis-rankings.
const PRE_FILTER_TOP_K = 8

const matchSchema = {
  type: 'object',
  properties: {
    matchedAnswerId: { type: ['string', 'null'] },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['matchedAnswerId', 'confidence'],
  additionalProperties: false,
} as const

const SYSTEM_PROMPT = [
  'You match a visitor question against a catalog of approved answers for an office reception assistant.',
  '',
  'Rules:',
  '1. Return the id of the catalog entry that BEST answers the visitor\'s question.',
  '2. Match on meaning, not on exact words. "When does the office close today?" matches an "opening hours" answer because the hours describe both opening AND closing.',
  '3. If two answers are both plausible, pick the one most directly addressing the visitor\'s phrasing.',
  '4. If NO approved answer truly answers the question, return matchedAnswerId=null. Do NOT guess.',
  '5. Set confidence to "high" when the match is unambiguous, "medium" when reasonable, "low" when uncertain. Never return a wrong id with high confidence.',
  '',
  'Output strict JSON matching the schema.',
].join('\n')

// ───────────────────────────────────────────────────────────────────────────
// Embedding cache (per-process, in-memory)
// ───────────────────────────────────────────────────────────────────────────
//
// Catalog content is static across many requests, so we embed it once on
// first call and reuse. Cache key = JSON-stringified candidate ids+text so
// that any catalog edit (which changes ids, canonical, or answer) busts
// the cache automatically. SQLite-persisted cache is a v2 follow-up if
// startup cost matters at scale.

type CandidateVectors = {
  cacheKey: string
  vectors: number[][]
  candidates: LlmMatchCandidate[]
}

let cachedVectors: CandidateVectors | null = null

function catalogCacheKey(candidates: LlmMatchCandidate[]): string {
  // Stable, content-addressable key. Order matters because we keep
  // candidates and vectors index-aligned.
  return JSON.stringify(
    candidates.map((c) => [c.id, c.canonical.length, c.answer.length]),
  )
}

async function preFilterByEmbedding(
  question: string,
  candidates: LlmMatchCandidate[],
): Promise<LlmMatchCandidate[]> {
  const cacheKey = catalogCacheKey(candidates)

  if (!cachedVectors || cachedVectors.cacheKey !== cacheKey) {
    // Embed the full catalog. Use the canonical question line, NOT the
    // answer body, since we're matching questions to questions.
    const catalogTexts = candidates.map((c) => c.canonical)
    const vectors = await embedTexts(catalogTexts)
    cachedVectors = { cacheKey, vectors, candidates }
  }

  // Embed the visitor question, then cosine-similarity rank.
  const [questionVec] = await embedTexts([question])
  const scored = cachedVectors.candidates.map((cand, i) => ({
    candidate: cand,
    score: cosineSimilarity(questionVec, cachedVectors!.vectors[i]),
  }))
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, PRE_FILTER_TOP_K).map((s) => s.candidate)
}

export async function findLlmMatch({
  question,
  language,
  candidates,
}: {
  question: string
  language: DemoLanguage
  candidates: LlmMatchCandidate[]
}): Promise<LlmMatchResult | null> {
  if (!isLlmMatchEnabled() || candidates.length === 0) {
    return null
  }

  // Two-stage retrieval:
  //   1. Embedding pre-filter narrows candidates to the top-K most-similar.
  //      Cheap (~50ms locally, no network).
  //   2. LLM tie-break + confidence label on just those K candidates.
  //      ~500 input tokens instead of ~7,500.
  //
  // ⚠ Disabled by default as of 2026-05-22 — the 10-sample bench
  // (scripts/lapi-bench.ts) showed the pre-filter is flat-to-slower for
  // CLI backends because their cold-start overhead (4-8s) dominates the
  // matcher latency, not input token count. The pre-filter adds ~50ms
  // overhead per question with no payoff. Set DR_MATCHER_PREFILTER=1 to
  // re-enable (useful for paid API backends where input tokens cost real
  // money, or for catalogs in the hundreds of entries). See
  // scripts/lapi-bench-results.json for the data.
  let workingSet: LlmMatchCandidate[] = candidates
  if (
    process.env.DR_MATCHER_PREFILTER === '1' &&
    embeddingsAvailable() &&
    candidates.length > PRE_FILTER_TOP_K
  ) {
    try {
      workingSet = await preFilterByEmbedding(question, candidates)
    } catch (error) {
      console.warn('[llm-match] embedding pre-filter failed, falling back to full catalog', error)
      // Best-effort: keep going with full catalog. The LLM step still works,
      // just slower.
    }
  }

  // Cap to keep token cost predictable even on the fallback path (no
  // embeddings, full catalog). 50 answers × ~150 tokens each = ~7.5k input
  // tokens which is well within Haiku's budget.
  const slice = workingSet.slice(0, 50)
  const catalog = slice
    .map((entry, index) => `${index + 1}. id="${entry.id}"\n   Q: ${entry.canonical}\n   A: ${entry.answer}`)
    .join('\n')

  // Anthropic SDK pointed at LAPI. authToken (not apiKey) makes the SDK
  // send `Authorization: Bearer <token>`, which is what LAPI's auth
  // middleware expects.
  const client = new Anthropic({
    baseURL: lapiBaseUrl(),
    authToken: getLapiAuthToken(),
    defaultHeaders: { 'X-Project': LAPI_PROJECT },
  })

  let response
  try {
    response = await client.messages.create({
      model: LAPI_MODEL_FIELD,
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      output_config: { format: { type: 'json_schema', schema: matchSchema } },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                `Approved answers (language: ${language}):\n${catalog}\n\n` +
                `Visitor question (language: ${language}): "${question}"\n\n` +
                'Return the matching id (or null) per the schema.',
            },
          ],
        },
      ],
    })
  } catch (error) {
    console.warn('[llm-match] LAPI call failed', error)
    return null
  }

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    return null
  }

  let parsed: { matchedAnswerId?: unknown; confidence?: unknown }
  try {
    parsed = JSON.parse(textBlock.text)
  } catch (error) {
    console.warn('[llm-match] JSON parse failed', error)
    return null
  }

  const rawId = parsed.matchedAnswerId
  const id = typeof rawId === 'string' && rawId.length > 0 ? rawId : null
  const confidence: LlmMatchResult['confidence'] =
    parsed.confidence === 'high' || parsed.confidence === 'medium' ? parsed.confidence : 'low'

  // Defensive: only trust ids that actually exist in the candidate list.
  if (id && !slice.some((entry) => entry.id === id)) {
    return { matchedAnswerId: null, confidence: 'low' }
  }

  return { matchedAnswerId: id, confidence }
}
