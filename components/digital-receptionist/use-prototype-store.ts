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

type AskKnownResult = {
  type: 'known'
  answer: DemoAnswer
  action?: DemoAction
}

type AskUnknownResult = {
  type: 'unknown'
  fallbackResponse: LocalizedText
}

export type AskResult = AskKnownResult | AskUnknownResult

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
    async (question: string, language: DemoLanguage): Promise<AskResult> => {
      const publishedAnswers = answers.filter((answer) => answer.published)
      const result = matchQuestion(question, publishedAnswers)

      if (result.hit) {
        setAnswers((current) =>
          current.map((answer) =>
            answer.id === result.answer.id
              ? { ...answer, usageCount: answer.usageCount + 1 }
              : answer
          )
        )
        const event = createQuestionEvent({
          question,
          language,
          cacheHit: true,
          answerId: result.answer.id,
        })
        setEvents((current) => [event, ...current])

        void fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            language,
            cacheHit: true,
            answerId: result.answer.id,
          }),
        }).catch(() => setSyncStatus('offline'))

        return {
          type: 'known',
          answer: result.answer,
          action: actions.find((action) => action.id === result.answer.actionId),
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, language }),
        }),
      ]).catch(() => setSyncStatus('offline'))

      return {
        type: 'unknown',
        fallbackResponse,
      }
    },
    [actions, answers]
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
      totalQuestions: events.length + initialDemoAnswers.reduce((sum, answer) => sum + answer.usageCount, 0),
      sessionQuestions: events.length,
      cacheHitRate: getCacheHitRate(events),
      unknownCount: activeUnknown.length,
      topLanguage: events.length > 0 ? getTopLanguage(events) : 'fr',
      escalations: events.filter((event) => !event.cacheHit).length,
    }
  }, [events, unknownQuestions])

  return {
    actions,
    analytics,
    auditLogs,
    answers,
    askQuestion,
    approveUnknown,
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
