import Anthropic from '@anthropic-ai/sdk'
import type { DemoLanguage } from '../demo-data'
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
// configured with. DR_LLM_MATCH_MODEL is no longer consulted — that decision
// now lives in the daemon's env (e.g. LLMBRIDGE_CC_MODEL) and the project
// YAML. Kept the env var name in .env.example as a hint, but it's a no-op
// in DEP code.
const LAPI_MODEL_FIELD = 'claude-api'

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

  // Cap to keep token cost predictable. 50 answers × ~150 tokens each = ~7.5k
  // input tokens which is well within Haiku's budget.
  const slice = candidates.slice(0, 50)
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
