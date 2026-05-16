import {
  type DemoAction,
  type DemoAnswer,
  type DemoLanguage,
  fallbackResponse,
  type LocalizedText,
  type QuestionEvent,
  type UnknownQuestion,
} from './demo-data'

export type MatchResult =
  | {
      hit: true
      answer: DemoAnswer
      score: number
    }
  | {
      hit: false
      fallbackResponse: LocalizedText
    }

export function normalizeQuestion(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[؟?.,;:!()[\]{}"']/g, ' ')
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function matchQuestion(question: string, answers: DemoAnswer[]): MatchResult {
  const normalized = normalizeQuestion(question)

  if (!normalized) {
    return { hit: false, fallbackResponse }
  }

  const scored = answers
    .map((answer) => {
      const canonicalText = Object.values(answer.canonicalQuestion)
        .map(normalizeQuestion)
        .join(' ')
      const keywordScore = answer.keywords.reduce((score, keyword) => {
        const normalizedKeyword = normalizeQuestion(keyword)

        if (!normalizedKeyword) {
          return score
        }

        if (normalized === normalizedKeyword) {
          return score + 5
        }

        if (normalized.includes(normalizedKeyword)) {
          return score + Math.min(4, normalizedKeyword.length / 4)
        }

        if (canonicalText.includes(normalizedKeyword) && normalized.includes(normalizedKeyword)) {
          return score + 1
        }

        return score
      }, 0)

      const canonicalScore = canonicalText.includes(normalized) ? 4 : 0

      return {
        answer,
        score: keywordScore + canonicalScore,
      }
    })
    .sort((a, b) => b.score - a.score)

  const best = scored[0]

  if (!best || best.score < 1.25) {
    return { hit: false, fallbackResponse }
  }

  return { hit: true, answer: best.answer, score: best.score }
}

export function createQuestionEvent(input: {
  question: string
  language: DemoLanguage
  cacheHit: boolean
  answerId?: string
}): QuestionEvent {
  return {
    id: `event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    question: input.question,
    language: input.language,
    cacheHit: input.cacheHit,
    answerId: input.answerId,
    createdAt: new Date().toISOString(),
  }
}

export function createUnknownQuestion(
  question: string,
  language: DemoLanguage,
  existingQuestions: UnknownQuestion[]
): UnknownQuestion[] {
  const normalized = normalizeQuestion(question)
  const existing = existingQuestions.find(
    (candidate) =>
      candidate.status === 'new' &&
      candidate.language === language &&
      normalizeQuestion(candidate.question) === normalized
  )

  if (existing) {
    return existingQuestions.map((candidate) =>
      candidate.id === existing.id ? { ...candidate, count: candidate.count + 1 } : candidate
    )
  }

  return [
    {
      id: `unknown-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      question,
      language,
      fallbackResponse,
      count: 1,
      confidence: 'low',
      status: 'new',
      createdAt: new Date().toISOString(),
    },
    ...existingQuestions,
  ]
}

export function promoteCandidateToAnswer(input: {
  candidate: UnknownQuestion
  answerText: LocalizedText
  actionId?: string
  existingAnswers: DemoAnswer[]
}): DemoAnswer {
  const keywordSeed = normalizeQuestion(input.candidate.question)
    .split(' ')
    .filter((part) => part.length > 2)
    .slice(0, 8)

  return {
    id: `approved-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    canonicalQuestion: {
      ar: input.candidate.language === 'ar' ? input.candidate.question : input.candidate.question,
      fr: input.candidate.language === 'fr' ? input.candidate.question : input.candidate.question,
      en: input.candidate.language === 'en' ? input.candidate.question : input.candidate.question,
    },
    answerText: input.answerText,
    keywords: Array.from(new Set([...keywordSeed, input.candidate.question])),
    actionId: input.actionId,
    usageCount: 0,
    lastUpdated: new Date().toISOString().slice(0, 10),
    category: 'support',
    published: true,
  }
}

export function getActionForAnswer(answer: DemoAnswer | undefined, actions: DemoAction[]) {
  if (!answer?.actionId) {
    return undefined
  }

  return actions.find((action) => action.id === answer.actionId)
}

export function getTopLanguage(events: QuestionEvent[]): DemoLanguage {
  const counts = events.reduce(
    (acc, event) => {
      acc[event.language] += 1
      return acc
    },
    { ar: 0, fr: 0, en: 0 } satisfies Record<DemoLanguage, number>
  )

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as DemoLanguage
}

export function getCacheHitRate(events: QuestionEvent[]) {
  if (events.length === 0) {
    return 100
  }

  const hits = events.filter((event) => event.cacheHit).length
  return Math.round((hits / events.length) * 100)
}
