'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  Building2,
  CircleHelp,
  ClipboardList,
  FileText,
  MapPin,
  MessageSquareText,
  Mic,
  QrCode,
  RotateCcw,
  Send,
  ShieldCheck,
  Square,
  Users,
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
  mode: 'known' | 'unknown' | 'escalation' | 'internet'
  answerId?: string
  fallbackResponse?: Record<DemoLanguage, string>
  question?: string
  action?: DemoAction
  internetText?: string
  internetSources?: string[]
}

type LocalizedDisplayAnswer = DisplayAnswer & {
  text: string
  badge: string
}

// xtts generation can stretch past 10 minutes under contention with a running warm
// job; match the server-side ceiling so live fetches don't bail to browser TTS early.
const answerAudioTimeoutMs = 600000

// Mirrored from lib/digital-receptionist/server/voice-audio.ts. Used as the
// answer id when requesting cached audio for the "I don't have an approved
// answer yet…" fallback line so visitors hear the selected xtts voice
// instead of the browser default for unknown questions.
const FALLBACK_ANSWER_ID = '__fallback__'

// Opt-in client-side audit log for the kiosk audio pipeline. Enable via:
//   localStorage.setItem('dr-kiosk-debug', '1') ; location.reload()
function kioskDebugEnabled() {
  if (typeof window === 'undefined') {
    return false
  }
  try {
    return window.localStorage.getItem('dr-kiosk-debug') === '1'
  } catch {
    return false
  }
}

function kioskDebug(message: string, data?: Record<string, unknown>) {
  if (!kioskDebugEnabled()) {
    return
  }
  console.log(`[KIOSK] ${message}`, data ?? {})
}

function kioskDebugWarn(message: string, data?: Record<string, unknown>) {
  if (!kioskDebugEnabled()) {
    return
  }
  console.warn(`[KIOSK] ${message}`, data ?? {})
}

const QUICK_GRID_SIZE = 8

// Icons fill the quick-grid slots in order. They're position-dependent, not
// answer-dependent, so the same icon set works for every scenario.
const quickIcons = [Building2, MapPin, ClipboardList, FileText, Users, ShieldCheck, QrCode, MessageSquareText]

const IDLE_RESET_MS = 90_000

