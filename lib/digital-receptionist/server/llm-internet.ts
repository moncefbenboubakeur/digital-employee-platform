import Anthropic from '@anthropic-ai/sdk'
import type { DemoLanguage, PilotProfile } from '../demo-data'
import { getLapiAuthToken, lapiBaseUrl, lapiIsConfigured } from './lapi-client'

/**
 * Internet fallback — when a visitor asks a question with no approved
 * answer AND the operator has enabled web search, route the question to
 * a LAPI project with web tools available (dep-internet-fallback,
 * currently backed by claude-cli). The model browses the web and returns
 * a short, factual answer with its confidence level and source URLs.
 *
 * The kiosk shows the result with a "I wasn't trained on this question,
 * but here's what I found online:" prefix — clearly labelling it as
 * un-validated web content.
 */

export type InternetAnswer = {
  text: string
  confidence: 'high' | 'medium' | 'low'
  sources: string[]
}

export function isInternetFallbackEnabled(): boolean {
  return process.env.DR_LLM_INTERNET === '1' && lapiIsConfigured()
}

const LAPI_PROJECT = 'dep-internet-fallback'
const LAPI_MODEL_FIELD = 'claude-cli'

function systemPromptFor(profile: PilotProfile, language: DemoLanguage): string {
  const tenant =
    profile.tenantName[language] ||
    profile.tenantName.fr ||
    profile.tenantName.en
  return [
    `You answer visitor questions for ${tenant}, a public-service reception desk.`,
    `The visitor's question is not in the office's approved-answers catalog, so you may use web search to find an answer.`,
    ``,
    `Rules:`,
    `1. Search the web before answering. If you don't search, return confidence="low".`,
    `2. Answer in the visitor's language: ${language === 'ar' ? 'Arabic' : language === 'fr' ? 'French' : 'English'}.`,
    `3. Keep the answer to 1-3 short sentences. The kiosk will read it aloud, so plain prose only — no bullets, no headings, no markdown.`,
    `4. If the question is about this specific office's hours, prices, counters, or staff, refuse — only the office can answer those. Set confidence="low" and answer with a short "I can't find that online; please ask the reception desk."`,
    `5. Set confidence honestly:`,
    `   - "high" — a reputable source directly answers the question.`,
    `   - "medium" — multiple sources hint at the answer but with some ambiguity.`,
    `   - "low" — you couldn't find a confident answer or the question is out of scope.`,
    `6. Return strict JSON matching the schema. No prose outside the JSON.`,
  ].join('\n')
}

const internetSchema = {
  type: 'object',
  properties: {
    text: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    sources: { type: 'array', items: { type: 'string' } },
  },
  required: ['text', 'confidence', 'sources'],
  additionalProperties: false,
} as const

export async function findInternetAnswer({
  question,
  language,
  profile,
}: {
  question: string
  language: DemoLanguage
  profile: PilotProfile
}): Promise<InternetAnswer | null> {
  if (!isInternetFallbackEnabled()) {
    return null
  }

  const client = new Anthropic({
    baseURL: lapiBaseUrl(),
    authToken: getLapiAuthToken(),
    defaultHeaders: { 'X-Project': LAPI_PROJECT },
  })

  let response
  try {
    response = await client.messages.create({
      model: LAPI_MODEL_FIELD,
      max_tokens: 1024,
      system: systemPromptFor(profile, language),
      output_config: { format: { type: 'json_schema', schema: internetSchema } },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Visitor question (${language}): ${question}\n\nSearch the web if needed, then return JSON with text, confidence, and sources.`,
            },
          ],
        },
      ],
    })
  } catch (error) {
    console.warn('[llm-internet] LAPI call failed', error)
    return null
  }

  const block = response.content.find((b) => b.type === 'text')
  if (!block || block.type !== 'text') {
    return null
  }
  // CLI backends sometimes wrap JSON in chatter — recover the first {...}
  let parsed: { text?: unknown; confidence?: unknown; sources?: unknown }
  try {
    parsed = JSON.parse(block.text)
  } catch {
    const m = block.text.match(/\{[\s\S]*\}/)
    if (!m) {
      console.warn('[llm-internet] no JSON object in response')
      return null
    }
    try {
      parsed = JSON.parse(m[0])
    } catch (error) {
      console.warn('[llm-internet] JSON parse failed', error)
      return null
    }
  }

  const text = typeof parsed.text === 'string' ? parsed.text.trim() : ''
  if (!text) return null
  const confidence: InternetAnswer['confidence'] =
    parsed.confidence === 'high' || parsed.confidence === 'medium'
      ? parsed.confidence
      : 'low'
  const sources = Array.isArray(parsed.sources)
    ? parsed.sources.filter((s): s is string => typeof s === 'string' && s.length > 0).slice(0, 5)
    : []

  return { text, confidence, sources }
}
