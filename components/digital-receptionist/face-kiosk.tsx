'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Mic, Square, UserRoundCheck } from 'lucide-react'
import {
  demoLanguages,
  type DemoLanguage,
  uiText,
} from '@/lib/digital-receptionist/demo-data'
import { chooseVoiceForLanguage, speechLangForLanguage } from '@/lib/digital-receptionist/voice-lite'
import { usePrototypeStore, type AskResult } from './use-prototype-store'

type FaceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'fallback'

// Mirror of FALLBACK_ANSWER_ID in kiosk-prototype.tsx — the synthetic answer
// id used to fetch cached xtts audio for unknown-question fallback lines.
const FALLBACK_ANSWER_ID = '__fallback__'
const IDLE_RESET_MS = 90_000
const ANSWER_AUDIO_TIMEOUT_MS = 600000

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

const NUM_BARS = 32

export type FaceVariantId = 'aurora' | 'bloom' | 'pulse'

export const faceVariants: Array<{ id: FaceVariantId; label: string; description: string }> = [
  { id: 'aurora', label: 'Aurora', description: 'Glowing, futuristic' },
  { id: 'bloom', label: 'Bloom', description: 'Friendly cartoon' },
  { id: 'pulse', label: 'Pulse', description: 'Abstract orb' },
]

type FaceFeatureProps = {
  state: FaceState
  accent: string
  avgLevel: number
}

// --- Aurora — softened version of the original futuristic face -------------
function FaceAurora({ state, accent }: FaceFeatureProps) {
  const isListening = state === 'listening'
  const isThinking = state === 'thinking'
  const isSpeaking = state === 'speaking'
  const isFallback = state === 'fallback'

  return (
    <>
      {/* Eye glow halos */}
      <circle cx="140" cy="180" r="34" fill="url(#eye-glow)" />
      <circle cx="260" cy="180" r="34" fill="url(#eye-glow)" />

      {/* Soft pupils with a friendly white catchlight so it doesn't feel alien */}
      <g className={isListening || isSpeaking ? 'face-eyes-alert' : 'face-eyes-blink'}>
        <ellipse cx="140" cy="180" rx="14" ry="18" fill={accent} filter="url(#soft)" />
        <ellipse cx="260" cy="180" rx="14" ry="18" fill={accent} filter="url(#soft)" />
        <circle cx="135" cy="174" r="4" fill="#ffffff" opacity="0.9" />
        <circle cx="255" cy="174" r="4" fill="#ffffff" opacity="0.9" />
      </g>

      {/* Mouth */}
      {isSpeaking ? (
        <g transform="translate(160 250)" className="face-mouth-bars">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <rect
              key={i}
              x={i * 10}
              y={-12}
              width={6}
              height={24}
              rx={3}
              fill={accent}
              style={{ transformOrigin: `${i * 10 + 3}px 0px`, animationDelay: `${i * 80}ms` }}
              className="face-mouth-bar"
            />
          ))}
        </g>
      ) : isThinking ? (
        <g transform="translate(180 260)">
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              cx={i * 20}
              cy={0}
              r={5}
              fill={accent}
              className="face-thinking-dot"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </g>
      ) : isListening ? (
        <ellipse cx="200" cy="260" rx="30" ry="10" fill="none" stroke={accent} strokeWidth="3" />
      ) : (
        <path
          d={isFallback ? 'M 160 258 Q 200 252 240 258' : 'M 160 252 Q 200 272 240 252'}
          fill="none"
          stroke={accent}
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
    </>
  )
}

// --- Bloom — friendly cartoon face -----------------------------------------
function FaceBloom({ state, accent }: FaceFeatureProps) {
  const isListening = state === 'listening'
  const isThinking = state === 'thinking'
  const isSpeaking = state === 'speaking'
  const isFallback = state === 'fallback'
  const pupilColor = '#0f172a'

  // Eye state: thinking → pupils gaze up-and-around (classic "hmm").
  // Speaking/listening → alert dilate. Idle → relaxed blink.
  const eyeClass = isThinking
    ? 'face-eyes-thinking'
    : isListening || isSpeaking
    ? 'face-eyes-alert'
    : 'face-eyes-blink'

  return (
    <>
      {/* Rosy cheek hints */}
      <ellipse cx="115" cy="225" rx="22" ry="10" fill="#fb7185" opacity="0.28" />
      <ellipse cx="285" cy="225" rx="22" ry="10" fill="#fb7185" opacity="0.28" />

      {/* White eye whites */}
      <circle cx="140" cy="185" r="26" fill="#f8fafc" />
      <circle cx="260" cy="185" r="26" fill="#f8fafc" />

      {/* Dark pupils with cute white highlight */}
      <g className={eyeClass}>
        <circle cx="140" cy="188" r="12" fill={pupilColor} />
        <circle cx="260" cy="188" r="12" fill={pupilColor} />
        <circle cx="135" cy="182" r="4" fill="#ffffff" />
        <circle cx="255" cy="182" r="4" fill="#ffffff" />
        {/* tiny lower highlight = "twinkle" */}
        <circle cx="144" cy="192" r="2" fill="#ffffff" opacity="0.7" />
        <circle cx="264" cy="192" r="2" fill="#ffffff" opacity="0.7" />
      </g>

      {/* Mouth — friendlier than Aurora */}
      {isSpeaking ? (
        // Oval mouth that opens/closes
        <ellipse
          cx="200"
          cy="265"
          rx="28"
          ry="16"
          fill={pupilColor}
          className="face-bloom-mouth"
        />
      ) : isThinking ? (
        // Gentle closed smile — relaxed concentration. The "thinking" cue is
        // carried by the gaze + thought-bubble dots above the head, not the
        // mouth.
        <path
          d="M 175 262 Q 200 270 225 262"
          fill="none"
          stroke={pupilColor}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      ) : isListening ? (
        // Slight open smile
        <path
          d="M 150 248 Q 200 295 250 248"
          fill={pupilColor}
          fillOpacity="0.95"
          stroke={pupilColor}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      ) : (
        // Big arch smile (idle/fallback uses a softer one)
        <path
          d={isFallback ? 'M 160 258 Q 200 252 240 258' : 'M 150 250 Q 200 295 250 250'}
          fill="none"
          stroke={accent}
          strokeWidth="5"
          strokeLinecap="round"
        />
      )}

      {/* Thought-bubble dots — only while thinking. Three dots fade in
          sequence above the head, the universal "I'm processing" cue. */}
      {isThinking ? (
        <g>
          <circle cx="178" cy="115" r="5" fill={accent} className="face-think-dot face-think-dot-1" />
          <circle cx="200" cy="105" r="6" fill={accent} className="face-think-dot face-think-dot-2" />
          <circle cx="225" cy="115" r="5" fill={accent} className="face-think-dot face-think-dot-3" />
        </g>
      ) : null}
    </>
  )
}

