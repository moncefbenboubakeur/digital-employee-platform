import { NextRequest, NextResponse } from 'next/server'
import type { DemoLanguage } from '@/lib/digital-receptionist/demo-data'
import {
  findInternetAnswer,
  isInternetFallbackEnabled,
} from '@/lib/digital-receptionist/server/llm-internet'
import { getAdminPayload } from '@/lib/digital-receptionist/server/repository'

export const dynamic = 'force-dynamic'
// Web search via LAPI takes ~25s warm; allow up to 60s so the route doesn't
// time out before the model returns its answer.
export const maxDuration = 60

const MAX_QUESTION_CHARS = 500

export async function POST(request: NextRequest) {
  if (!isInternetFallbackEnabled()) {
    return NextResponse.json({ enabled: false, answer: null })
  }

  const body = (await request.json().catch(() => ({}))) as {
    question?: unknown
    language?: unknown
  }
  const question =
    typeof body.question === 'string' ? body.question.slice(0, MAX_QUESTION_CHARS).trim() : ''
  const language = body.language as DemoLanguage
  if (!question || (language !== 'ar' && language !== 'fr' && language !== 'en')) {
    return NextResponse.json({ error: 'Missing or invalid question/language' }, { status: 400 })
  }

  // Read the current profile to feed tenant context into the system prompt.
  const payload = await getAdminPayload()
  // Operator must have explicitly enabled the per-tenant toggle. The env
  // flag (DR_LLM_INTERNET) gates the whole feature globally — both checks
  // must pass for a call to go out.
  if (!payload.profile.useInternetFallback) {
    return NextResponse.json({ enabled: false, answer: null, reason: 'tenant-disabled' })
  }

  const answer = await findInternetAnswer({
    question,
    language,
    profile: payload.profile,
  })
  return NextResponse.json({ enabled: true, answer })
}
