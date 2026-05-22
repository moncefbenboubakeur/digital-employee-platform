import { NextRequest, NextResponse } from 'next/server'
import type { DemoLanguage } from '@/lib/digital-receptionist/demo-data'
import {
  findKnowledgeAnswer,
  isKnowledgeFallbackEnabled,
} from '@/lib/digital-receptionist/server/llm-knowledge'
import { getAdminPayload } from '@/lib/digital-receptionist/server/repository'

export const dynamic = 'force-dynamic'
// Knowledge-only is much faster than web search (~3-6s warm). 20s ceiling
// covers cold-spawn worst case.
export const maxDuration = 20

const MAX_QUESTION_CHARS = 500

/**
 * Stage one of the two-stage internet fallback. The kiosk hits this
 * BEFORE /api/llm-internet — if the model answers from training with
 * high confidence we return immediately (3-6s) and skip the 20-25s
 * web search entirely. Same enabled/answer shape as /api/llm-internet
 * so the kiosk store can treat both stages symmetrically.
 */
export async function POST(request: NextRequest) {
  if (!isKnowledgeFallbackEnabled()) {
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

  // Same tenant-level gate as /api/llm-internet — if the operator turned
  // off internet fallback we skip the fast path too.
  const payload = await getAdminPayload()
  if (!payload.profile.useInternetFallback) {
    return NextResponse.json({ enabled: false, answer: null, reason: 'tenant-disabled' })
  }

  const answer = await findKnowledgeAnswer({
    question,
    language,
    profile: payload.profile,
    signal: request.signal,
  })
  return NextResponse.json({ enabled: true, answer })
}
