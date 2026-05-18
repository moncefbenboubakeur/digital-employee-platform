import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/digital-receptionist/server/auth'
import { debugLog } from '@/lib/digital-receptionist/server/debug-log'
import { getKioskPayload, saveVoiceSettings } from '@/lib/digital-receptionist/server/repository'
import { startAudioCacheWarmJob } from '@/lib/digital-receptionist/server/voice-audio'
import { normalizeVoiceSettings } from '@/lib/digital-receptionist/voice-library'
import type { DemoLanguage } from '@/lib/digital-receptionist/demo-data'

const languages: DemoLanguage[] = ['ar', 'fr', 'en']

export async function GET() {
  const payload = await getKioskPayload()
  return NextResponse.json({ voiceSettings: payload.voiceSettings })
}

export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as { voiceSettings?: unknown }
  const previousPayload = await getKioskPayload()
  const nextVoiceSettings = normalizeVoiceSettings(body.voiceSettings)
  const payload = await saveVoiceSettings(nextVoiceSettings)
  const changedLanguages = languages.filter(
    (language) => previousPayload.voiceSettings[language] !== payload.voiceSettings[language]
  )

  debugLog('voice-settings.saved', {
    previous: previousPayload.voiceSettings,
    next: payload.voiceSettings,
    changedLanguages,
  })

  const audioCacheJob = changedLanguages.length
    ? await startAudioCacheWarmJob({ mode: 'regenerate', languages: changedLanguages })
    : undefined

  if (audioCacheJob) {
    debugLog('voice-settings.warm-job-started', {
      id: audioCacheJob.id,
      mode: audioCacheJob.mode,
      languages: audioCacheJob.languages,
      total: audioCacheJob.total,
    })
  }

  return NextResponse.json({ ...payload, audioCacheJob })
}
