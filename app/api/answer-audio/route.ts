import fs from 'node:fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import type { DemoLanguage } from '@/lib/digital-receptionist/demo-data'
import { debugLog } from '@/lib/digital-receptionist/server/debug-log'
import {
  getOrCreateAnswerAudio,
  markAnswerAudioAccessed,
} from '@/lib/digital-receptionist/server/voice-audio'

export const dynamic = 'force-dynamic'
export const maxDuration = 600

const languages = new Set<DemoLanguage>(['ar', 'fr', 'en'])

export async function GET(request: NextRequest) {
  const answerId = request.nextUrl.searchParams.get('answerId') ?? ''
  const language = request.nextUrl.searchParams.get('language') as DemoLanguage | null
  const cachedOnly = request.nextUrl.searchParams.get('cachedOnly') === '1'
  const requestedPresetId = request.nextUrl.searchParams.get('presetId')
  const startedAt = Date.now()

  debugLog('answer-audio.request', { answerId, language, cachedOnly, requestedPresetId })

  if (!answerId || !language || !languages.has(language)) {
    debugLog('answer-audio.invalid-params', { answerId, language })
    return NextResponse.json({ error: 'Missing or invalid answer audio parameters.' }, { status: 400 })
  }

  try {
    const result = await getOrCreateAnswerAudio(answerId, language, { cachedOnly })

    if (!result) {
      debugLog('answer-audio.404', {
        answerId,
        language,
        cachedOnly,
        requestedPresetId,
        elapsedMs: Date.now() - startedAt,
      })
      return NextResponse.json({ error: 'Answer audio not found.' }, { status: 404 })
    }

    const bytes = await fs.readFile(result.path)
    void markAnswerAudioAccessed(result.path)

    debugLog('answer-audio.ok', {
      answerId,
      language,
      requestedPresetId,
      servedPresetId: result.presetId,
      generated: result.generated,
      bytes: bytes.byteLength,
      elapsedMs: Date.now() - startedAt,
    })

    return new NextResponse(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'content-type': 'audio/wav',
        'content-length': String(bytes.byteLength),
        'cache-control': 'public, max-age=3600',
        'x-voice-preset-id': result.presetId,
        'x-voice-cache': result.generated ? 'generated' : 'hit',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Audio generation failed.'
    debugLog('answer-audio.error', {
      answerId,
      language,
      requestedPresetId,
      cachedOnly,
      message,
      elapsedMs: Date.now() - startedAt,
    })
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
