'use client'

import { Bot, Loader2, MessageCircle, Sparkles, UserRoundCheck } from 'lucide-react'

export type LiteAvatarState = 'idle' | 'thinking' | 'speaking' | 'fallback'

const stateCopy = {
  idle: {
    label: 'Ready',
    icon: Bot,
    ring: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    glow: 'bg-emerald-300',
  },
  thinking: {
    label: 'Thinking',
    icon: Loader2,
    ring: 'border-amber-300 bg-amber-50 text-amber-900',
    glow: 'bg-amber-300',
  },
  speaking: {
    label: 'Speaking',
    icon: MessageCircle,
    ring: 'border-cyan-300 bg-cyan-50 text-cyan-900',
    glow: 'bg-cyan-300',
  },
  fallback: {
    label: 'Staff ready',
    icon: UserRoundCheck,
    ring: 'border-orange-300 bg-orange-50 text-orange-900',
    glow: 'bg-orange-300',
  },
}

export function LiteAvatar({ state }: { state: LiteAvatarState }) {
  const Icon = stateCopy[state].icon
  const isThinking = state === 'thinking'
  const isSpeaking = state === 'speaking'

  return (
    <section className="flex min-h-[360px] flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Amel</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">Digital Receptionist</h2>
        </div>
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${stateCopy[state].ring}`}
        >
          <Icon className={`size-4 ${isThinking ? 'animate-spin' : ''}`} />
          {stateCopy[state].label}
        </div>
      </div>

      <div className="relative mx-auto flex size-64 items-center justify-center">
        <div
          className={`absolute inset-5 rounded-full opacity-20 blur-2xl ${stateCopy[state].glow} ${
            isThinking ? 'animate-pulse' : ''
          }`}
        />
        <div className="relative flex size-52 items-center justify-center rounded-full border border-slate-200 bg-gradient-to-b from-white to-slate-100 shadow-inner">
          <div className="absolute top-8 size-24 rounded-full bg-gradient-to-b from-cyan-100 to-emerald-100" />
          <div className="relative mt-2 flex size-36 flex-col items-center justify-center rounded-full border border-slate-200 bg-[#ffe7d1] shadow-sm">
            <div className="absolute -top-6 h-14 w-32 rounded-t-full bg-slate-900" />
            <div className="absolute top-10 flex w-20 justify-between">
              <span className="block size-3 rounded-full bg-slate-900" />
              <span className="block size-3 rounded-full bg-slate-900" />
            </div>
            <div className="absolute top-16 h-2 w-7 rounded-full bg-[#e8b89c]" />
            <div
              className={`absolute top-[5.4rem] rounded-full transition-all duration-200 ${
                isSpeaking ? 'h-5 w-10 animate-pulse' : 'h-2 w-9'
              } ${state === 'fallback' ? 'bg-orange-500' : 'bg-[#b4533a]'}`}
            />
          </div>
          <div className="absolute bottom-6 h-16 w-36 rounded-t-full bg-cyan-700" />
          {isThinking ? (
            <Sparkles className="absolute right-9 top-10 size-7 animate-pulse text-amber-500" />
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs font-medium text-slate-600">
        <div className="rounded-md bg-slate-100 px-2 py-2">Arabic</div>
        <div className="rounded-md bg-slate-100 px-2 py-2">Francais</div>
        <div className="rounded-md bg-slate-100 px-2 py-2">English</div>
      </div>
    </section>
  )
}
