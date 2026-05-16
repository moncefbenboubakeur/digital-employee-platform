import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/digital-receptionist/server/auth'
import type { DemoLanguage, LocalizedText } from '@/lib/digital-receptionist/demo-data'
import {
  approveUnknownQuestion,
  getAdminPayload,
  markUnknownQuestion,
  recordUnknownQuestion,
} from '@/lib/digital-receptionist/server/repository'

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

  return NextResponse.json(await recordUnknownQuestion(body.question, body.language))
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
    return NextResponse.json(
      await approveUnknownQuestion({
        candidateId: body.candidateId,
        answerText: body.answerText,
        actionId: body.actionId,
      })
    )
  }

  if (body.status === 'rejected' || body.status === 'out_of_scope') {
    return NextResponse.json(await markUnknownQuestion(body.candidateId, body.status))
  }

  return NextResponse.json({ error: 'Missing review action' }, { status: 400 })
}
