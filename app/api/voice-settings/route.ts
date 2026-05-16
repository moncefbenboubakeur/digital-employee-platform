import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/digital-receptionist/server/auth'
import { getKioskPayload, saveVoiceSettings } from '@/lib/digital-receptionist/server/repository'
import { normalizeVoiceSettings } from '@/lib/digital-receptionist/voice-library'

export async function GET() {
  const payload = await getKioskPayload()
  return NextResponse.json({ voiceSettings: payload.voiceSettings })
}

export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as { voiceSettings?: unknown }
  return NextResponse.json(await saveVoiceSettings(normalizeVoiceSettings(body.voiceSettings)))
}
