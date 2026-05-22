'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  demoActions,
  type DemoAction,
  type DemoAnswer,
  type DemoLanguage,
  fallbackResponse,
  initialDemoAnswers,
  initialUnknownQuestions,
  type LocalizedText,
  pilotProfile as initialPilotProfile,
  type PilotProfile,
  type QuestionEvent,
  type UnknownQuestion,
} from '@/lib/digital-receptionist/demo-data'
import {
  createBlankAnswer,
  createPilotSnapshot,
  normalizeAnswers,
  normalizePilotProfile,
  normalizeQuestionEvents,
  normalizeUnknownQuestions,
  parsePilotSnapshot,
  serializePilotSnapshot,
} from '@/lib/digital-receptionist/pilot-config'
import { getPilotScenario } from '@/lib/digital-receptionist/pilot-scenarios'
import {
  createQuestionEvent,
  createUnknownQuestion,
  getCacheHitRate,
  getTopLanguage,
  matchQuestion,
} from '@/lib/digital-receptionist/prototype-logic'
import {
  defaultVoiceSettings,
  normalizeVoiceSettings,
  type VoiceSettings,
} from '@/lib/digital-receptionist/voice-library'
import { routingHeaders } from '@/lib/digital-receptionist/lapi-routing-prefs'

type AskKnownResult = {
  type: 'known'
  answer: DemoAnswer
  action?: DemoAction
}

type AskUnknownResult = {
  type: 'unknown'
  fallbackResponse: LocalizedText
}

type AskInternetResult = {
  type: 'internet'
  text: string
  sources: string[]
  confidence: 'high' | 'medium'
}

export type AskResult = AskKnownResult | AskUnknownResult | AskInternetResult

export type CachedAudioEntry = {
  answerId: string
  language: DemoLanguage
  presetId: string
}

type StorePayload = {
  profile?: PilotProfile
  actions?: DemoAction[]
  answers?: DemoAnswer[]
  unknownQuestions?: UnknownQuestion[]
  events?: QuestionEvent[]
  auditLogs?: AuditLogItem[]
  devices?: KioskDeviceItem[]
  analytics?: PilotAnalytics
  voiceSettings?: VoiceSettings
  cachedAudio?: CachedAudioEntry[]
}

type StoreOptions = {
  admin?: boolean
}

export type AuditLogItem = {
  id: string
  actor: string
  action: string
  entityType: string
  entityId: string
  summary: string
  createdAt: string
}

export type KioskDeviceItem = {
  id: string
  label: string
  status: 'online' | 'stale' | 'offline'
  userAgent?: string
  heartbeatCount: number
  lastSeenAt?: string
  updatedAt: string
}

export type PilotAnalytics = {
  totalEvents: number
  cacheHitRate: number
  unknownCount: number
  activeUnknownCount: number
  languageSplit: Record<DemoLanguage, number>
  topQuestions: Array<{ question: string; count: number; cacheHit: boolean }>
  topAnswers: Array<{ answerId: string; question: LocalizedText; usageCount: number }>
  dailySummary: Array<{ date: string; total: number; cacheHits: number; unknowns: number }>
}

