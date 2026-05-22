import { promises as fs } from 'node:fs'
import path from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import type {
  DemoLanguage,
  LocalizedText,
  PilotProfile,
  UnknownQuestionDraft,
} from '../demo-data'
import { storageDir } from './storage'
import { getLapiAuthToken, lapiBaseUrl, lapiIsConfigured } from './lapi-client'
import { DRAFTER_PINNED_PROJECT } from '../lapi-routing'

// Why an env gate: this feature is opt-in because background drafting
// generates content that may surface to visitors after operator review.
// Default behavior of the pilot stays purely local until an operator flips
// the flag. Routes through LAPI — DEP no longer holds provider credentials.
export function isLlmDraftsEnabled(): boolean {
  return process.env.DR_LLM_DRAFTS === '1' && lapiIsConfigured()
}

// Default LAPI project. Daemon-side YAML at ~/.llmbridge/projects/dep-drafter.yaml
// selects the actual backend (claude-api, claude-cli, codex-cli, …). The
// drafter can tolerate higher latency than the matcher, so it's a candidate
// for subscription-backed CLI routing (free at point of use). The admin
// "test routing" UI can override this per draft via projectName.

const LAPI_MODEL_FIELD = 'claude-api'

function draftDir(): string {
  return path.join(storageDir(), 'unknown-drafts')
}

function draftPath(unknownId: string): string {
  // Strip anything that isn't a safe filename character so a hostile
  // candidate id can't escape the storage directory.
  const safe = unknownId.replace(/[^a-zA-Z0-9._-]/g, '_')
  return path.join(draftDir(), `${safe}.json`)
}

export async function loadDraft(unknownId: string): Promise<UnknownQuestionDraft | null> {
  try {
    const raw = await fs.readFile(draftPath(unknownId), 'utf8')
    const parsed = JSON.parse(raw) as Partial<UnknownQuestionDraft>
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !parsed.answerText ||
      typeof parsed.answerText !== 'object'
    ) {
      return null
    }
    return {
      answerText: parsed.answerText as LocalizedText,
      source: typeof parsed.source === 'string' ? parsed.source : 'llm',
      generatedAt:
        typeof parsed.generatedAt === 'string' ? parsed.generatedAt : new Date().toISOString(),
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    console.warn('[llm-drafts] loadDraft failed', unknownId, error)
    return null
  }
}

function buildSystemPrompt(profile: PilotProfile): string {
  return [
    `You draft suggested answers for a digital reception assistant in a public-service office.`,
    `Office: ${profile.tenantName.fr} — ${profile.locationName.fr}.`,
    `Service summary: ${profile.serviceSummary.fr}`,
    `Opening hours: ${profile.openingHours.fr}.`,
    `Reply phone: ${profile.contactNumber}.`,
    ``,
    `Rules:`,
    `1. Produce a short, factual draft answer (2–4 sentences) in Arabic, French, and English.`,
    `2. Stay within the scope of what this office actually handles. If the question is clearly out of scope, say so and direct the visitor to staff.`,
    `3. Never invent specific document numbers, prices, or counter numbers you were not told. If the answer requires office-specific facts, say "Demandez à l'agent" / "اطلب من الموظف" / "Ask the staff" instead.`,
    `4. Keep the tone direct and helpful, suitable to be read aloud.`,
    `5. Output JSON only, matching the schema exactly.`,
  ].join('\n')
}

export type GenerateDraftInput = {
  unknownId: string
  question: string
  language: DemoLanguage
  profile: PilotProfile
  /** Override default `dep-drafter` LAPI project (admin test routing). */
  projectName?: string
}

const draftSchema = {
  type: 'object',
  properties: {
    ar: { type: 'string' },
    fr: { type: 'string' },
    en: { type: 'string' },
  },
  required: ['ar', 'fr', 'en'],
  additionalProperties: false,
} as const

export async function generateAndStoreDraft(
  input: GenerateDraftInput
): Promise<UnknownQuestionDraft | null> {
  if (!isLlmDraftsEnabled()) {
    return null
  }

  const projectName = input.projectName ?? DRAFTER_PINNED_PROJECT
  // Anthropic SDK pointed at LAPI. authToken sends `Authorization: Bearer`.
  const client = new Anthropic({
    baseURL: lapiBaseUrl(),
    authToken: getLapiAuthToken(),
    defaultHeaders: { 'X-Project': projectName },
  })

  let response
  try {
    response = await client.messages.create({
      model: LAPI_MODEL_FIELD,
      max_tokens: 1024,
      system: buildSystemPrompt(input.profile),
      output_config: { format: { type: 'json_schema', schema: draftSchema } },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                `Visitor question (language: ${input.language}):\n${input.question}\n\n` +
                `Return a draft answer in all three languages following the schema.`,
            },
          ],
        },
      ],
    })
  } catch (error) {
    console.warn('[llm-drafts] LAPI call failed', input.unknownId, error)
    return null
  }

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    return null
  }

  let parsed: Partial<LocalizedText>
  try {
    parsed = JSON.parse(textBlock.text) as Partial<LocalizedText>
  } catch (error) {
    console.warn('[llm-drafts] JSON parse failed', input.unknownId, error)
    return null
  }

  if (
    !parsed ||
    typeof parsed.ar !== 'string' ||
    typeof parsed.fr !== 'string' ||
    typeof parsed.en !== 'string'
  ) {
    return null
  }

  const draft: UnknownQuestionDraft = {
    answerText: { ar: parsed.ar, fr: parsed.fr, en: parsed.en },
    // response.model carries whatever the model field was set to (the LAPI
    // backend id). To know the actual provider model used we'd need a v2.x
    // LAPI feature that surfaces it. For now the source is the LAPI project.
    source: `lapi:${projectName}`,
    generatedAt: new Date().toISOString(),
  }

  try {
    await fs.mkdir(draftDir(), { recursive: true })
    await fs.writeFile(draftPath(input.unknownId), JSON.stringify(draft, null, 2), 'utf8')
  } catch (error) {
    console.warn('[llm-drafts] failed to write draft', input.unknownId, error)
    // The in-memory draft is still useful even if persistence failed.
  }

  return draft
}
