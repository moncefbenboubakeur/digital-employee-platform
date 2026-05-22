import {
  answerCategories,
  type AnswerCategory,
  type DemoAnswer,
  type DemoLanguage,
  fallbackResponse,
  initialDemoAnswers,
  initialUnknownQuestions,
  pilotProfile,
  type LocalizedText,
  type PilotCounter,
  type PilotProfile,
  type QuestionEvent,
  type UnknownQuestion,
} from './demo-data'

export type PilotSnapshot = {
  version: 1
  exportedAt: string
  profile: PilotProfile
  answers: DemoAnswer[]
  unknownQuestions: UnknownQuestion[]
  events: QuestionEvent[]
}

const languageIds: DemoLanguage[] = ['ar', 'fr', 'en']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function languageValue(value: unknown, fallback: DemoLanguage): DemoLanguage {
  return languageIds.includes(value as DemoLanguage) ? (value as DemoLanguage) : fallback
}

function categoryValue(value: unknown, fallback: AnswerCategory): AnswerCategory {
  return answerCategories.includes(value as AnswerCategory) ? (value as AnswerCategory) : fallback
}

export function createLocalizedText(value = ''): LocalizedText {
  return {
    ar: value,
    fr: value,
    en: value,
  }
}

export function normalizeLocalizedText(value: unknown, fallback: LocalizedText): LocalizedText {
  if (!isRecord(value)) {
    return fallback
  }

  return {
    ar: stringValue(value.ar, fallback.ar),
    fr: stringValue(value.fr, fallback.fr),
    en: stringValue(value.en, fallback.en),
  }
}

export function createBlankCounter(): PilotCounter {
  const id = `counter-${Date.now()}-${Math.random().toString(16).slice(2)}`

  return {
    id,
    label: createLocalizedText('New service'),
    status: createLocalizedText('Counter status'),
  }
}

