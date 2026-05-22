import { NextRequest, NextResponse } from 'next/server'
import type { DemoLanguage } from '@/lib/digital-receptionist/demo-data'
import {
  findLlmMatch,
  isLlmMatchEnabled,
  type LlmMatchCandidate,
} from '@/lib/digital-receptionist/server/llm-match'
import {
  MATCHER_BACKEND_HEADER,
  parseRoutingChoice,
  resolveMatcherProject,
} from '@/lib/digital-receptionist/lapi-routing'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const MAX_QUESTION_CHARS = 500
const MAX_CANDIDATES = 50

function isCandidate(value: unknown): value is LlmMatchCandidate {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.id === 'string' && typeof v.canonical === 'string' && typeof v.answer === 'string'
}

export async function POST(request: NextRequest) {
  if (!isLlmMatchEnabled()) {
    return NextResponse.json({ enabled: false, matchedAnswerId: null, confidence: null })
  }

  const body = (await request.json().catch(() => ({}))) as {
    question?: unknown
    language?: unknown
    candidates?: unknown
  }

  const question = typeof body.question === 'string' ? body.question.slice(0, MAX_QUESTION_CHARS).trim() : ''
  const language = body.language as DemoLanguage
  if (!question || (language !== 'ar' && language !== 'fr' && language !== 'en')) {
    return NextResponse.json({ error: 'Missing or invalid question/language' }, { status: 400 })
  }
  const candidates = Array.isArray(body.candidates)
    ? body.candidates.filter(isCandidate).slice(0, MAX_CANDIDATES)
    : []
  if (candidates.length === 0) {
    return NextResponse.json({ enabled: true, matchedAnswerId: null, confidence: null })
  }

  const choice = parseRoutingChoice(request.headers.get(MATCHER_BACKEND_HEADER))
  const projectName = resolveMatcherProject(choice)
  const result = await findLlmMatch({ question, language, candidates, projectName })

  return NextResponse.json({
    enabled: true,
    matchedAnswerId: result?.matchedAnswerId ?? null,
    confidence: result?.confidence ?? null,
    routedTo: projectName,
  })
}
