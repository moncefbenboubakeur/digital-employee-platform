'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  Building2,
  CircleHelp,
  ClipboardList,
  Languages,
  MapPin,
  MessageSquareText,
  QrCode,
  RotateCcw,
  Send,
  ShieldCheck,
  Square,
  UserRoundCheck,
  Volume2,
  VolumeX,
} from 'lucide-react'
import {
  demoLanguages,
  type DemoAction,
  type DemoAnswer,
  type DemoLanguage,
  type PilotProfile,
  uiText,
} from '@/lib/digital-receptionist/demo-data'
import { chooseVoiceForLanguage, speechLangForLanguage } from '@/lib/digital-receptionist/voice-lite'
import { usePrototypeStore, type AskResult } from './use-prototype-store'
import { LiteAvatar, type LiteAvatarState } from './lite-avatar'

type DisplayAnswer = {
  mode: 'known' | 'unknown' | 'escalation'
  answerId?: string
  fallbackResponse?: Record<DemoLanguage, string>
  question?: string
  action?: DemoAction
}

type LocalizedDisplayAnswer = DisplayAnswer & {
  text: string
  badge: string
}

const quickQuestionIds = [
  'who-are-you',
  'services',
  'document-renewal-counter',
  'required-documents',
  'opening-hours',
  'qr-code',
  'languages',
  'which-counter',
]

const quickIcons = [CircleHelp, Building2, MapPin, ClipboardList, ShieldCheck, QrCode, Languages, MessageSquareText]

function getDirection(language: DemoLanguage) {
  return language === 'ar' ? 'rtl' : 'ltr'
}

function answerFromResult(result: AskResult, language: DemoLanguage, question: string): DisplayAnswer {
  if (result.type === 'known') {
    return {
      mode: 'known',
      answerId: result.answer.id,
      question,
      action: result.action,
    }
  }

  return {
    mode: 'unknown',
    fallbackResponse: result.fallbackResponse,
    question,
  }
}

