import { NextRequest, NextResponse } from 'next/server'
import type { DemoLanguage } from '@/lib/digital-receptionist/demo-data'
import { isAdminRequest } from '@/lib/digital-receptionist/server/auth'
import {
  getAnswerAudioCacheStatus,
  getAudioCacheWarmJob,
  purgeUnusedAnswerAudio,
  startAudioCacheWarmJob,
  type AudioCacheWarmMode,
} from '@/lib/digital-receptionist/server/voice-audio'

export const dynamic = 'force-dynamic'
export const maxDuration = 600

const languages = new Set<DemoLanguage>(['ar', 'fr', 'en'])
const modes = new Set<AudioCacheWarmMode>(['missing', 'regenerate'])

function parseLanguages(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined
  }

  const parsed = value.filter((item): item is DemoLanguage => {
    return typeof item === 'string' && languages.has(item as DemoLanguage)
  })

  return parsed.length > 0 ? parsed : undefined
}

function parseStaleAfterDays(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 2
  }

  return Math.min(parsed, 30)
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const staleAfterDays = parseStaleAfterDays(request.nextUrl.searchParams.get('staleAfterDays'))

  return NextResponse.json({
    cache: await getAnswerAudioCacheStatus(staleAfterDays),
    job: getAudioCacheWarmJob(),
  })
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as {
    mode?: unknown
    languages?: unknown
  }
  const mode = typeof body.mode === 'string' && modes.has(body.mode as AudioCacheWarmMode)
    ? body.mode as AudioCacheWarmMode
    : 'missing'
  const job = await startAudioCacheWarmJob({
    mode,
    languages: parseLanguages(body.languages),
  })

  return NextResponse.json({
    cache: await getAnswerAudioCacheStatus(),
    job,
  })
}

export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const staleAfterDays = parseStaleAfterDays(request.nextUrl.searchParams.get('staleAfterDays'))

  return NextResponse.json({
    cleanup: await purgeUnusedAnswerAudio(staleAfterDays),
    cache: await getAnswerAudioCacheStatus(staleAfterDays),
    job: getAudioCacheWarmJob(),
  })
}