// --- Pulse — abstract orb, no facial features ------------------------------
function FacePulse({ state, accent, avgLevel }: FaceFeatureProps) {
  const isListening = state === 'listening'
  const isThinking = state === 'thinking'
  const isSpeaking = state === 'speaking'

  // While listening, the inner ripple scales with the actual mic level. Other
  // states just breathe gently (the parent <svg> already has the breath anim).
  const ripple = isListening ? 60 + avgLevel * 70 : 0

  return (
    <>
      <defs>
        <radialGradient id="pulse-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="1" />
          <stop offset="55%" stopColor={accent} stopOpacity="0.55" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Core glow */}
      <circle cx="200" cy="200" r="60" fill="url(#pulse-core)" />

      {/* Concentric rings */}
      <circle
        cx="200"
        cy="200"
        r="80"
        fill="none"
        stroke={accent}
        strokeOpacity={isSpeaking ? 0.85 : 0.5}
        strokeWidth={3}
        className={isThinking ? 'face-pulse-spin' : 'face-pulse-breath'}
      />
      <circle
        cx="200"
        cy="200"
        r="110"
        fill="none"
        stroke={accent}
        strokeOpacity={isSpeaking ? 0.55 : 0.3}
        strokeWidth={2}
        className={isThinking ? 'face-pulse-spin-reverse' : 'face-pulse-breath'}
        style={{ animationDelay: '300ms' }}
      />
      <circle
        cx="200"
        cy="200"
        r="138"
        fill="none"
        stroke={accent}
        strokeOpacity={isSpeaking ? 0.35 : 0.18}
        strokeWidth={1.5}
        className={isThinking ? 'face-pulse-spin' : 'face-pulse-breath'}
        style={{ animationDelay: '600ms' }}
      />

      {/* Live audio ripple — only while listening */}
      {isListening ? (
        <circle
          cx="200"
          cy="200"
          r={ripple}
          fill="none"
          stroke={accent}
          strokeOpacity={Math.min(0.9, 0.3 + avgLevel)}
          strokeWidth={2}
          style={{ transition: 'r 90ms ease-out, stroke-opacity 90ms ease-out' }}
        />
      ) : null}
    </>
  )
}

