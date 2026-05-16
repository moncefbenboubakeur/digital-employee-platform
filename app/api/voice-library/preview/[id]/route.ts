import fs from 'node:fs/promises'
import { NextResponse } from 'next/server'
import {
  findVoicePreset,
  isSafeVoicePresetId,
  voicePreviewPath,
} from '@/lib/digital-receptionist/server/voice-library'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!isSafeVoicePresetId(id) || !(await findVoicePreset(id))) {
    return new NextResponse('Not found', { status: 404 })
  }

  let bytes: Buffer
  try {
    bytes = await fs.readFile(voicePreviewPath(id))
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }

  return new NextResponse(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      'content-type': 'audio/wav',
      'content-length': String(bytes.byteLength),
      'cache-control': 'public, max-age=3600, immutable',
    },
  })
}