const emptyAnalytics: PilotAnalytics = {
  totalEvents: 0,
  cacheHitRate: 100,
  unknownCount: initialUnknownQuestions.length,
  activeUnknownCount: initialUnknownQuestions.filter((question) => question.status === 'new').length,
  languageSplit: { ar: 0, fr: 0, en: 0 },
  topQuestions: [],
  topAnswers: [],
  dailySummary: [],
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

function sameVoiceSettings(left: VoiceSettings, right: VoiceSettings) {
  return left.ar === right.ar && left.fr === right.fr && left.en === right.en
}

export function usePrototypeStore(options: StoreOptions = {}) {
  const [profile, setProfile] = useState<PilotProfile>(() => initialPilotProfile)
  const [actions, setActions] = useState<DemoAction[]>(demoActions)
  const [answers, setAnswers] = useState<DemoAnswer[]>(() => initialDemoAnswers)
  const [unknownQuestions, setUnknownQuestions] = useState<UnknownQuestion[]>(() => initialUnknownQuestions)
  const [events, setEvents] = useState<QuestionEvent[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])
  const [devices, setDevices] = useState<KioskDeviceItem[]>([])
  const [analytics, setAnalytics] = useState<PilotAnalytics>(emptyAnalytics)
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(defaultVoiceSettings)
  const [cachedAudio, setCachedAudio] = useState<CachedAudioEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'loading' | 'ready' | 'offline'>('loading')

  const applyPayload = useCallback((payload: StorePayload) => {
    if (payload.profile) {
      setProfile(normalizePilotProfile(payload.profile))
    }

    if (payload.actions) {
      setActions(payload.actions)
    }

    if (payload.answers) {
      setAnswers(normalizeAnswers(payload.answers))
    }

    if (payload.unknownQuestions) {
      setUnknownQuestions(normalizeUnknownQuestions(payload.unknownQuestions))
    }

    if (payload.events) {
      setEvents(normalizeQuestionEvents(payload.events))
    }

    if (payload.auditLogs) {
      setAuditLogs(payload.auditLogs)
    }

    if (payload.devices) {
      setDevices(payload.devices)
    }

    if (payload.analytics) {
      setAnalytics(payload.analytics)
    }

    if (payload.voiceSettings) {
      const normalizedVoiceSettings = normalizeVoiceSettings(payload.voiceSettings)
      setVoiceSettings((current) =>
        sameVoiceSettings(current, normalizedVoiceSettings) ? current : normalizedVoiceSettings
      )
    }

    if (payload.cachedAudio) {
      setCachedAudio(payload.cachedAudio)
    }

    setLoaded(true)
    setSyncStatus('ready')
  }, [])

  const refresh = useCallback(async () => {
    try {
      const payload = await fetchJson<StorePayload>(
        options.admin ? '/api/answers?admin=1' : '/api/pilot',
        { cache: 'no-store' }
      )
      applyPayload(payload)
    } catch {
      setLoaded(true)
      setSyncStatus('offline')
    }
  }, [applyPayload, options.admin])

  useEffect(() => {
    // Initial API hydration is the one place this client store syncs React state from the backend.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refresh()
    }, options.admin ? 5000 : 8000)

    return () => window.clearInterval(interval)
  }, [options.admin, refresh])

  useEffect(() => {
    if (options.admin) {
      return
    }

    const deviceKey = 'digital-receptionist.device-id.v1'
    let deviceId = window.localStorage.getItem(deviceKey)

    if (!deviceId) {
      deviceId = `kiosk-${Date.now()}-${Math.random().toString(16).slice(2)}`
      window.localStorage.setItem(deviceKey, deviceId)
    }

    const heartbeat = () =>
      fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          label: profile.locationName.en || 'Reception kiosk',
        }),
      }).catch(() => setSyncStatus('offline'))

    void heartbeat()
    const interval = window.setInterval(() => void heartbeat(), 15000)

    return () => window.clearInterval(interval)
  }, [options.admin, profile.locationName.en])

  const askQuestion = useCallback(
    async (
      question: string,
      language: DemoLanguage,
      // Optional callback fired when askQuestion transitions phases.
      // Lets the UI swap "Thinking…" → "Searching the internet…" so the
      // 20-25s web-search wait reads as progress, not a hang.
      onPhase?: (phase: 'searching-internet') => void,
      // Optional AbortSignal — when set, in-flight matcher/internet
      // fetches are cancelled if the signal aborts (e.g., user tapped
      // mic again). The fetch's AbortError is re-thrown so the caller
      // can distinguish "cancelled" from "no answer".
      signal?: AbortSignal,
    ): Promise<AskResult> => {
      const publishedAnswers = answers.filter((answer) => answer.published)
      const keywordResult = matchQuestion(question, publishedAnswers)

      // Helper to commit a known-answer hit (used for both keyword and LLM matches).
      const commitKnown = (answer: typeof publishedAnswers[number]): AskResult => {
        setAnswers((current) =>
          current.map((entry) =>
            entry.id === answer.id ? { ...entry, usageCount: entry.usageCount + 1 } : entry
          )
        )
        const event = createQuestionEvent({
          question,
          language,
          cacheHit: true,
          answerId: answer.id,
        })
        setEvents((current) => [event, ...current])

        void fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            language,
            cacheHit: true,
            answerId: answer.id,
          }),
        }).catch(() => setSyncStatus('offline'))

        return {
          type: 'known',
          answer,
          action: actions.find((action) => action.id === answer.actionId),
        }
      }

      if (keywordResult.hit) {
        return commitKnown(keywordResult.answer)
      }

      // Keyword matcher missed — try a server-side LLM semantic match before
      // falling through to "unknown question". The endpoint short-circuits to
      // null when DR_LLM_MATCH is not enabled, so this is a cheap no-op when
      // running purely local.
      try {
        const candidates = publishedAnswers.map((entry) => ({
          id: entry.id,
          canonical: entry.canonicalQuestion[language],
          answer: entry.answerText[language],
        }))
        const response = await fetch('/api/llm-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...routingHeaders() },
          body: JSON.stringify({ question, language, candidates }),
          signal,
        })
        if (response.ok) {
          const payload = (await response.json()) as {
            enabled?: boolean
            matchedAnswerId?: string | null
            confidence?: 'high' | 'medium' | 'low' | null
          }
          // Only trust high/medium confidence — low means "I'm guessing".
          if (
            payload.matchedAnswerId &&
            (payload.confidence === 'high' || payload.confidence === 'medium')
          ) {
            const match = publishedAnswers.find((entry) => entry.id === payload.matchedAnswerId)
            if (match) {
              return commitKnown(match)
            }
          }
        }
      } catch (err) {
        // Cancellation propagates — caller wants to start over, not see
        // an unknown card. All other network/LLM errors fall through.
        if (signal?.aborted) throw err
      }

      // Both matchers missed. Before falling back, optionally try the
      // internet route — gated per-tenant via profile.useInternetFallback
      // AND globally by the DR_LLM_INTERNET env flag on the server. The
      // server route returns enabled:false if either is off, so the
      // network call is cheap when the feature is unused.
      if (profile.useInternetFallback) {
        onPhase?.('searching-internet')
        try {
          const res = await fetch('/api/llm-internet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, language }),
            signal,
          })
          if (res.ok) {
            const payload = (await res.json()) as {
              enabled?: boolean
              answer?: {
                text: string
                confidence: 'high' | 'medium' | 'low'
                sources: string[]
              } | null
            }
            // enabled:true + answer:null means the call reached our route but
            // failed downstream — LAPI daemon unreachable, web tool errored,
            // or model returned non-JSON. Surface clearly so an operator
            // looking at the console sees why the kiosk fell back to canned
            // wording instead of "found on the internet".
            if (payload.enabled && payload.answer === null) {
              console.warn(
                '[kiosk] /api/llm-internet returned enabled:true but answer:null — ' +
                  'LAPI is likely unreachable, the web tool errored, or the model returned ' +
                  'non-JSON. Check the LAPI badge in /admin and the dev-server log.',
              )
            }
            if (
              payload.enabled &&
              payload.answer &&
              (payload.answer.confidence === 'high' || payload.answer.confidence === 'medium')
            ) {
              // Log the unknown question for operator review even though we
              // answered the visitor — useful for catalog growth.
              setUnknownQuestions((current) => createUnknownQuestion(question, language, current))
              const event = createQuestionEvent({ question, language, cacheHit: false })
              setEvents((current) => [event, ...current])
              void fetch('/api/unknown-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...routingHeaders() },
                body: JSON.stringify({ question, language }),
              }).catch(() => setSyncStatus('offline'))
              return {
                type: 'internet',
                text: payload.answer.text,
                sources: payload.answer.sources,
                confidence: payload.answer.confidence,
              }
            }
          }
        } catch (err) {
          // Re-throw cancellations so the kiosk doesn't render a stale
          // "unknown" card after the user starts a new question.
          if (signal?.aborted) throw err
          // Other errors: silently fall through to canned fallback.
        }
      }

      setUnknownQuestions((current) => createUnknownQuestion(question, language, current))
      const event = createQuestionEvent({
        question,
        language,
        cacheHit: false,
      })
      setEvents((current) => [event, ...current])

      void Promise.all([
        fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, language, cacheHit: false }),
        }),
          fetch('/api/unknown-questions', {
            method: 'POST',
          headers: { 'Content-Type': 'application/json', ...routingHeaders() },
          body: JSON.stringify({ question, language }),
        }),
      ]).catch(() => setSyncStatus('offline'))

      return {
        type: 'unknown',
        fallbackResponse,
      }
    },
    [actions, answers, profile.useInternetFallback]
  )

  const savePilotProfile = useCallback(
    async (nextProfile: PilotProfile) => {
      const normalized = normalizePilotProfile(nextProfile)
      setProfile(normalized)

      try {
        applyPayload(
          await fetchJson<StorePayload>('/api/pilot', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile: normalized }),
          })
        )
      } catch {
        setSyncStatus('offline')
      }
    },
    [applyPayload]
  )

  const applyPilotScenario = useCallback(
    async (scenarioId: string) => {
      const scenario = getPilotScenario(scenarioId)

      if (scenario) {
        setProfile(normalizePilotProfile(scenario.profile))
        setActions(scenario.actions)
        setAnswers(normalizeAnswers(scenario.answers))
        setUnknownQuestions(normalizeUnknownQuestions(scenario.unknownQuestions))
        setEvents([])
      }

      try {
        applyPayload(
          await fetchJson<StorePayload>('/api/scenarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenarioId }),
          })
        )
      } catch {
        setSyncStatus('offline')
      }
    },
    [applyPayload]
  )

  const saveAnswer = useCallback(
    async (nextAnswer: DemoAnswer) => {
      const normalized = normalizeAnswers([nextAnswer])[0]
      setAnswers((current) =>
        current.some((answer) => answer.id === normalized.id)
          ? current.map((answer) => (answer.id === normalized.id ? normalized : answer))
          : [normalized, ...current]
      )

      try {
        applyPayload(
          await fetchJson<StorePayload>('/api/answers', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answer: normalized }),
          })
        )
      } catch {
        setSyncStatus('offline')
      }
    },
    [applyPayload]
  )

  const createAnswer = useCallback(async () => {
    const answer = createBlankAnswer()
    setAnswers((current) => [answer, ...current])
    await saveAnswer(answer)
    return answer
  }, [saveAnswer])

  const duplicateAnswer = useCallback(
    async (answerId: string) => {
      const source = answers.find((answer) => answer.id === answerId)

      if (!source) {
        return undefined
      }

      const answer: DemoAnswer = {
        ...source,
        id: `answer-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        usageCount: 0,
        published: false,
        lastUpdated: new Date().toISOString().slice(0, 10),
      }

      setAnswers((current) => [answer, ...current])
      await saveAnswer(answer)
      return answer
    },
    [answers, saveAnswer]
  )

  const deleteAnswer = useCallback(
    async (answerId: string) => {
      setAnswers((current) => current.filter((answer) => answer.id !== answerId))

      try {
        applyPayload(
          await fetchJson<StorePayload>(`/api/answers?id=${encodeURIComponent(answerId)}`, {
            method: 'DELETE',
          })
        )
      } catch {
        setSyncStatus('offline')
      }
    },
    [applyPayload]
  )

  const toggleAnswerPublished = useCallback(
    async (answerId: string) => {
      const answer = answers.find((item) => item.id === answerId)

      if (!answer) {
        return
      }

      await saveAnswer({
        ...answer,
        published: !answer.published,
        lastUpdated: new Date().toISOString().slice(0, 10),
      })
    },
    [answers, saveAnswer]
  )

  const approveUnknown = useCallback(
    async (candidateId: string, answerText: LocalizedText, actionId?: string) => {
      setUnknownQuestions((current) =>
        current.map((item) =>
          item.id === candidateId ? { ...item, status: 'approved' as const } : item
        )
      )

      try {
        applyPayload(
          await fetchJson<StorePayload>('/api/unknown-questions', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidateId, answerText, actionId }),
          })
        )
      } catch {
        setSyncStatus('offline')
      }
    },
    [applyPayload]
  )

  const markUnknown = useCallback(
    async (candidateId: string, status: 'rejected' | 'out_of_scope') => {
      setUnknownQuestions((current) =>
        current.map((item) => (item.id === candidateId ? { ...item, status } : item))
      )

      try {
        applyPayload(
          await fetchJson<StorePayload>('/api/unknown-questions', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidateId, status }),
          })
        )
      } catch {
        setSyncStatus('offline')
      }
    },
    [applyPayload]
  )

  const resetPrototype = useCallback(async () => {
    setProfile(initialPilotProfile)
    setActions(demoActions)
    setAnswers(initialDemoAnswers)
    setUnknownQuestions(initialUnknownQuestions)
    setEvents([])
    setVoiceSettings(defaultVoiceSettings)
    setSyncStatus('ready')

    try {
      applyPayload(
        await fetchJson<StorePayload>('/api/import-export', {
          method: 'DELETE',
        })
      )
    } catch {
      setSyncStatus('offline')
    }
  }, [applyPayload])

  const exportPilotJson = useCallback(() => {
    return serializePilotSnapshot(
      createPilotSnapshot({
        profile,
        answers,
        unknownQuestions,
        events,
      })
    )
  }, [answers, events, profile, unknownQuestions])

  const importPilotJson = useCallback(
    async (raw: string) => {
      const snapshot = parsePilotSnapshot(raw)
      applyPayload(snapshot)

      try {
        applyPayload(
          await fetchJson<StorePayload>('/api/import-export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: serializePilotSnapshot(snapshot),
          })
        )
      } catch {
        setSyncStatus('offline')
      }
    },
    [applyPayload]
  )

  const saveVoiceSettings = useCallback(
    async (nextSettings: VoiceSettings) => {
      const normalized = normalizeVoiceSettings(nextSettings)
      setVoiceSettings(normalized)

      try {
        applyPayload(
          await fetchJson<StorePayload>('/api/voice-settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voiceSettings: normalized }),
          })
        )
      } catch {
        setSyncStatus('offline')
      }
    },
    [applyPayload]
  )

  const metrics = useMemo(() => {
    const activeUnknown = unknownQuestions.filter((question) => question.status === 'new')

    return {
      totalQuestions: events.length + answers.reduce((sum, answer) => sum + answer.usageCount, 0),
      sessionQuestions: events.length,
      cacheHitRate: getCacheHitRate(events),
      unknownCount: activeUnknown.length,
      topLanguage: events.length > 0 ? getTopLanguage(events) : 'fr',
      escalations: events.filter((event) => !event.cacheHit).length,
    }
  }, [answers, events, unknownQuestions])

  return {
    actions,
    analytics,
    auditLogs,
    answers,
    applyPilotScenario,
    askQuestion,
    approveUnknown,
    cachedAudio,
    createAnswer,
    deleteAnswer,
    devices,
    duplicateAnswer,
    exportPilotJson,
    importPilotJson,
    loaded,
    markUnknown,
    metrics,
    profile,
    refresh,
    resetPrototype,
    saveAnswer,
    savePilotProfile,
    saveVoiceSettings,
    syncStatus,
    toggleAnswerPublished,
    unknownQuestions,
    voiceSettings,
  }
}
