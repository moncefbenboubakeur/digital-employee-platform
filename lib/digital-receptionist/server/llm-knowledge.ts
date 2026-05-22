import Anthropic from '@anthropic-ai/sdk'
import type { DemoLanguage, PilotProfile } from '../demo-data'
import { getLapiAuthToken, lapiBaseUrl, lapiIsConfigured } from './lapi-client'

/**
 * Fast knowledge-only pass for unknown visitor questions. This is stage
 * one of the two-stage internet fallback flow:
 *
 *   matcher misses
 *      ↓
 *   findKnowledgeAnswer   — claude-cli, NO web tools, ~3-6s
 *      ↓
 *   high confidence?      — yes → kiosk shows the answer (fast path)
 *      ↓ no
 *   findInternetAnswer    — claude-cli + web search, ~20-25s
 *      ↓
 *   high/medium confidence? — yes → kiosk shows answer + sources
 *      ↓ no
 *   canned fallback message
 *
 * Most well-known facts (history, science, definitions, geography) get
 * answered in stage one. Time-sensitive or local-specific questions
 * (weather, prices, today's news, "what time does my local APC open")
 * are pushed to stage two by an honest "low confidence" gate baked
 * into the system prompt.
 *
 * Same response shape as InternetAnswer so the kiosk can render both
 * identically (sources will just be empty for the knowledge path).
 */

export type KnowledgeAnswer = {
  text: string
  confidence: 'high' | 'medium' | 'low'
  sources: string[]
}

export function isKnowledgeFallbackEnabled(): boolean {
  // Reuses the same global env flag as the internet path — operators
  // who turn on internet fallback get the fast knowledge stage for
  // free. No separate gate.
  return process.env.DR_LLM_INTERNET === '1' && lapiIsConfigured()
}

const LAPI_PROJECT = 'dep-knowledge-fast'
const LAPI_MODEL_FIELD = 'claude-cli'

function systemPromptFor(profile: PilotProfile, language: DemoLanguage): string {
  const tenant =
    profile.tenantName[language] ||
    profile.tenantName.fr ||
    profile.tenantName.en
  return [
    `You answer visitor questions for ${tenant}, a public-service reception desk.`,
    `The question is not in the office's approved-answer catalog.`,
    `You are running in KNOWLEDGE-ONLY mode — you cannot search the web here.`,
    `Answer ONLY from what you reliably know from training.`,
    ``,
    `Rules:`,
    `1. Answer in the visitor's language: ${language === 'ar' ? 'Arabic' : language === 'fr' ? 'French' : 'English'}.`,
    `2. 1-3 short plain sentences. No bullets, no markdown — the kiosk will read it aloud.`,
    `3. Be HONEST about confidence. NEVER return "high" for any of these:`,
    `   - Today's weather, current prices, exchange rates, stock prices.`,
    `   - News, scores, or events from the past 12 months.`,
    `   - Specific facts about this APC (its hours, fees, counter numbers, today's wait).`,
    `   - Facts about small/local organizations, individuals, or businesses you have not heard of.`,
    `   - Anything where a wrong answer would mislead a citizen at a government desk.`,
    `4. Use "high" only for stable, widely-taught facts (history, science, geography, definitions, general knowledge).`,
    `5. Use "medium" when you think you know but there's some uncertainty.`,
    `6. Use "low" when you're not sure or when the question needs current data. The system will then search the web for you — that is the correct behavior.`,
    `7. If you return "low", still produce a short text explaining what you couldn't answer — it won't be shown but helps logging.`,
    `8. Output strict JSON: { text, confidence }`,
  ].join('\n')
}

const knowledgeSchema = {
  type: 'object',
  properties: {
    text: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['text', 'confidence'],
  additionalProperties: false,
} as const

export async function findKnowledgeAnswer({
  question,
  language,
  profile,
  signal,
}: {
  question: string
  language: DemoLanguage
  profile: PilotProfile
  signal?: AbortSignal
}): Promise<KnowledgeAnswer | null> {
  if (!isKnowledgeFallbackEnabled()) {
    return null
  }

  const client = new Anthropic({
    baseURL: lapiBaseUrl(),
    authToken: getLapiAuthToken(),
    defaultHeaders: { 'X-Project': LAPI_PROJECT },
  })

  let response
  try {
    response = await client.messages.create(
      {
        model: LAPI_MODEL_FIELD,
        max_tokens: 512,
        system: systemPromptFor(profile, language),
        output_config: { format: { type: 'json_schema', schema: knowledgeSchema } },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Visitor question (${language}): ${question}\n\nReturn JSON with text and confidence.`,
              },
            ],
          },
        ],
      },
      { signal },
    )
  } catch (error) {
    if (signal?.aborted) return null
    console.warn('[llm-knowledge] LAPI call failed', error)
    return null
  }

  const block = response.content.find((b) => b.type === 'text')
  if (!block || block.type !== 'text') return null

  let parsed: { text?: unknown; confidence?: unknown }
  try {
    parsed = JSON.parse(block.text)
  } catch {
    const m = block.text.match(/\{[\s\S]*\}/)
    if (!m) return null
    try {
      parsed = JSON.parse(m[0])
    } catch {
      return null
    }
  }

  const text = typeof parsed.text === 'string' ? parsed.text.trim() : ''
  if (!text) return null
  const confidence: KnowledgeAnswer['confidence'] =
    parsed.confidence === 'high' || parsed.confidence === 'medium'
      ? parsed.confidence
      : 'low'

  return { text, confidence, sources: [] }
}
