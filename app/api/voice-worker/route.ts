import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/digital-receptionist/server/auth'
import {
  getVoiceWorkerStatus,
  startVoiceWorker,
  stopVoiceWorker,
} from '@/lib/digital-receptionist/server/voice-worker'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json(getVoiceWorkerStatus())
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { action?: unknown }
  const action = typeof body.action === 'string' ? body.action : ''

  if (action === 'start') {
    return NextResponse.json(await startVoiceWorker())
  }

  if (action === 'stop') {
    return NextResponse.json(await stopVoiceWorker())
  }

  return NextResponse.json({ error: 'Unknown action. Use start or stop.' }, { status: 400 })
}
