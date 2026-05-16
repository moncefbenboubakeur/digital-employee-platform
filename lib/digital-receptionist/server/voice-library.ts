import fs from 'node:fs/promises'
import path from 'node:path'
import {
  parseVoicePreset,
  type VoiceCatalog,
  type VoicePreset,
} from '../voice-library'
import { absoluteStoragePath } from './storage'

const emptyCatalog: VoiceCatalog = {
  generatedAt: '',
  presets: [],
}

const presetIdPattern = /^[a-z0-9._-]{1,100}$/

export function isSafeVoicePresetId(id: string) {
  return presetIdPattern.test(id)
}

export async function loadVoiceCatalog(): Promise<VoiceCatalog> {
  let raw: string

  try {
    raw = await fs.readFile(absoluteStoragePath('voice-library/catalog.json'), 'utf8')
  } catch {
    return emptyCatalog
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return emptyCatalog
  }

  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { presets?: unknown }).presets)) {
    return emptyCatalog
  }

  const generatedAt =
    typeof (parsed as { generatedAt?: unknown }).generatedAt === 'string'
      ? (parsed as { generatedAt: string }).generatedAt
      : ''
  const presets = (parsed as { presets: unknown[] }).presets.flatMap((preset) => {
    const parsedPreset = parseVoicePreset(preset)
    return parsedPreset ? [parsedPreset] : []
  })

  return { generatedAt, presets }
}

export async function findVoicePreset(id: string): Promise<VoicePreset | undefined> {
  if (!isSafeVoicePresetId(id)) {
    return undefined
  }

  const catalog = await loadVoiceCatalog()
  return catalog.presets.find((preset) => preset.id === id)
}

export function voicePreviewPath(presetId: string) {
  return absoluteStoragePath(path.posix.join('voice-library', `${presetId}.wav`))
}
