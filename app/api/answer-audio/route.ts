import fs from 'node:fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import type { DemoLanguage } from '@/lib/digital-receptionist/demo-data'
import { getOrCreateAnswerAudio } from '@/lib/digital-receptionist/server/voice-audio'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const languages = new Set<DemoLanguage>(['ar', 'fr', 'en'])

export async function GET(request: NextRequest) {
  const answerId = request.nextUrl.searchParams.get('answerId') ?? ''
  const language = request.nextUrl.searchParams.get('language') as DemoLanguage | null

  if (!answerId || !language || !languages.has(language)) {
    return NextResponse.json({ error: 'Missing or invalid answer audio parameters.' }, { status: 400 })
  }

  try {
    const result = await getOrCreateAnswerAudio(answerId, language)

    if (!result) {
      return NextResponse.json({ error: 'Answer audio not found.' }, { status: 404 })
    }

    const bytes = await fs.readFile(result.path)

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
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
