import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/digital-receptionist/server/auth'
import { debugLog } from '@/lib/digital-receptionist/server/debug-log'
import {
  getKioskPayload,
  saveProfile,
  type KioskPayload,
} from '@/lib/digital-receptionist/server/repository'
import {
  FALLBACK_ANSWER_ID,
  getAudioCacheWarmJob,
  startAudioCacheWarmJob,
} from '@/lib/digital-receptionist/server/voice-audio'

const languages = ['ar', 'fr', 'en'] as const

function hasMissingSelectedAudio(payload: KioskPayload) {
  const cachedAudioKeys = new Set(
    payload.cachedAudio.map((entry) => `${entry.answerId}|${entry.language}|${entry.presetId}`)
  )

  const approvedMissing = payload.answers.some((answer) =>
    languages.some((language) => {
      const text = answer.answerText[language]?.trim()
      const presetId = payload.voiceSettings[language]

      return Boolean(text && presetId && !cachedAudioKeys.has(`${answer.id}|${language}|${presetId}`))
    })
  )

  if (approvedMissing) {
    return true
  }

  // Fallback ("I don't have an approved answer yet…") is also part of the warm
  // set — without it, an unknown question plays in the browser default voice
  // instead of the selected xtts voice.
  const fallbackMissing = languages.some((language) => {
    const text = payload.profile.fallbackResponse[language]?.trim()
    const presetId = payload.voiceSettings[language]
    return Boolean(text && presetId && !cachedAudioKeys.has(`${FALLBACK_ANSWER_ID}|${language}|${presetId}`))
  })

  return fallbackMissing
}

export async function GET() {
  const payload = await getKioskPayload()
  const warmJob = getAudioCacheWarmJob()
  const missing = hasMissingSelectedAudio(payload)

  if (missing && !warmJob) {
    debugLog('pilot.auto-warm-start', {
      voiceSettings: payload.voiceSettings,
      cachedAudioCount: payload.cachedAudio.length,
    })
    void startAudioCacheWarmJob({ mode: 'missing' })
  }

  debugLog('pilot.payload', {
    voiceSettings: payload.voiceSettings,
    cachedAudioCount: payload.cachedAudio.length,
    cachedAudioSample: payload.cachedAudio.slice(0, 6),
    missingSelectedAudio: missing,
    warmJobStatus: warmJob?.status,
    warmJobProgress: warmJob ? `${warmJob.completed}/${warmJob.total}` : undefined,
    warmJobCurrent: warmJob?.current,
  })

  return NextResponse.json(payload)
}

export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as { profile?: unknown }
  const payload = await saveProfile(body.profile as never)

  // Profile saves can change the fallback response text — the file's hash key
  // changes when the text changes, so any cached fallback for the OLD text is
  // now stale. Kick off a warm so the new text gets pre-baked.
  const audioCacheJob = await startAudioCacheWarmJob({ mode: 'missing' })

  return NextResponse.json({ ...payload, audioCacheJob })
}
