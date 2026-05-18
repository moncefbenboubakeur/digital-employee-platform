import { NextRequest, NextResponse } from 'next/server'
import { pilotScenarioSummaries } from '@/lib/digital-receptionist/pilot-scenarios'
import { isAdminRequest } from '@/lib/digital-receptionist/server/auth'
import { applyPilotScenario } from '@/lib/digital-receptionist/server/repository'
import { startAudioCacheWarmJob } from '@/lib/digital-receptionist/server/voice-audio'

export async function GET() {
  return NextResponse.json({ scenarios: pilotScenarioSummaries })
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as { scenarioId?: string }

  if (!body.scenarioId) {
    return NextResponse.json({ error: 'Missing scenario id' }, { status: 400 })
  }

  try {
    const payload = await applyPilotScenario(body.scenarioId)
    const audioCacheJob = await startAudioCacheWarmJob({ mode: 'missing' })
    return NextResponse.json({ ...payload, audioCacheJob })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to apply scenario'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
