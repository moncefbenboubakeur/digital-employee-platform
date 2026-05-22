import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/digital-receptionist/server/auth'
import type { DemoLanguage, LocalizedText } from '@/lib/digital-receptionist/demo-data'
import {
  approveUnknownQuestion,
  getAdminPayload,
  markUnknownQuestion,
  recordUnknownQuestion,
} from '@/lib/digital-receptionist/server/repository'
import { startAudioCacheWarmJob } from '@/lib/digital-receptionist/server/voice-audio'
import {
  DRAFTER_BACKEND_HEADER,
  parseDrafterChoice,
  resolveDrafterProject,
} from '@/lib/digital-receptionist/lapi-routing'

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json(await getAdminPayload())
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    question?: string
    language?: DemoLanguage
  }

  if (!body.question || !body.language) {
    return NextResponse.json({ error: 'Missing question or language' }, { status: 400 })
  }

  const drafterChoice = parseDrafterChoice(request.headers.get(DRAFTER_BACKEND_HEADER))
  // resolveDrafterProject returns null for the 'none' choice — repository
  // skips draft generation in that case.
  const drafterProject = resolveDrafterProject(drafterChoice)
  return NextResponse.json(
    await recordUnknownQuestion(body.question, body.language, drafterProject),
  )
}

export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as {
    candidateId?: string
    status?: 'rejected' | 'out_of_scope'
    answerText?: LocalizedText
    actionId?: string
  }

  if (!body.candidateId) {
    return NextResponse.json({ error: 'Missing candidate id' }, { status: 400 })
  }

  if (body.answerText) {
    const payload = await approveUnknownQuestion({
      candidateId: body.candidateId,
      answerText: body.answerText,
      actionId: body.actionId,
    })
    const audioCacheJob = await startAudioCacheWarmJob({ mode: 'missing' })

    return NextResponse.json({ ...payload, audioCacheJob })
  }

  if (body.status === 'rejected' || body.status === 'out_of_scope') {
    return NextResponse.json(await markUnknownQuestion(body.candidateId, body.status))
  }

  return NextResponse.json({ error: 'Missing review action' }, { status: 400 })
}