// Minimal Web Speech API shape — TS lib.dom doesn't ship SpeechRecognition
// because it's not in the standardised typings yet (it lives as the prefixed
// webkitSpeechRecognition in Chrome/Safari).
type SpeechRecognitionAlt = { transcript: string; confidence: number }
type SpeechRecognitionResultLike = {
  isFinal: boolean
  0: SpeechRecognitionAlt
  length: number
}
type SpeechRecognitionEventLike = {
  resultIndex: number
  results: { length: number } & Record<number, SpeechRecognitionResultLike>
}
type SpeechRecognitionInstance = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives?: number
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

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
  if (result.type === 'internet') {
    return {
      mode: 'internet',
      question,
      internetText: result.text,
      internetSources: result.sources,
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
          className={`min-h-12 rounded-lg border px-5 text-base font-semibold transition ${
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

function WelcomeScreen({
  profile,
  onStart,
}: {
  profile: PilotProfile
  onStart: (language: DemoLanguage) => void
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-cyan-700 via-cyan-800 to-slate-900 px-6 py-10 text-white">
      <div className="flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-10 text-center">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
            {profile.tenantName.fr}
          </p>
          <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
            {profile.locationName.fr}
          </h1>
          <p className="mt-2 text-lg text-cyan-100 md:text-2xl" dir="rtl">
            {profile.locationName.ar}
          </p>
        </div>

        <div className="grid w-full gap-4 md:grid-cols-3">
          {demoLanguages.map((item) => (
            <button
              key={item.id}
              className="group flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-white/20 bg-white/10 px-6 py-8 text-2xl font-semibold backdrop-blur transition hover:scale-[1.02] hover:border-white hover:bg-white hover:text-cyan-900 focus:outline-none focus:ring-4 focus:ring-cyan-300 md:text-3xl"
              type="button"
              onClick={() => onStart(item.id)}
            >
              <span dir={item.id === 'ar' ? 'rtl' : 'ltr'} className="text-4xl md:text-5xl">
                {item.label}
              </span>
              <span className="text-base font-medium text-cyan-100 group-hover:text-cyan-700 md:text-lg">
                {uiText[item.id].touchToStart}
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-1 text-base text-cyan-100 md:text-lg">
          <p>{uiText.fr.chooseLanguage}</p>
          <p dir="rtl">{uiText.ar.chooseLanguage}</p>
          <p>{uiText.en.chooseLanguage}</p>
        </div>
      </div>

      <footer className="mt-10 text-xs text-cyan-200/70">
        {profile.contactNumber} · {profile.openingHours.fr}
      </footer>
    </main>
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
  // Pick the most-asked published answers per scenario so the quick grid
  // adapts when a different pilot (APC, Algérie Poste, Mall, …) is applied.
  // Sort is stable on the answers array order to keep icon positions
  // predictable when several answers share a usageCount.
  const quickAnswers = [...answers]
    .filter((answer) => answer.published)
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, QUICK_GRID_SIZE)

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
              className="flex min-h-32 flex-col rounded-xl border border-slate-200 bg-slate-50 p-5 text-left text-lg font-semibold leading-tight text-slate-900 transition hover:-translate-y-0.5 hover:border-cyan-400 hover:bg-cyan-50 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-cyan-100 md:min-h-40 md:text-xl"
              dir={getDirection(language)}
              type="button"
              onClick={() => onAsk(answer.canonicalQuestion[language])}
            >
              <Icon className="mb-3 size-7 text-cyan-700" />
              <span className="flex-1">{answer.canonicalQuestion[language]}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function ActionPanel({ action, language }: { action?: DemoAction; language: DemoLanguage }) {
  const direction = getDirection(language)
  const text = uiText[language]

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

  if (action.type === 'direction') {
    // Hero "Go to → counter X" card — designed to be the dominant visual when
    // the answer is a routing decision (the most common APC ask).
    return (
      <section
        className="overflow-hidden rounded-2xl border-2 border-cyan-700 bg-gradient-to-br from-cyan-700 to-cyan-900 p-7 text-white shadow-lg md:p-9"
        dir={direction}
      >
        <div className="flex items-center gap-5 md:gap-7">
          <div className="flex shrink-0 items-center justify-center rounded-2xl bg-white/15 p-5 backdrop-blur md:p-6">
            <MapPin className="size-16 md:size-20" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
              {text.goTo}
            </p>
            <h2 className="mt-1 break-words text-3xl font-bold leading-tight md:text-5xl">
              {action.label[language]}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-cyan-50 md:text-lg">
              {action.description[language]}
            </p>
          </div>
          <ArrowRight
            aria-hidden
            className={`hidden size-16 shrink-0 text-cyan-200 md:block ${
              direction === 'rtl' ? 'rotate-180' : ''
            }`}
          />
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
            <UserRoundCheck className="size-16" />
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
  const { actions, answers, askQuestion, cachedAudio, profile, syncStatus, voiceSettings } = usePrototypeStore({ admin: false })
  const [language, setLanguage] = useState<DemoLanguage>(profile.defaultLanguage)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [question, setQuestion] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isVoicePreparing, setIsVoicePreparing] = useState(false)
  const [isSpeechSupported, setIsSpeechSupported] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [avatarState, setAvatarState] = useState<LiteAvatarState>('idle')
  const [sttSupported, setSttSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const sttFinalRef = useRef('')
  // Mirrors displayed transcript (final + interim) — Chrome's webkitSpeech
  // for ar-DZ never emits isFinal, so we fall back to interim on stop.
  const sttInterimRef = useRef('')
  // 1.8s silence detector to force-stop when the engine doesn't end on its
  // own (Arabic locales mostly).
  const sttSilenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const submitQuestionRef = useRef<(value: string) => void>(() => {})
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

    if (displayAnswer.mode === 'internet' && displayAnswer.internetText) {
      const prefix =
        language === 'ar'
          ? 'لم أتدرب على هذا، لكن وجدت على الإنترنت: '
          : language === 'fr'
          ? "Je n'ai pas été entraînée sur ceci, mais voici ce que j'ai trouvé en ligne : "
          : "I wasn't trained on this, but here's what I found online: "
      return {
        ...displayAnswer,
        text: `${prefix}${displayAnswer.internetText}`,
        badge: language === 'ar' ? 'إنترنت' : language === 'fr' ? 'Internet' : 'Internet',
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
      setSttSupported(Boolean(getSpeechRecognitionCtor()))

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

  // Idle reset: after IDLE_RESET_MS with no input, return to the welcome screen
  // so the next visitor sees a fresh kiosk. Listens at capture phase so any
  // tap/click anywhere in the kiosk counts as activity.
  useEffect(() => {
    if (!hasInteracted) {
      return
    }

    const reset = () => {
      if (idleResetRef.current) {
        clearTimeout(idleResetRef.current)
      }
      idleResetRef.current = setTimeout(() => {
        audioAbortRef.current?.abort()
        audioRef.current?.pause()
        audioRef.current = null
        window.speechSynthesis?.cancel()
        setIsSpeaking(false)
        setIsVoicePreparing(false)
        setAvatarState('idle')
        setDisplayAnswer({ mode: 'known' })
        setQuestion('')
        setHasInteracted(false)
      }, IDLE_RESET_MS)
    }

    reset()
    const events: Array<keyof WindowEventMap> = ['mousedown', 'keydown', 'touchstart']
    for (const event of events) {
      window.addEventListener(event, reset, true)
    }

    return () => {
      if (idleResetRef.current) {
        clearTimeout(idleResetRef.current)
      }
      for (const event of events) {
        window.removeEventListener(event, reset, true)
      }
    }
  }, [hasInteracted])

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

    kioskDebug('using browser TTS', {
      language,
      selectedVoicePresetId,
      reason: 'speakBrowserText invoked',
    })

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
  }, [isSpeechSupported, language, selectedVoicePresetId, voices])

  const cachedAudioKeys = useMemo(() => {
    return new Set(cachedAudio.map((entry) => `${entry.answerId}|${entry.language}|${entry.presetId}`))
  }, [cachedAudio])

  const playCachedAnswerAudio = useCallback(
    async (answerId: string, text: string) => {
      if (!voiceEnabledRef.current || !text.trim()) {
        kioskDebug('playCachedAnswerAudio skip', {
          reason: !voiceEnabledRef.current ? 'voice-disabled' : 'empty-text',
          answerId,
          language,
        })
        return
      }

      stopSpeaking()

      if (!selectedVoicePresetId) {
        kioskDebug('playCachedAnswerAudio no-preset → browser TTS', {
          answerId,
          language,
        })
        speakBrowserText(text)
        return
      }

      const isCached = cachedAudioKeys.has(`${answerId}|${language}|${selectedVoicePresetId}`)

      kioskDebug('playCachedAnswerAudio start', {
        answerId,
        language,
        selectedVoicePresetId,
        isCached,
        cachedAudioCount: cachedAudioKeys.size,
      })

      setIsVoicePreparing(true)

      let objectUrl: string | null = null
      const controller = new AbortController()
      let timedOut = false
      const timeoutId = window.setTimeout(() => {
        timedOut = true
        controller.abort()
      }, answerAudioTimeoutMs)
      audioAbortRef.current = controller

      try {
        const params = new URLSearchParams({
          answerId,
          language,
          v: '2',
        })

        if (isCached) {
          params.set('cachedOnly', '1')
        }

        if (selectedVoicePresetId) {
          params.set('presetId', selectedVoicePresetId)
        }

        const fetchStart = Date.now()
        const response = await fetch(`/api/answer-audio?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        })

        kioskDebug('playCachedAnswerAudio response', {
          answerId,
          language,
          status: response.status,
          xVoiceCache: response.headers.get('x-voice-cache'),
          xVoicePresetId: response.headers.get('x-voice-preset-id'),
          elapsedMs: Date.now() - fetchStart,
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
          kioskDebug('cached audio playing', { answerId, language })
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
          kioskDebugWarn('cached audio onerror → browser TTS', { answerId, language })
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
      } catch (error) {
        kioskDebugWarn('playCachedAnswerAudio threw', {
          answerId,
          language,
          aborted: controller.signal.aborted,
          timedOut,
          error: error instanceof Error ? error.message : String(error),
        })
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
    [cachedAudioKeys, language, selectedVoicePresetId, speakBrowserText, stopSpeaking]
  )

  const speakAnswer = useCallback(
    (answer: LocalizedDisplayAnswer) => {
      kioskDebug('speakAnswer', {
        mode: answer.mode,
        answerId: answer.answerId,
        language,
        selectedVoicePresetId,
        voiceEnabled: voiceEnabledRef.current,
      })

      if (!voiceEnabledRef.current || !answer.text.trim()) {
        return
      }

      if (answer.mode === 'known' && answer.answerId) {
        void playCachedAnswerAudio(answer.answerId, answer.text)
        return
      }

      // Unknown question — route through the cached xtts pipeline using a
      // synthetic answer id so the visitor hears the fallback line in the
      // selected voice instead of the browser default. If the cached file is
      // missing playCachedAnswerAudio falls back to browser TTS internally.
      void playCachedAnswerAudio(FALLBACK_ANSWER_ID, answer.text)
    },
    [language, playCachedAnswerAudio, selectedVoicePresetId]
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

  useEffect(() => {
    submitQuestionRef.current = submitQuestion
  })

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort()
      } catch {
        // ignore — recognition may already be stopped
      }
    }
  }, [])

  const clearSilenceTimer = useCallback(() => {
    if (sttSilenceTimerRef.current !== null) {
      clearTimeout(sttSilenceTimerRef.current)
      sttSilenceTimerRef.current = null
    }
  }, [])

  const stopListening = useCallback(() => {
    clearSilenceTimer()
    if (!recognitionRef.current) {
      return
    }
    try {
      recognitionRef.current.stop()
    } catch {
      // ignore — already stopped
    }
  }, [clearSilenceTimer])

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      return
    }

    // If a previous session is somehow still running, abort it first so the
    // browser doesn't reject the new start() with InvalidStateError.
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch {
        // ignore
      }
    }

    sttFinalRef.current = ''
    sttInterimRef.current = ''
    clearSilenceTimer()
    const recognition = new Ctor()
    recognition.lang = speechLangForLanguage(language)
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onresult = (event) => {
      let finalText = sttFinalRef.current
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript
        } else {
          interimText += result[0].transcript
        }
      }
      sttFinalRef.current = finalText
      const combined = (finalText + interimText).trim()
      sttInterimRef.current = combined
      setQuestion(combined)
      // Reset silence timer on every result. After 1.8s of no further
      // results, force-stop. Needed for Arabic — Chrome's STT engine
      // doesn't reliably declare end-of-speech for ar-DZ.
      clearSilenceTimer()
      if (combined) {
        sttSilenceTimerRef.current = setTimeout(() => {
          try {
            recognitionRef.current?.stop()
          } catch {
            // already stopped
          }
        }, 1800)
      }
    }

    recognition.onerror = () => {
      clearSilenceTimer()
      setIsListening(false)
    }

    recognition.onend = () => {
      clearSilenceTimer()
      setIsListening(false)
      // Prefer isFinal text; fall back to interim — for Arabic that's all
      // we ever get from Chrome's STT.
      const finalText = sttFinalRef.current.trim() || sttInterimRef.current.trim()
      if (finalText) {
        submitQuestionRef.current(finalText)
      }
    }

    try {
      recognition.start()
      recognitionRef.current = recognition
      setIsListening(true)
    } catch {
      setIsListening(false)
    }
  }, [language])

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

  const handleStart = useCallback((next: DemoLanguage) => {
    setLanguage(next)
    setDisplayAnswer({ mode: 'known' })
    setQuestion('')
    setHasInteracted(true)
  }, [])

  const direction = useMemo(() => getDirection(language), [language])

  if (!hasInteracted) {
    return <WelcomeScreen profile={profile} onStart={handleStart} />
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-4 text-slate-950 md:p-6" dir={direction}>
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
          <LanguageSwitcher language={language} setLanguage={setLanguage} />
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-slate-200 px-5 text-base font-semibold text-slate-700 hover:border-cyan-300"
              href="/admin"
            >
              <ShieldCheck className="size-5" />
              {uiText[language].admin}
            </Link>
            <button
              className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-orange-600 px-5 text-base font-semibold text-white hover:bg-orange-700"
              type="button"
              onClick={handleEscalation}
            >
              <UserRoundCheck className="size-5" />
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

        <ActionPanel action={localizedAnswer.action} language={language} />

        <QuickQuestionGrid answers={answers} language={language} onAsk={submitQuestion} />

        <section className="sticky bottom-4 z-10 rounded-lg border border-slate-200 bg-white p-4 shadow-lg md:p-5">
          {isListening ? (
            <div
              aria-live="polite"
              className="mb-3 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900"
              dir={direction}
            >
              <span className="inline-block size-2 animate-pulse rounded-full bg-rose-600" aria-hidden />
              {uiText[language].listening}
            </div>
          ) : null}
          <form
            className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_150px]"
            onSubmit={handleSubmit}
          >
            <input
              className="min-h-16 rounded-lg border border-slate-300 bg-white px-4 text-xl text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              dir={direction}
              placeholder={uiText[language].placeholder}
              type="text"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <button
              aria-label={uiText[language].holdToTalk}
              aria-pressed={isListening}
              className={`inline-flex min-h-16 min-w-16 items-center justify-center gap-2 rounded-lg px-5 text-base font-semibold transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 ${
                isListening
                  ? 'bg-rose-600 text-white shadow-lg ring-4 ring-rose-200'
                  : 'border border-cyan-700 bg-white text-cyan-800 hover:bg-cyan-50'
              }`}
              disabled={!sttSupported || isThinking}
              title={sttSupported ? uiText[language].holdToTalkHint : uiText[language].micUnsupported}
              type="button"
              onPointerDown={(event) => {
                event.preventDefault()
                startListening()
              }}
              onPointerUp={stopListening}
              onPointerLeave={() => {
                if (isListening) {
                  stopListening()
                }
              }}
              onPointerCancel={stopListening}
            >
              <Mic className="size-6" />
              <span className="hidden md:inline">{uiText[language].holdToTalk}</span>
            </button>
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