function LanguageSwitcher({
  language,
  setLanguage,
}: {
  language: DemoLanguage
  setLanguage: (language: DemoLanguage) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {demoLanguages.map((item) => (
        <button
          key={item.id}
          className={`min-h-11 rounded-lg border px-4 text-sm font-semibold transition ${
            item.id === language
              ? 'border-cyan-700 bg-cyan-700 text-white shadow-sm'
              : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300'
          }`}
          type="button"
          onClick={() => setLanguage(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function AnswerPanel({
  answer,
  language,
  isThinking,
  voiceEnabled,
  voiceStatus,
  onReplay,
  onStop,
  onToggleVoice,
}: {
  answer: LocalizedDisplayAnswer
  language: DemoLanguage
  isThinking: boolean
  voiceEnabled: boolean
  voiceStatus: 'preparing' | 'ready' | 'speaking' | 'unavailable'
  onReplay: () => void
  onStop: () => void
  onToggleVoice: () => void
}) {
  const text = uiText[language]

  return (
    <section
      className="flex min-h-[360px] flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      dir={getDirection(language)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {text.answer}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            {isThinking ? text.asking : answer.badge}
          </h2>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
            answer.mode === 'known'
              ? 'bg-emerald-100 text-emerald-800'
              : answer.mode === 'unknown'
                ? 'bg-amber-100 text-amber-900'
                : 'bg-orange-100 text-orange-900'
          }`}
        >
          {answer.mode === 'known' ? text.cacheHit : answer.mode === 'unknown' ? text.fallbackBadge : text.escalation}
        </span>
      </div>

      <div className="mt-6 flex flex-1 items-center rounded-lg bg-slate-50 p-5">
        <p className="text-2xl font-medium leading-relaxed text-slate-950 md:text-3xl">
          {isThinking ? `${text.asking}...` : answer.text}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          {voiceEnabled ? <Volume2 className="size-4 text-cyan-700" /> : <VolumeX className="size-4 text-slate-500" />}
          <span>
            {voiceStatus === 'unavailable'
              ? text.voiceUnavailable
              : voiceStatus === 'preparing'
                ? text.voicePreparing
              : voiceStatus === 'speaking'
                ? text.voiceSpeaking
                : voiceEnabled
                  ? text.voiceOn
                  : text.voiceOff}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={voiceStatus === 'unavailable'}
            type="button"
            onClick={onToggleVoice}
          >
            {voiceEnabled ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            {voiceEnabled ? text.turnVoiceOff : text.turnVoiceOn}
          </button>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={voiceStatus === 'unavailable' || voiceStatus === 'preparing' || isThinking || !voiceEnabled}
            type="button"
            onClick={onReplay}
          >
            <RotateCcw className="size-4" />
            {text.replayVoice}
          </button>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={voiceStatus !== 'speaking' && voiceStatus !== 'preparing'}
            type="button"
            onClick={onStop}
          >
            <Square className="size-4" />
            {text.stopVoice}
          </button>
        </div>
      </div>
    </section>
  )
}

function QuickQuestionGrid({
  answers,
  language,
  onAsk,
}: {
  answers: DemoAnswer[]
  language: DemoLanguage
  onAsk: (question: string) => void
}) {
  const quickAnswers = quickQuestionIds
    .map((id) => answers.find((answer) => answer.id === id))
    .filter((answer) => answer?.published)
    .filter((answer): answer is DemoAnswer => Boolean(answer))

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-950">{uiText[language].quickQuestions}</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
          {quickAnswers.length}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickAnswers.map((answer, index) => {
          const Icon = quickIcons[index] ?? CircleHelp

          return (
            <button
              key={answer.id}
              className="min-h-24 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-base font-semibold text-slate-900 transition hover:border-cyan-300 hover:bg-cyan-50 focus:outline-none focus:ring-4 focus:ring-cyan-100"
              dir={getDirection(language)}
              type="button"
              onClick={() => onAsk(answer.canonicalQuestion[language])}
            >
              <Icon className="mb-3 size-5 text-cyan-700" />
              {answer.canonicalQuestion[language]}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function ActionPanel({ action, language }: { action?: DemoAction; language: DemoLanguage }) {
  const direction = getDirection(language)

  if (!action) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-slate-600">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-5 text-emerald-700" />
          <p className="text-base font-medium">{uiText[language].greeting}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" dir={direction}>
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_160px] md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {action.type}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">{action.label[language]}</h2>
          <p className="mt-2 text-base leading-relaxed text-slate-700">{action.description[language]}</p>
        </div>
        {action.type === 'qr' ? (
          <div className="grid aspect-square grid-cols-7 gap-1 rounded-lg border border-slate-200 bg-white p-3 shadow-inner">
            {Array.from({ length: 49 }).map((_, index) => (
              <span
                key={index}
                className={`rounded-[2px] ${
                  index % 2 === 0 || index % 5 === 0 || [0, 1, 5, 6, 42, 43, 47, 48].includes(index)
                    ? 'bg-slate-950'
                    : 'bg-slate-100'
                }`}
              />
            ))}
          </div>
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-lg bg-cyan-50 text-cyan-800">
            {action.type === 'direction' ? <MapPin className="size-16" /> : <UserRoundCheck className="size-16" />}
          </div>
        )}
      </div>
    </section>
  )
}

function PilotContextPanel({
  language,
  profile,
  syncStatus,
}: {
  language: DemoLanguage
  profile: PilotProfile
  syncStatus: 'loading' | 'ready' | 'offline'
}) {
  const text = uiText[language]

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" dir={getDirection(language)}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {text.pilot}
          </p>
          <h1 className="mt-1 text-3xl font-semibold leading-tight text-slate-950">
            {profile.tenantName[language]}
          </h1>
          <p className="mt-1 text-lg font-medium text-cyan-800">
            {profile.locationName[language]}
          </p>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-700">
            {profile.welcomeTitle[language]}. {profile.serviceSummary[language]}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
              {profile.currentWait[language]}
            </span>
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-sm font-semibold text-cyan-800">
              {profile.liveStatus[language]}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                syncStatus === 'ready'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {syncStatus === 'ready' ? 'Backend synced' : 'Local fallback'}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              {profile.openingHours[language]}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              {profile.contactNumber}
            </span>
          </div>
        </div>

        <div className="grid gap-2">
          {profile.counters.map((counter) => (
            <div
              key={counter.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <span className="font-semibold text-slate-950">{counter.label[language]}</span>
              <span className="text-sm font-medium text-slate-600">{counter.status[language]}</span>
            </div>
          ))}
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
            <span className="font-semibold">{text.privacy}: </span>
            {profile.privacyNote[language]}
          </div>
        </div>
      </div>
    </section>
  )
}

export function KioskPrototype() {
  const { actions, answers, askQuestion, profile, syncStatus, voiceSettings } = usePrototypeStore({ admin: false })
  const [language, setLanguage] = useState<DemoLanguage>(profile.defaultLanguage)
  const [question, setQuestion] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isVoicePreparing, setIsVoicePreparing] = useState(false)
  const [isSpeechSupported, setIsSpeechSupported] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [avatarState, setAvatarState] = useState<LiteAvatarState>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioObjectUrlRef = useRef<string | null>(null)
  const audioAbortRef = useRef<AbortController | null>(null)
  const shouldSpeakNextRef = useRef(false)
  const voiceEnabledRef = useRef(true)
  const staffAction = actions.find((action) => action.id === 'staff-help')
  const selectedVoicePresetId = voiceSettings[language]
  const [displayAnswer, setDisplayAnswer] = useState<DisplayAnswer>(() => ({
    mode: 'known',
  }))

  const localizedAnswer: LocalizedDisplayAnswer = useMemo(() => {
    if (displayAnswer.mode === 'known' && displayAnswer.answerId) {
      const answer = answers.find((item) => item.id === displayAnswer.answerId)

      if (answer) {
        return {
          ...displayAnswer,
          text: answer.answerText[language],
          badge: uiText[language].cacheHit,
          action: actions.find((action) => action.id === answer.actionId),
        }
      }
    }

    if (displayAnswer.mode === 'unknown' && displayAnswer.fallbackResponse) {
      return {
        ...displayAnswer,
        text: displayAnswer.fallbackResponse[language],
        badge: uiText[language].savedForReview,
      }
    }

    if (displayAnswer.mode === 'escalation') {
      return {
        ...displayAnswer,
        text: staffAction?.description[language] ?? uiText[language].escalation,
        badge: uiText[language].escalation,
        action: staffAction,
      }
    }

    return {
      mode: 'known',
      text: uiText[language].greeting,
      badge: uiText[language].cacheHit,
    }
  }, [actions, answers, displayAnswer, language, staffAction])

  useEffect(() => {
    let registeredVoiceListener = false
    const loadVoices = () => {
      if (!('speechSynthesis' in window)) {
        return
      }

      setVoices(window.speechSynthesis.getVoices())
    }

    const initializationId = window.setTimeout(() => {
      const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

      setIsSpeechSupported(supported)

      const storedVoicePreference = window.localStorage.getItem('digital-receptionist.voice-enabled.v1')
      if (storedVoicePreference) {
        const storedVoiceEnabled = storedVoicePreference === '1'
        voiceEnabledRef.current = storedVoiceEnabled
        setVoiceEnabled(storedVoiceEnabled)
      }

      if (supported) {
        loadVoices()
        window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
        registeredVoiceListener = true
      }
    }, 0)

    return () => {
      window.clearTimeout(initializationId)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      audioAbortRef.current?.abort()
      audioRef.current?.pause()
      window.speechSynthesis?.cancel()
      if (registeredVoiceListener) {
        window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices)
      }
    }
  }, [])

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled
    window.localStorage.setItem('digital-receptionist.voice-enabled.v1', voiceEnabled ? '1' : '0')
  }, [voiceEnabled])

  const stopSpeaking = useCallback(() => {
    audioAbortRef.current?.abort()
    audioAbortRef.current = null
    audioRef.current?.pause()
    audioRef.current = null
    if (audioObjectUrlRef.current) {
      URL.revokeObjectURL(audioObjectUrlRef.current)
      audioObjectUrlRef.current = null
    }
    window.speechSynthesis?.cancel()
    setIsVoicePreparing(false)
    setIsSpeaking(false)
    setAvatarState((current) => (current === 'speaking' ? 'idle' : current))
  }, [])

  const speakBrowserText = useCallback((text: string) => {
    if (!isSpeechSupported || !voiceEnabledRef.current || !text.trim()) {
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    const voice = chooseVoiceForLanguage(voices, language)

    utterance.lang = voice?.lang ?? speechLangForLanguage(language)
    utterance.voice = voice ?? null
    utterance.rate = language === 'ar' ? 0.88 : 0.95
    utterance.pitch = 1
    utterance.volume = 1
    utterance.onstart = () => {
      setIsSpeaking(true)
      setAvatarState('speaking')
    }
    utterance.onend = () => {
      setIsSpeaking(false)
      setAvatarState('idle')
    }
    utterance.onerror = () => {
      setIsSpeaking(false)
      setAvatarState('idle')
    }

    window.speechSynthesis.speak(utterance)
  }, [isSpeechSupported, language, voices])

  const playCachedAnswerAudio = useCallback(
    async (answerId: string, text: string) => {
      if (!voiceEnabledRef.current || !text.trim()) {
        return
      }

      stopSpeaking()
      setIsVoicePreparing(true)

      let objectUrl: string | null = null
      const controller = new AbortController()
      let timedOut = false
      const timeoutId = window.setTimeout(() => {
        timedOut = true
        controller.abort()
      }, 20000)
      audioAbortRef.current = controller

      try {
        const params = new URLSearchParams({
          answerId,
          language,
          v: '2',
        })

        if (selectedVoicePresetId) {
          params.set('presetId', selectedVoicePresetId)
        }

        const response = await fetch(`/api/answer-audio?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        })

        if (!response.ok || !voiceEnabledRef.current) {
          throw new Error('Cached answer audio is not available.')
        }

        const nextObjectUrl = URL.createObjectURL(await response.blob())
        objectUrl = nextObjectUrl
        audioObjectUrlRef.current = nextObjectUrl
        const audio = new Audio(nextObjectUrl)
        audioRef.current = audio

        audio.onplay = () => {
          setIsVoicePreparing(false)
          setIsSpeaking(true)
          setAvatarState('speaking')
        }
        audio.onended = () => {
          if (audioRef.current === audio) {
            audioRef.current = null
          }
          if (audioObjectUrlRef.current === nextObjectUrl) {
            URL.revokeObjectURL(nextObjectUrl)
            audioObjectUrlRef.current = null
          }
          setIsVoicePreparing(false)
          setIsSpeaking(false)
          setAvatarState('idle')
        }
        audio.onerror = () => {
          if (audioRef.current === audio) {
            audioRef.current = null
          }
          if (audioObjectUrlRef.current === nextObjectUrl) {
            URL.revokeObjectURL(nextObjectUrl)
            audioObjectUrlRef.current = null
          }
          setIsVoicePreparing(false)
          setIsSpeaking(false)
          speakBrowserText(text)
        }

        await audio.play()
      } catch {
        if (objectUrl && audioObjectUrlRef.current === objectUrl) {
          URL.revokeObjectURL(objectUrl)
          audioObjectUrlRef.current = null
        }
        setIsVoicePreparing(false)
        setIsSpeaking(false)
        if (!controller.signal.aborted || timedOut) {
          speakBrowserText(text)
        }
      } finally {
        window.clearTimeout(timeoutId)
        if (audioAbortRef.current === controller) {
          audioAbortRef.current = null
        }
      }
    },
    [language, selectedVoicePresetId, speakBrowserText, stopSpeaking]
  )

  const speakAnswer = useCallback(
    (answer: LocalizedDisplayAnswer) => {
      if (!voiceEnabledRef.current || !answer.text.trim()) {
        return
      }

      if (answer.mode === 'known' && answer.answerId) {
        void playCachedAnswerAudio(answer.answerId, answer.text)
        return
      }

      stopSpeaking()
      speakBrowserText(answer.text)
    },
    [playCachedAnswerAudio, speakBrowserText, stopSpeaking]
  )

  const toggleVoice = useCallback(() => {
    const nextVoiceEnabled = !voiceEnabledRef.current

    voiceEnabledRef.current = nextVoiceEnabled
    if (!nextVoiceEnabled) {
      stopSpeaking()
    }
    setVoiceEnabled(nextVoiceEnabled)
  }, [stopSpeaking])

  useEffect(() => {
    if (!shouldSpeakNextRef.current || isThinking) {
      return
    }

    shouldSpeakNextRef.current = false
    speakAnswer(localizedAnswer)
  }, [isThinking, localizedAnswer, speakAnswer])

  const submitQuestion = (value: string) => {
    const trimmed = value.trim()

    if (!trimmed || isThinking) {
      return
    }

    setIsThinking(true)
    setAvatarState('thinking')

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      void (async () => {
        const result = await askQuestion(trimmed, language)
        const nextAnswer = answerFromResult(result, language, trimmed)

        setDisplayAnswer(nextAnswer)
        shouldSpeakNextRef.current = true
        setAvatarState(result.type === 'known' ? 'idle' : 'fallback')
        setIsThinking(false)
        setQuestion('')
      })()
    }, 520)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submitQuestion(question)
  }

  const handleEscalation = () => {
    setAvatarState('fallback')
    setDisplayAnswer({
      mode: 'escalation',
      action: staffAction,
    })
    shouldSpeakNextRef.current = true
  }

  const direction = useMemo(() => getDirection(language), [language])

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-4 text-slate-950 md:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
          <LanguageSwitcher language={language} setLanguage={setLanguage} />
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:border-cyan-300"
              href="/admin"
            >
              <ShieldCheck className="size-4" />
              {uiText[language].admin}
            </Link>
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700"
              type="button"
              onClick={handleEscalation}
            >
              <UserRoundCheck className="size-4" />
              {uiText[language].help}
            </button>
          </div>
        </header>

        <PilotContextPanel language={language} profile={profile} syncStatus={syncStatus} />

        <div className="grid gap-5 xl:grid-cols-[400px_minmax(0,1fr)]">
          <LiteAvatar state={avatarState} />
          <AnswerPanel
            answer={localizedAnswer}
            isThinking={isThinking}
            language={language}
            voiceEnabled={voiceEnabled}
            voiceStatus={isVoicePreparing ? 'preparing' : isSpeaking ? 'speaking' : 'ready'}
            onReplay={() => speakAnswer(localizedAnswer)}
            onStop={stopSpeaking}
            onToggleVoice={toggleVoice}
          />
        </div>

        <QuickQuestionGrid answers={answers} language={language} onAsk={submitQuestion} />

        <section className="sticky bottom-4 z-10 rounded-lg border border-slate-200 bg-white p-4 shadow-lg md:p-5">
          <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px]" onSubmit={handleSubmit}>
            <input
              className="min-h-16 rounded-lg border border-slate-300 bg-white px-4 text-xl text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              dir={direction}
              placeholder={uiText[language].placeholder}
              type="text"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <button
              className="inline-flex min-h-16 items-center justify-center gap-2 rounded-lg bg-cyan-700 px-5 text-lg font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isThinking}
              type="submit"
            >
              <Send className="size-5" />
              {isThinking ? uiText[language].asking : uiText[language].ask}
            </button>
          </form>
        </section>

        <ActionPanel action={localizedAnswer.action} language={language} />

        <footer className="flex justify-end">
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-cyan-800"
            href="/"
          >
            Demo switcher
            <ArrowRight className="size-4" />
          </Link>
        </footer>
      </div>
    </main>
  )
}
