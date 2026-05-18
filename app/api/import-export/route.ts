import { NextRequest, NextResponse } from 'next/server'
import { createPilotSnapshot, parsePilotSnapshot } from '@/lib/digital-receptionist/pilot-config'
import { isAdminRequest } from '@/lib/digital-receptionist/server/auth'
import { getAdminPayload, importSnapshot, resetPilot } from '@/lib/digital-receptionist/server/repository'
import { startAudioCacheWarmJob } from '@/lib/digital-receptionist/server/voice-audio'

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getAdminPayload()

  return NextResponse.json(
    createPilotSnapshot({
      profile: payload.profile,
      answers: payload.answers,
      unknownQuestions: payload.unknownQuestions,
      events: payload.events,
    })
  )
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const raw = await request.text()
  const payload = await importSnapshot(parsePilotSnapshot(raw))
  const audioCacheJob = await startAudioCacheWarmJob({ mode: 'missing' })
  return NextResponse.json({ ...payload, audioCacheJob })
}

export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await resetPilot()
  const audioCacheJob = await startAudioCacheWarmJob({ mode: 'missing' })
  return NextResponse.json({ ...payload, audioCacheJob })
}
