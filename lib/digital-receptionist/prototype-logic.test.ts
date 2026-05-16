import { initialDemoAnswers, pilotProfile } from './demo-data'
import {
  createPilotSnapshot,
  normalizeAnswers,
  parsePilotSnapshot,
  serializePilotSnapshot,
} from './pilot-config'
import {
  createUnknownQuestion,
  getCacheHitRate,
  matchQuestion,
  normalizeQuestion,
  promoteCandidateToAnswer,
} from './prototype-logic'
import {
  chooseVoiceForLanguage,
  scoreVoiceForLanguage,
  speechLangForLanguage,
} from './voice-lite'

describe('digital receptionist prototype logic', () => {
  it('matches approved answers by English keywords', () => {
    const result = matchQuestion('What papers do I need?', initialDemoAnswers)

    expect(result.hit).toBe(true)
    if (result.hit) {
      expect(result.answer.id).toBe('required-documents')
    }
  })

  it('matches approved answers by French keywords', () => {
    const result = matchQuestion('Quels sont les horaires ?', initialDemoAnswers)

    expect(result.hit).toBe(true)
    if (result.hit) {
      expect(result.answer.id).toBe('opening-hours')
    }
  })

  it('matches approved answers by Arabic keywords', () => {
    const result = matchQuestion('أين مكتب الاستقبال؟', initialDemoAnswers)

    expect(result.hit).toBe(true)
    if (result.hit) {
      expect(result.answer.id).toBe('information-desk')
    }
  })

  it('creates repeated unknown questions as one candidate with a higher count', () => {
    const first = createUnknownQuestion('Can I submit this online?', 'en', [])
    const second = createUnknownQuestion('Can I submit this online?', 'en', first)

    expect(second).toHaveLength(1)
    expect(second[0].count).toBe(2)
  })

  it('matches a question again after admin approval promotes it to an answer', () => {
    const [candidate] = createUnknownQuestion('Do I need an appointment for pickup?', 'en', [])
    const approvedAnswer = promoteCandidateToAnswer({
      candidate,
      answerText: {
        ar: 'يرجى أخذ تذكرة من مكتب الاستقبال قبل التوجه إلى الشباك.',
        fr: 'Veuillez prendre un ticket à l’accueil avant de vous diriger vers le guichet.',
        en: 'Please take a ticket at reception before going to the counter.',
      },
      actionId: 'staff-help',
      existingAnswers: initialDemoAnswers,
    })

    const result = matchQuestion('Do I need an appointment for pickup?', [
      approvedAnswer,
      ...initialDemoAnswers,
    ])

    expect(result.hit).toBe(true)
    if (result.hit) {
      expect(result.answer.id).toBe(approvedAnswer.id)
    }
  })

  it('normalizes punctuation and casing', () => {
    expect(normalizeQuestion('  HELLO???  ')).toBe('hello')
  })

  it('calculates cache hit rate', () => {
    expect(
      getCacheHitRate([
        {
          id: '1',
          question: 'a',
          language: 'en',
          cacheHit: true,
          createdAt: '2026-05-16T00:00:00.000Z',
        },
        {
          id: '2',
          question: 'b',
          language: 'fr',
          cacheHit: false,
          createdAt: '2026-05-16T00:01:00.000Z',
        },
      ])
    ).toBe(50)
  })

  it('normalizes imported answers with publish state', () => {
    const [answer] = normalizeAnswers([
      {
        ...initialDemoAnswers[0],
        id: 'draft-answer',
        published: false,
      },
    ])

    expect(answer.id).toBe('draft-answer')
    expect(answer.published).toBe(false)
  })

  it('round-trips a configured pilot snapshot as JSON', () => {
    const snapshot = createPilotSnapshot({
      profile: {
        ...pilotProfile,
        tenantName: {
          ...pilotProfile.tenantName,
          en: 'Pilot Customer',
        },
      },
      answers: initialDemoAnswers.slice(0, 2),
      unknownQuestions: [],
      events: [],
    })
    const parsed = parsePilotSnapshot(serializePilotSnapshot(snapshot))

    expect(parsed.profile.tenantName.en).toBe('Pilot Customer')
    expect(parsed.answers).toHaveLength(2)
    expect(parsed.unknownQuestions).toHaveLength(0)
  })

  it('chooses the closest browser voice for the active language', () => {
    const voices = [
      { name: 'English US', lang: 'en-US' },
      { name: 'French France', lang: 'fr-FR' },
      { name: 'Arabic Saudi', lang: 'ar-SA', localService: true },
    ]

    expect(chooseVoiceForLanguage(voices, 'fr')?.name).toBe('French France')
    expect(chooseVoiceForLanguage(voices, 'ar')?.name).toBe('Arabic Saudi')
    expect(speechLangForLanguage('ar')).toBe('ar-DZ')
  })

  it('prefers Algerian French browser voices when available', () => {
    const voices = [
      { name: 'French France', lang: 'fr-FR', localService: true },
      { name: 'French Algeria', lang: 'fr-DZ' },
    ]

    expect(chooseVoiceForLanguage(voices, 'fr')?.name).toBe('French Algeria')
    expect(scoreVoiceForLanguage(voices[0], 'fr')).toBeLessThan(scoreVoiceForLanguage(voices[1], 'fr'))
  })

  it('falls back to the default browser voice only when there is no language match', () => {
    const voices = [
      { name: 'Italian', lang: 'it-IT' },
      { name: 'System default', lang: 'it-IT', default: true },
    ]

    expect(chooseVoiceForLanguage(voices, 'en')?.name).toBe('System default')
  })
})
