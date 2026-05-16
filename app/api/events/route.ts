import { NextRequest, NextResponse } from 'next/server'
import type { DemoLanguage } from '@/lib/digital-receptionist/demo-data'
import { recordQuestionEvent } from '@/lib/digital-receptionist/server/repository'

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    question?: string
    language?: DemoLanguage
    cacheHit?: boolean
    answerId?: string
  }

  if (!body.question || !body.language || typeof body.cacheHit !== 'boolean') {
    return NextResponse.json({ error: 'Missing event fields' }, { status: 400 })
  }

  return NextResponse.json(
    await recordQuestionEvent({
      question: body.question,
      language: body.language,
      cacheHit: body.cacheHit,
      answerId: body.answerId,
    })
  )
}
