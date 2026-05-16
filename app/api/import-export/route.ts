import { NextRequest, NextResponse } from 'next/server'
import { createPilotSnapshot, parsePilotSnapshot } from '@/lib/digital-receptionist/pilot-config'
import { isAdminRequest } from '@/lib/digital-receptionist/server/auth'
import { getAdminPayload, importSnapshot, resetPilot } from '@/lib/digital-receptionist/server/repository'

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
  return NextResponse.json(await importSnapshot(parsePilotSnapshot(raw)))
}

export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json(await resetPilot())
}