// --- Face SVG dispatcher ----------------------------------------------------
function FaceOrb({
  state,
  audioBars,
  variant,
}: {
  state: FaceState
  audioBars: number[]
  variant: FaceVariantId
}) {
  const isListening = state === 'listening'
  const isThinking = state === 'thinking'
  const isSpeaking = state === 'speaking'
  const isFallback = state === 'fallback'

  // Accent palette shifts by state — cyan for the normal flow, amber for
  // fallback, slightly brighter cyan while listening.
  const accent = isFallback ? '#fbbf24' : isListening ? '#67e8f9' : '#22d3ee'
  const accentDim = isFallback ? '#b45309' : '#0e7490'

  // Average mic level (0–1). Drives the breathing glow + halo intensity when
  // the visitor is actually speaking, so the face visibly reacts to sound.
  const avgLevel = isListening
    ? Math.min(1, audioBars.reduce((sum, value) => sum + value, 0) / audioBars.length)
    : 0

  return (
    <div className="relative flex aspect-square w-full max-w-[520px] items-center justify-center">
      {/* Soft glow halo — pulses with mic level while listening */}
      <div
        aria-hidden
        className="absolute inset-[12%] rounded-full blur-3xl transition-opacity duration-200"
        style={{
          background: `radial-gradient(circle, ${accent} 0%, transparent 70%)`,
          opacity: isListening
            ? 0.45 + avgLevel * 0.55
            : isSpeaking
              ? 0.7
              : 0.4,
          transform: isListening ? `scale(${1 + avgLevel * 0.15})` : undefined,
          transition: 'opacity 120ms ease-out, transform 120ms ease-out',
        }}
      />

      {/* Rotating outer ring — thinking */}
      {isThinking ? (
        <div
          aria-hidden
          className="absolute inset-[6%] animate-[spin_3s_linear_infinite] rounded-full border-2 border-dashed"
          style={{ borderColor: `${accent}66` }}
        />
      ) : null}

      {/* Pulsing ring — listening */}
      {isListening ? (
        <>
          <div
            aria-hidden
            className="absolute inset-[8%] animate-ping rounded-full border-2"
            style={{ borderColor: accent }}
          />
          <div
            aria-hidden
            className="absolute inset-[4%] rounded-full border"
            style={{ borderColor: `${accent}88` }}
          />
        </>
      ) : null}

      {/* The face itself */}
      <svg
        viewBox="0 0 400 400"
        className={`relative size-full ${isSpeaking ? 'face-breath-fast' : 'face-breath'}`}
        role="img"
        aria-label="AI assistant face"
      >
        <defs>
          <radialGradient id="face-fill" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#0c4a6e" />
            <stop offset="55%" stopColor="#082f49" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>
          <radialGradient id="eye-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent} stopOpacity="1" />
            <stop offset="60%" stopColor={accent} stopOpacity="0.7" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        {/* Head */}
        <circle cx="200" cy="200" r="170" fill="url(#face-fill)" stroke={accent} strokeOpacity="0.4" strokeWidth="2" />

        {/* Tech-y inner ring */}
        <circle
          cx="200"
          cy="200"
          r="158"
          fill="none"
          stroke={accentDim}
          strokeOpacity="0.45"
          strokeWidth="1"
          strokeDasharray="4 8"
        />

        {/* Audio-reactive bar ring — real mic levels while listening. */}
        {isListening
          ? audioBars.map((level, i) => {
              const angle = (i / NUM_BARS) * 360
              const baseHeight = 6
              const height = baseHeight + level * 36
              return (
                <g key={i} transform={`rotate(${angle} 200 200)`}>
                  <rect
                    x={198.5}
                    y={200 - 180 - height}
                    width={3}
                    height={height}
                    rx={1.5}
                    fill={accent}
                    opacity={0.35 + level * 0.65}
                  />
                </g>
              )
            })
          : null}

        {/* Variant-specific facial content. */}
        {variant === 'aurora' ? (
          <FaceAurora state={state} accent={accent} avgLevel={avgLevel} />
        ) : variant === 'bloom' ? (
          <FaceBloom state={state} accent={accent} avgLevel={avgLevel} />
        ) : (
          <FacePulse state={state} accent={accent} avgLevel={avgLevel} />
        )}
      </svg>

      <style jsx>{`
        :global(.face-breath) {
          animation: face-breath 5s ease-in-out infinite;
          transform-origin: center;
        }
        :global(.face-breath-fast) {
          animation: face-breath 2.2s ease-in-out infinite;
          transform-origin: center;
        }
        @keyframes face-breath {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.015); }
        }
        :global(.face-eyes-blink) {
          animation: face-blink 5.5s ease-in-out infinite;
          transform-origin: center;
          transform-box: fill-box;
        }
        :global(.face-eyes-alert) {
          animation: face-blink 8s ease-in-out infinite;
          transform-origin: center;
          transform-box: fill-box;
        }
        @keyframes face-blink {
          0%, 92%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.08); }
          97% { transform: scaleY(1); }
        }
        :global(.face-mouth-bar) {
          animation: face-mouth-bar 0.6s ease-in-out infinite;
        }
        @keyframes face-mouth-bar {
          0%, 100% { transform: scaleY(0.35); }
          50% { transform: scaleY(1); }
        }
        :global(.face-thinking-dot) {
          animation: face-thinking-dot 1.2s ease-in-out infinite;
        }
        @keyframes face-thinking-dot {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        :global(.face-bloom-mouth) {
          animation: bloom-mouth 0.45s ease-in-out infinite;
          /* transform-box:fill-box makes "center" the center of the ellipse's
             own bbox; without it the scale pivots off the SVG origin and the
             mouth visibly flies out of the face on every cycle. */
          transform-origin: center;
          transform-box: fill-box;
        }
        @keyframes bloom-mouth {
          0%, 100% { transform: scaleY(0.35); }
          50% { transform: scaleY(1); }
        }
        :global(.face-pulse-breath) {
          animation: pulse-breath 3.4s ease-in-out infinite;
          transform-origin: center;
          transform-box: fill-box;
        }
        @keyframes pulse-breath {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        :global(.face-pulse-spin) {
          animation: pulse-spin 6s linear infinite;
          transform-origin: center;
          transform-box: fill-box;
        }
        :global(.face-pulse-spin-reverse) {
          animation: pulse-spin 8s linear infinite reverse;
          transform-origin: center;
          transform-box: fill-box;
        }
        @keyframes pulse-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Thinking gaze — eyes drift up-and-around like the avatar is
           actively contemplating. Slow, gentle, never crosses center for
           more than a beat. */
        :global(.face-eyes-thinking) {
          animation: face-eyes-thinking 2.4s ease-in-out infinite;
          transform-origin: center;
          transform-box: fill-box;
        }
        @keyframes face-eyes-thinking {
          0%   { transform: translate(-3px, -4px); }
          25%  { transform: translate(3px, -5px); }
          50%  { transform: translate(4px, -2px); }
          75%  { transform: translate(-2px, -5px); }
          100% { transform: translate(-3px, -4px); }
        }

        /* Thought-bubble dots — three dots above the head fading in
           sequence. Total cycle 1.4s; each dot is offset by ~0.18s so the
           sequence reads "dot · dot · dot" like a typing indicator. */
        :global(.face-think-dot) {
          animation: face-think-dot 1.4s ease-in-out infinite;
        }
        :global(.face-think-dot-1) { animation-delay: 0s; }
        :global(.face-think-dot-2) { animation-delay: 0.18s; }
        :global(.face-think-dot-3) { animation-delay: 0.36s; }
        @keyframes face-think-dot {
          0%, 60%, 100% { opacity: 0.18; transform: translateY(2px); }
          30%           { opacity: 1;    transform: translateY(-2px); }
        }
      `}</style>
    </div>
  )
}