export function createBlankAnswer(): DemoAnswer {
  return {
    id: `answer-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    canonicalQuestion: {
      ar: 'سؤال جديد',
      fr: 'Nouvelle question',
      en: 'New question',
    },
    answerText: {
      ar: 'اكتب الإجابة المعتمدة هنا.',
      fr: 'Écrivez ici la réponse validée.',
      en: 'Write the approved answer here.',
    },
    keywords: [],
    usageCount: 0,
    lastUpdated: new Date().toISOString().slice(0, 10),
    category: 'support',
    published: false,
  }
}

export function normalizePilotProfile(value: unknown): PilotProfile {
  if (!isRecord(value)) {
    return pilotProfile
  }

  const rawCounters = Array.isArray(value.counters) ? value.counters : pilotProfile.counters
  const counters = rawCounters
    .filter(isRecord)
    .map((counter, index) => {
      const fallback = pilotProfile.counters[index] ?? createBlankCounter()

      return {
        id: stringValue(counter.id, fallback.id),
        label: normalizeLocalizedText(counter.label, fallback.label),
        status: normalizeLocalizedText(counter.status, fallback.status),
      }
    })

  return {
    tenantName: normalizeLocalizedText(value.tenantName, pilotProfile.tenantName),
    locationName: normalizeLocalizedText(value.locationName, pilotProfile.locationName),
    welcomeTitle: normalizeLocalizedText(value.welcomeTitle, pilotProfile.welcomeTitle),
    serviceSummary: normalizeLocalizedText(value.serviceSummary, pilotProfile.serviceSummary),
    privacyNote: normalizeLocalizedText(value.privacyNote, pilotProfile.privacyNote),
    openingHours: normalizeLocalizedText(value.openingHours, pilotProfile.openingHours),
    contactNumber: stringValue(value.contactNumber, pilotProfile.contactNumber),
    defaultLanguage: languageValue(value.defaultLanguage, pilotProfile.defaultLanguage),
    currentWait: normalizeLocalizedText(value.currentWait, pilotProfile.currentWait),
    liveStatus: normalizeLocalizedText(value.liveStatus, pilotProfile.liveStatus),
    fallbackResponse: normalizeLocalizedText(value.fallbackResponse, pilotProfile.fallbackResponse),
    useInternetFallback: booleanValue(value.useInternetFallback, pilotProfile.useInternetFallback),
    counters,
  }
}

export function normalizeAnswers(value: unknown): DemoAnswer[] {
  const rawAnswers = Array.isArray(value) ? value : initialDemoAnswers

  return rawAnswers.filter(isRecord).map((answer, index) => {
    const fallback = initialDemoAnswers[index] ?? createBlankAnswer()
    const rawKeywords = Array.isArray(answer.keywords) ? answer.keywords : fallback.keywords

    return {
      id: stringValue(answer.id, fallback.id),
      canonicalQuestion: normalizeLocalizedText(answer.canonicalQuestion, fallback.canonicalQuestion),
      answerText: normalizeLocalizedText(answer.answerText, fallback.answerText),
      keywords: rawKeywords
        .filter((keyword): keyword is string => typeof keyword === 'string')
        .map((keyword) => keyword.trim())
        .filter(Boolean),
      actionId: typeof answer.actionId === 'string' && answer.actionId ? answer.actionId : undefined,
      usageCount: numberValue(answer.usageCount, fallback.usageCount),
      lastUpdated: stringValue(answer.lastUpdated, fallback.lastUpdated),
      category: categoryValue(answer.category, fallback.category),
      published: booleanValue(answer.published, true),
    }
  })
}

export function normalizeUnknownQuestions(value: unknown): UnknownQuestion[] {
  const rawQuestions = Array.isArray(value) ? value : initialUnknownQuestions

  return rawQuestions.filter(isRecord).map((question, index) => {
    const fallback = initialUnknownQuestions[index] ?? {
      id: `unknown-${Date.now()}-${index}`,
      question: '',
      language: 'fr' as DemoLanguage,
      fallbackResponse,
      count: 1,
      confidence: 'low' as const,
      status: 'new' as const,
      createdAt: new Date().toISOString(),
    }

    const rawStatus = stringValue(question.status, fallback.status)
    const status =
      rawStatus === 'approved' || rawStatus === 'rejected' || rawStatus === 'out_of_scope'
        ? rawStatus
        : 'new'
    const rawConfidence = stringValue(question.confidence, fallback.confidence)

    const draft = isRecord(question.draft) ? question.draft : undefined

    return {
      id: stringValue(question.id, fallback.id),
      question: stringValue(question.question, fallback.question),
      language: languageValue(question.language, fallback.language),
      fallbackResponse: normalizeLocalizedText(question.fallbackResponse, fallback.fallbackResponse),
      count: numberValue(question.count, fallback.count),
      confidence: rawConfidence === 'medium' ? 'medium' : 'low',
      status,
      createdAt: stringValue(question.createdAt, fallback.createdAt),
      ...(draft && isRecord(draft.answerText)
        ? {
            draft: {
              answerText: normalizeLocalizedText(draft.answerText, fallbackResponse),
              source: stringValue(draft.source, 'llm'),
              generatedAt: stringValue(draft.generatedAt, new Date().toISOString()),
            },
          }
        : {}),
    }
  })
}

export function normalizeQuestionEvents(value: unknown): QuestionEvent[] {
  const rawEvents = Array.isArray(value) ? value : []

  return rawEvents.filter(isRecord).map((event, index) => ({
    id: stringValue(event.id, `event-${Date.now()}-${index}`),
    question: stringValue(event.question, ''),
    language: languageValue(event.language, 'fr'),
    cacheHit: booleanValue(event.cacheHit, false),
    answerId: typeof event.answerId === 'string' && event.answerId ? event.answerId : undefined,
    createdAt: stringValue(event.createdAt, new Date().toISOString()),
  }))
}

export function createPilotSnapshot(input: {
  profile: PilotProfile
  answers: DemoAnswer[]
  unknownQuestions: UnknownQuestion[]
  events: QuestionEvent[]
}): PilotSnapshot {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: input.profile,
    answers: input.answers,
    unknownQuestions: input.unknownQuestions,
    events: input.events,
  }
}

export function serializePilotSnapshot(snapshot: PilotSnapshot) {
  return JSON.stringify(snapshot, null, 2)
}

export function parsePilotSnapshot(raw: string): PilotSnapshot {
  const parsed = JSON.parse(raw) as unknown

  if (!isRecord(parsed)) {
    throw new Error('Pilot import must be a JSON object.')
  }

  return createPilotSnapshot({
    profile: normalizePilotProfile(parsed.profile),
    answers: normalizeAnswers(parsed.answers),
    unknownQuestions: normalizeUnknownQuestions(parsed.unknownQuestions),
    events: normalizeQuestionEvents(parsed.events),
  })
}

export function parseKeywordDraft(value: string) {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((keyword) => keyword.trim())
        .filter(Boolean)
    )
  )
}

export function formatKeywordDraft(keywords: string[]) {
  return keywords.join(', ')
}