/**
 * Tiny "Earth" badge. Shown in the kiosk header whenever the tenant has
 * internet fallback enabled (profile.useInternetFallback) so visitors
 * can see at a glance that the avatar can reach beyond its trained
 * catalog. The continent blobs orbit inside a static sphere outline —
 * speeds up + glows cyan while a search is actually in flight (active
 * prop), giving the 20-25s wait a visual heartbeat to match the
 * "Searching the internet…" caption.
 *
 * Implementation: plain 2D rotation on the continent group via SVG
 * `transform` keyframes. Earlier version used rotateY + preserve-3d
 * which crashed Safari's WebKit renderer on the kiosk page. The 2D
 * orbit reads just as clearly as "Earth rotating" at icon size.
 */
function RotatingGlobe({ active, title }: { active: boolean; title: string }) {
  return (
    <span
      title={title}
      aria-label={title}
      className={`inline-flex size-9 items-center justify-center transition-colors ${
        active
          ? 'text-cyan-300 [filter:drop-shadow(0_0_6px_rgba(34,211,238,0.7))]'
          : 'text-white/50'
      }`}
    >
      <svg viewBox="0 0 24 24" className="size-full">
        {/* Static sphere skeleton */}
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.2" />
        {/* Equator */}
        <ellipse cx="12" cy="12" rx="10" ry="3.2" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.55" />
        {/* Meridian */}
        <ellipse cx="12" cy="12" rx="3.2" ry="10" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.55" />
        {/* Polar axis hint */}
        <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
        {/* Continent blobs orbit the sphere centre — communicates motion
            without WebKit's SVG-3D-transform bug. */}
        <g className={active ? 'globe-orbit-fast' : 'globe-orbit'}>
          <ellipse cx="9" cy="9" rx="2" ry="1.3" fill="currentColor" opacity="0.6" />
          <ellipse cx="15" cy="13" rx="1.6" ry="2.2" fill="currentColor" opacity="0.6" />
          <circle cx="10" cy="17" r="1.1" fill="currentColor" opacity="0.6" />
        </g>
      </svg>
      <style jsx>{`
        :global(.globe-orbit) {
          animation: globe-orbit 12s linear infinite;
          transform-origin: 12px 12px;
        }
        :global(.globe-orbit-fast) {
          animation: globe-orbit 4s linear infinite;
          transform-origin: 12px 12px;
        }
        @keyframes globe-orbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </span>
  )
}

const FACE_VARIANT_STORAGE_KEY = 'face-kiosk.variant.v1'

function isFaceVariantId(value: unknown): value is FaceVariantId {
  return value === 'aurora' || value === 'bloom' || value === 'pulse'
}

// --- Main component ---------------------------------------------------------
export function FaceKiosk() {
  const { actions, answers, askQuestion, profile, voiceSettings } = usePrototypeStore({ admin: false })
  const [language, setLanguage] = useState<DemoLanguage>(profile.defaultLanguage)
  const [state, setState] = useState<FaceState>('idle')
  const [answerText, setAnswerText] = useState('')
  const [answerKind, setAnswerKind] = useState<'known' | 'unknown' | 'escalation' | 'greeting' | 'internet'>('greeting')
  const [internetSources, setInternetSources] = useState<string[]>([])
  // True while askQuestion is in the "internet fallback" leg — used to swap
  // the thinking caption to "Searching the internet…" so the 20-25s wait
  // reads as progress instead of a hang.
  const [searchingInternet, setSearchingInternet] = useState(false)
  // Monotonic submission counter. Late-arriving askQuestion results from a
  // previous submission get discarded so we never flicker old → new.
  const submitRequestRef = useRef(0)
  // AbortController for the in-flight askQuestion fetch chain. Aborted
  // when a new submission starts OR when the visitor taps the mic again
  // mid-search, so the upstream LAPI call stops generating tokens nobody
  // will see.
  const inflightAbortRef = useRef<AbortController | null>(null)
  const [transcript, setTranscript] = useState('')
  const [sttSupported, setSttSupported] = useState(false)
  const [showHint, setShowHint] = useState(true)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  // Bloom is the friendliest default — visitors find Aurora's glowing eyes
  // a bit alien on first contact.
  const [variant, setVariant] = useState<FaceVariantId>('bloom')

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const sttFinalRef = useRef('')
  // Mirrors the displayed transcript (final + interim) so onend can submit
  // even when the STT engine never marks anything isFinal — common with
  // Chrome's webkitSpeechRecognition for Arabic locales (ar-DZ).
  const sttInterimRef = useRef('')
  // Silence-timeout: webkitSpeechRecognition does not reliably fire its own
  // end-of-speech for non-English locales (especially Arabic), so we run our
  // own ~1.8s silence detector. Reset on every interim result.
  const sttSilenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioAbortRef = useRef<AbortController | null>(null)
  const audioObjectUrlRef = useRef<string | null>(null)
  const idleResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mic analyser refs — populated only while listening.
  const micStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const [audioBars, setAudioBars] = useState<number[]>(() => Array(NUM_BARS).fill(0))
  const selectedVoicePresetId = voiceSettings[language]
  const staffAction = actions.find((action) => action.id === 'staff-help')
  const text = uiText[language]

  // Detect Web Speech API support after mount + restore the saved face
  // variant + load the browser TTS voice list. Scheduled with setTimeout(0)
  // so the setState lands in a fresh React batch (matches the pattern in
  // kiosk-prototype.tsx; also avoids the react-hooks/set-state-in-effect lint).
  const loadVoices = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    setVoices(window.speechSynthesis.getVoices())
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSttSupported(Boolean(getSpeechRecognitionCtor()))
      try {
        const stored = window.localStorage.getItem(FACE_VARIANT_STORAGE_KEY)
        if (isFaceVariantId(stored)) {
          setVariant(stored)
        }
      } catch {
        // localStorage may be unavailable (private mode); fall back to default.
      }
      if ('speechSynthesis' in window) {
        loadVoices()
        window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
      }
    }, 0)
    return () => {
      window.clearTimeout(id)
      try {
        recognitionRef.current?.abort()
      } catch {
        // ignore
      }
      audioAbortRef.current?.abort()
      audioRef.current?.pause()
      if (audioObjectUrlRef.current) {
        URL.revokeObjectURL(audioObjectUrlRef.current)
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
      }
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      micStreamRef.current?.getTracks().forEach((track) => track.stop())
      micStreamRef.current = null
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        void audioContextRef.current.close().catch(() => {})
      }
      audioContextRef.current = null
    }
  }, [loadVoices])

  const handleVariantChange = useCallback((next: FaceVariantId) => {
    setVariant(next)
    try {
      window.localStorage.setItem(FACE_VARIANT_STORAGE_KEY, next)
    } catch {
      // ignore — picker still works for the current session
    }
  }, [])

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
  }, [])

  const stopMicAnalyser = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    try {
      analyserRef.current?.disconnect()
    } catch {
      // ignore
    }
    analyserRef.current = null
    micStreamRef.current?.getTracks().forEach((track) => track.stop())
    micStreamRef.current = null
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      void audioContextRef.current.close().catch(() => {})
    }
    audioContextRef.current = null
    setAudioBars(Array(NUM_BARS).fill(0))
  }, [])

  // Open a parallel mic stream just for the analyser. The Web Speech API
  // doesn't expose audio levels, so we tap getUserMedia separately — the
  // browser shares the hardware between consumers.
  const startMicAnalyser = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStreamRef.current = stream
      const AudioCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtor) {
        stream.getTracks().forEach((track) => track.stop())
        micStreamRef.current = null
        return
      }
      const ctx = new AudioCtor()
      audioContextRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 128
      analyser.smoothingTimeConstant = 0.7
      source.connect(analyser)
      analyserRef.current = analyser

      const data = new Uint8Array(analyser.frequencyBinCount)
      let lastUpdate = 0
      const loop = (timestamp: number) => {
        const current = analyserRef.current
        if (!current) {
          return
        }
        current.getByteFrequencyData(data)
        // Throttle to ~30 fps so React isn't re-rendering 60×/s for nothing.
        if (timestamp - lastUpdate > 33) {
          const bucketSize = Math.max(1, Math.floor(data.length / NUM_BARS))
          const next = new Array<number>(NUM_BARS)
          for (let i = 0; i < NUM_BARS; i += 1) {
            let sum = 0
            for (let j = 0; j < bucketSize; j += 1) {
              sum += data[i * bucketSize + j] ?? 0
            }
            // 0..255 → 0..1 with a slight ceiling so quiet voices still register.
            next[i] = Math.min(1, sum / bucketSize / 180)
          }
          setAudioBars(next)
          lastUpdate = timestamp
        }
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)
    } catch (error) {
      // Mic denied / unavailable — listening still works via SpeechRecognition,
      // the face just won't visualise audio levels.
      console.warn('[face-kiosk] mic analyser unavailable', error)
    }
  }, [])

  // Idle reset to bring the face back to a fresh state
  useEffect(() => {
    const reset = () => {
      if (idleResetRef.current) {
        clearTimeout(idleResetRef.current)
      }
      idleResetRef.current = setTimeout(() => {
        stopSpeaking()
        setState('idle')
        setAnswerText('')
        setAnswerKind('greeting')
        setTranscript('')
        setShowHint(true)
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
  }, [stopSpeaking])

  // Cycle the hint caption while idle so the kiosk reads in all 3 languages
  const [hintLangIndex, setHintLangIndex] = useState(0)
  useEffect(() => {
    if (!showHint) return
    const id = setInterval(() => setHintLangIndex((i) => (i + 1) % demoLanguages.length), 2500)
    return () => clearInterval(id)
  }, [showHint])

  // --- Speech synthesis (browser TTS fallback) -----------------------------
  // Picks an explicit voice via chooseVoiceForLanguage so the kiosk speaks
  // the same browser voice every time — without this, the browser falls back
  // to whatever default it picks for that lang code, which can shift between
  // page loads (and was why Bloom/Aurora/Pulse seemed to use different voices).
  const speakBrowserText = useCallback(
    (value: string) => {
      if (!('speechSynthesis' in window) || !value.trim()) {
        return
      }
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(value)
      const voice = chooseVoiceForLanguage(voices, language)
      utterance.lang = voice?.lang ?? speechLangForLanguage(language)
      utterance.voice = voice ?? null
      utterance.rate = language === 'ar' ? 0.88 : 0.95
      utterance.pitch = 1
      utterance.volume = 1
      utterance.onstart = () => setState('speaking')
      utterance.onend = () => setState('idle')
      utterance.onerror = () => setState('idle')
      window.speechSynthesis.speak(utterance)
    },
    [language, voices]
  )

  // --- Cached XTTS audio with browser-TTS fallback -------------------------
  const playAnswerAudio = useCallback(
    async (answerId: string, value: string) => {
      if (!value.trim()) {
        return
      }
      stopSpeaking()

      if (!selectedVoicePresetId) {
        speakBrowserText(value)
        return
      }

      const controller = new AbortController()
      let timedOut = false
      const timeoutId = window.setTimeout(() => {
        timedOut = true
        controller.abort()
      }, ANSWER_AUDIO_TIMEOUT_MS)
      audioAbortRef.current = controller

      try {
        const params = new URLSearchParams({
          answerId,
          language,
          v: '2',
          cachedOnly: '1',
          presetId: selectedVoicePresetId,
        })
        const response = await fetch(`/api/answer-audio?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error('cache miss')
        }
        const nextObjectUrl = URL.createObjectURL(await response.blob())
        audioObjectUrlRef.current = nextObjectUrl
        const audio = new Audio(nextObjectUrl)
        audioRef.current = audio

        audio.onplay = () => setState('speaking')
        audio.onended = () => {
          if (audioObjectUrlRef.current === nextObjectUrl) {
            URL.revokeObjectURL(nextObjectUrl)
            audioObjectUrlRef.current = null
          }
          setState('idle')
        }
        audio.onerror = () => {
          if (audioObjectUrlRef.current === nextObjectUrl) {
            URL.revokeObjectURL(nextObjectUrl)
            audioObjectUrlRef.current = null
          }
          speakBrowserText(value)
        }
        await audio.play()
      } catch {
        if (!controller.signal.aborted || timedOut) {
          speakBrowserText(value)
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

  // --- Ask flow ------------------------------------------------------------
  // Abort any in-flight ask. Called when a new submission starts OR when the
  // visitor taps the mic again — the previous LAPI call is cancelled so the
  // upstream model stops generating wasted tokens.
  const cancelInflightAsk = useCallback(() => {
    if (inflightAbortRef.current) {
      inflightAbortRef.current.abort()
      inflightAbortRef.current = null
    }
  }, [])

  const submitQuestion = useCallback(
    async (value: string) => {
      const trimmed = value.trim()
      if (!trimmed) return

      // Cancel anything still running from the previous submission.
      cancelInflightAsk()
      const controller = new AbortController()
      inflightAbortRef.current = controller

      const reqId = ++submitRequestRef.current
      setShowHint(false)
      setState('thinking')
      setSearchingInternet(false)
      setTranscript(trimmed)
      setAnswerText('')

      let result: AskResult
      try {
        result = await askQuestion(
          trimmed,
          language,
          (phase) => {
            // Phase callback fires when askQuestion enters the internet leg.
            // Only honor it if this is still the latest submission.
            if (reqId !== submitRequestRef.current) return
            if (phase === 'searching-internet') setSearchingInternet(true)
          },
          controller.signal,
        )
      } catch (err) {
        // We aborted intentionally (new submission, mic re-tap). Skip
        // rendering — the new submission will own the UI.
        if (controller.signal.aborted) return
        throw err
      }
      // Clear the in-flight ref if this controller is still the active one.
      if (inflightAbortRef.current === controller) {
        inflightAbortRef.current = null
      }
      // Stale-response guard: a newer submission has started; drop this one
      // so its (possibly outdated) answer doesn't flicker over the new one.
      if (reqId !== submitRequestRef.current) return
      setSearchingInternet(false)
      if (result.type === 'known') {
        const localized = result.answer.answerText[language]
        setAnswerText(localized)
        setAnswerKind('known')
        setInternetSources([])
        void playAnswerAudio(result.answer.id, localized)
      } else if (result.type === 'internet') {
        setAnswerText(result.text)
        setAnswerKind('internet')
        setInternetSources(result.sources)
        // Speak just the answer text — sources are visual only. Use the
        // fallback "answer id" so we don't pollute the per-answer audio
        // cache with one-off web answers.
        void playAnswerAudio(FALLBACK_ANSWER_ID, result.text)
      } else {
        const localized = result.fallbackResponse[language]
        setAnswerText(localized)
        setAnswerKind('unknown')
        setInternetSources([])
        void playAnswerAudio(FALLBACK_ANSWER_ID, localized)
      }
    },
    [askQuestion, language, playAnswerAudio]
  )

  const submitQuestionRef = useRef(submitQuestion)
  useEffect(() => {
    submitQuestionRef.current = submitQuestion
  })

  // --- STT (tap-to-talk; auto-stops on silence) ----------------------------
  const clearSilenceTimer = useCallback(() => {
    if (sttSilenceTimerRef.current !== null) {
      clearTimeout(sttSilenceTimerRef.current)
      sttSilenceTimerRef.current = null
    }
  }, [])

  const stopListening = useCallback(() => {
    clearSilenceTimer()
    try {
      recognitionRef.current?.stop()
    } catch {
      // already stopped
    }
  }, [clearSilenceTimer])

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return

    // Cancel any in-flight ask from a previous question — if we're
    // searching the internet (20s wait) and the visitor taps mic to ask
    // something else, kill the upstream LAPI call instead of letting it
    // burn quota on an answer nobody will see.
    cancelInflightAsk()
    setSearchingInternet(false)
    setAnswerText('')

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch {
        // ignore
      }
    }

    stopSpeaking()
    sttFinalRef.current = ''
    sttInterimRef.current = ''
    clearSilenceTimer()
    setTranscript('')
    setShowHint(false)

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
      setTranscript(combined)
      // Speech detected → reset the silence timer. If no further results
      // arrive within 1.8s, force-stop. Catches the Arabic case where the
      // engine never declares end-of-speech on its own.
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
      stopMicAnalyser()
      setState('idle')
    }

    recognition.onend = () => {
      clearSilenceTimer()
      stopMicAnalyser()
      // Prefer isFinal text, but fall back to whatever was last shown — for
      // Arabic on Chrome that's the only text we ever get.
      const finalText = sttFinalRef.current.trim() || sttInterimRef.current.trim()
      if (finalText) {
        void submitQuestionRef.current(finalText)
      } else {
        setState('idle')
      }
    }

    try {
      recognition.start()
      recognitionRef.current = recognition
      setState('listening')
      void startMicAnalyser()
    } catch {
      setState('idle')
    }
  }, [cancelInflightAsk, language, startMicAnalyser, stopMicAnalyser, stopSpeaking])

  const onMicClick = () => {
    if (state === 'listening') {
      stopListening()
      // recognition.onend will also stopMicAnalyser, but cover the case where
      // stop() is delayed by a few hundred ms — clear the bars immediately so
      // the visual matches the user's intent.
      stopMicAnalyser()
    } else if (state === 'speaking') {
      stopSpeaking()
      setState('idle')
    } else {
      startListening()
    }
  }

  const handleEscalation = () => {
    stopSpeaking()
    setShowHint(false)
    setState('fallback')
    const localized = staffAction?.description[language] ?? text.escalation
    setAnswerText(localized)
    setAnswerKind('escalation')
    void playAnswerAudio(FALLBACK_ANSWER_ID, localized)
  }

  // Allow typed-question fallback for the rare case where mic isn't available
  const [typedQuestion, setTypedQuestion] = useState('')
  const handleTypedSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = typedQuestion.trim()
    if (!value) return
    setTypedQuestion('')
    void submitQuestion(value)
  }

  const dir = useMemo(() => (language === 'ar' ? 'rtl' : 'ltr'), [language])
  const hintLang = demoLanguages[hintLangIndex].id

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-[#020617] px-4 py-6 text-white md:px-8 md:py-10"
      dir={dir}
    >
      {/* Ambient background gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, #082f49 0%, #020617 60%, #000000 100%)',
        }}
      />

      {/* Top bar */}
      <header className="z-10 flex w-full max-w-5xl flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {demoLanguages.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLanguage(item.id)}
                className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition ${
                  item.id === language
                    ? 'border-cyan-300 bg-cyan-400/20 text-cyan-100'
                    : 'border-white/20 bg-white/5 text-white/70 hover:border-white/40 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {profile.useInternetFallback ? (
              <RotatingGlobe
                active={searchingInternet}
                title={
                  language === 'ar'
                    ? searchingInternet
                      ? 'جاري البحث على الإنترنت'
                      : 'البحث في الإنترنت مفعّل'
                    : language === 'fr'
                    ? searchingInternet
                      ? "Recherche sur Internet en cours"
                      : "Recherche internet activée"
                    : searchingInternet
                    ? 'Searching the internet'
                    : 'Internet search enabled'
                }
              />
            ) : null}
            <button
              type="button"
              onClick={handleEscalation}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-300/60 bg-amber-400/10 px-4 text-sm font-semibold text-amber-100 hover:bg-amber-400/20"
            >
              <UserRoundCheck className="size-4" />
              {text.help}
            </button>
            <Link
              href="/kiosk"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white/70 hover:bg-white/10"
            >
              Standard
            </Link>
          </div>
        </div>
        {/* Face style picker — small, dim, persists in localStorage */}
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/40">
          <span className="hidden sm:inline">Face</span>
          <div className="flex gap-1">
            {faceVariants.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleVariantChange(item.id)}
                title={item.description}
                aria-pressed={item.id === variant}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.16em] transition ${
                  item.id === variant
                    ? 'border-cyan-300 bg-cyan-400/15 text-cyan-100'
                    : 'border-white/10 bg-white/5 text-white/50 hover:border-white/30 hover:text-white/80'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Face */}
      <div className="z-10 flex flex-1 w-full max-w-2xl items-center justify-center py-8">
        <FaceOrb state={state} audioBars={audioBars} variant={variant} />
      </div>

      {/* Answer + transcript overlay */}
      <div className="z-10 mb-6 flex w-full max-w-3xl flex-col items-center gap-3" dir={dir}>
        {state === 'listening' ? (
          // Big live transcript while the visitor speaks. Fades in even before
          // the first word so visitors know the kiosk is hearing them.
          <div className="min-h-16 w-full text-center">
            {transcript ? (
              <p className="animate-[fadeIn_200ms_ease-out] text-2xl font-medium leading-snug text-white drop-shadow-[0_0_18px_rgba(34,211,238,0.45)] md:text-4xl">
                {transcript}
                <span className="ml-1 inline-block h-7 w-[3px] animate-pulse bg-cyan-300 align-middle md:h-9" aria-hidden />
              </p>
            ) : (
              <p className="animate-pulse text-lg uppercase tracking-[0.25em] text-cyan-200/70 md:text-xl">
                {text.listening}
              </p>
            )}
          </div>
        ) : transcript ? (
          // After listening ends, keep the spoken question visible (small/dim)
          // alongside the answer so the visitor can compare what was heard.
          <p className="text-sm font-medium text-cyan-200/70 md:text-base" dir={dir}>
            <span className="opacity-60">«</span> {transcript} <span className="opacity-60">»</span>
          </p>
        ) : null}

        {answerText && state !== 'listening' ? (
          <div
            className={`w-full rounded-2xl border px-6 py-5 backdrop-blur-md ${
              answerKind === 'unknown' || answerKind === 'escalation'
                ? 'border-amber-300/40 bg-amber-900/20'
                : answerKind === 'internet'
                ? 'border-violet-300/40 bg-violet-900/20'
                : 'border-cyan-300/30 bg-cyan-900/20'
            }`}
          >
            {answerKind === 'internet' ? (
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-violet-200/90" dir={dir}>
                {profile.internetFallbackPrefix[language]}
              </p>
            ) : null}
            <p className="text-center text-xl font-medium leading-relaxed md:text-2xl">
              {answerText}
            </p>
            {answerKind === 'internet' && internetSources.length > 0 ? (
              <div className="mt-4 border-t border-violet-300/20 pt-3">
                <p className="mb-1 text-center text-xs font-semibold uppercase tracking-wide text-violet-200/70" dir={dir}>
                  {language === 'ar' ? 'المصادر' : language === 'fr' ? 'Sources' : 'Sources'}
                </p>
                <ul className="space-y-1 text-center text-xs text-violet-200/80">
                  {internetSources.map((src) => (
                    <li key={src} className="break-all">
                      {src}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : !answerText && state === 'thinking' && searchingInternet ? (
          // 20-25s web-search wait — explicit caption so visitors (and the
          // operator debugging) know we haven't hung.
          <p
            className="animate-[fadeIn_400ms_ease-out] text-center text-base text-violet-200/80 md:text-lg"
            dir={dir}
          >
            {language === 'ar'
              ? 'جاري البحث على الإنترنت…'
              : language === 'fr'
              ? "Recherche sur Internet…"
              : 'Searching the internet…'}
          </p>
        ) : !answerText && state !== 'listening' && showHint ? (
          <p
            key={hintLang}
            className="animate-[fadeIn_400ms_ease-out] text-center text-base text-white/60 md:text-lg"
            dir={hintLang === 'ar' ? 'rtl' : 'ltr'}
          >
            {uiText[hintLang].holdToTalkHint}
          </p>
        ) : null}
      </div>

      {/* Mic + typed fallback */}
      <footer className="z-10 flex w-full max-w-3xl flex-col items-center gap-4">
        <button
          type="button"
          onClick={onMicClick}
          disabled={!sttSupported && state !== 'speaking'}
          aria-label={state === 'listening' ? text.stopVoice : text.holdToTalk}
          className={`group relative flex size-24 items-center justify-center rounded-full transition focus:outline-none focus:ring-4 focus:ring-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-40 md:size-28 ${
            state === 'listening'
              ? 'bg-rose-500 shadow-[0_0_60px_rgba(244,63,94,0.6)]'
              : state === 'speaking'
                ? 'bg-cyan-500 shadow-[0_0_60px_rgba(34,211,238,0.5)]'
                : 'bg-cyan-400 shadow-[0_0_50px_rgba(34,211,238,0.45)] hover:scale-105'
          }`}
        >
          {state === 'listening' ? (
            <Square className="size-10 text-white" />
          ) : state === 'speaking' ? (
            <Square className="size-10 text-white" />
          ) : (
            <Mic className="size-10 text-white" />
          )}
          {state === 'listening' ? (
            <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/50" aria-hidden />
          ) : null}
        </button>

        <p className="text-xs uppercase tracking-[0.2em] text-white/40">
          {sttSupported
            ? state === 'listening'
              ? text.listening
              : state === 'speaking'
                ? text.voiceSpeaking
                : text.holdToTalk
            : text.micUnsupported}
        </p>

        {/* Tiny typed fallback for browsers without Web Speech (Firefox/Safari) */}
        {!sttSupported ? (
          <form onSubmit={handleTypedSubmit} className="flex w-full max-w-md gap-2">
            <input
              className="min-h-12 flex-1 rounded-full border border-white/20 bg-white/10 px-4 text-base text-white outline-none placeholder:text-white/40 focus:border-cyan-300"
              type="text"
              dir={dir}
              placeholder={text.placeholder}
              value={typedQuestion}
              onChange={(event) => setTypedQuestion(event.target.value)}
            />
            <button
              type="submit"
              className="min-h-12 rounded-full bg-cyan-500 px-5 text-sm font-semibold text-white hover:bg-cyan-400"
            >
              {text.ask}
            </button>
          </form>
        ) : null}
      </footer>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Hide irrelevant React-strict-mode warning from the unused answers list */}
      <span className="sr-only">
        {answers.length} answers loaded for {profile.tenantName[language]}
      </span>
    </main>
  )
}
