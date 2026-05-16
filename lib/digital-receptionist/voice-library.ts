import type { DemoLanguage } from './demo-data'

export type VoiceEngine = 'say' | 'xtts'
export type VoiceGender = 'male' | 'female'

export type VoicePreset = {
  id: string
  engine: VoiceEngine
  voiceId: string
  displayName: string
  language: DemoLanguage
  gender: VoiceGender
  previewPath: string
}

export type VoiceCatalog = {
  generatedAt: string
  presets: VoicePreset[]
}

export type VoiceSettings = Record<DemoLanguage, string | null>

export const defaultVoiceSettings: VoiceSettings = {
  ar: 'xtts.nova_hogarth.ar',
  fr: 'xtts.nova_hogarth.fr',
  en: 'xtts.nova_hogarth.en',
}

const languages = new Set<DemoLanguage>(['ar', 'fr', 'en'])
const engines = new Set<VoiceEngine>(['say', 'xtts'])
const genders = new Set<VoiceGender>(['male', 'female'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function parseVoicePreset(value: unknown): VoicePreset | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const id = typeof value.id === 'string' ? value.id : ''
  const engine = typeof value.engine === 'string' ? value.engine : ''
  const voiceId = typeof value.voiceId === 'string' ? value.voiceId : ''
  const displayName = typeof value.displayName === 'string' ? value.displayName : ''
  const language = typeof value.language === 'string' ? value.language : ''
  const gender = typeof value.gender === 'string' ? value.gender : ''
  const previewPath = typeof value.previewPath === 'string' ? value.previewPath : ''

  if (
    !id ||
    !engines.has(engine as VoiceEngine) ||
    !voiceId ||
    !displayName ||
    !languages.has(language as DemoLanguage) ||
    !genders.has(gender as VoiceGender) ||
    !previewPath
  ) {
    return undefined
  }

  return {
    id,
    engine: engine as VoiceEngine,
    voiceId,
    displayName,
    language: language as DemoLanguage,
    gender: gender as VoiceGender,
    previewPath,
  }
}

export function normalizeVoiceSettings(value: unknown): VoiceSettings {
  const source = isRecord(value) ? value : {}

  return {
    ar: typeof source.ar === 'string' && source.ar ? source.ar : defaultVoiceSettings.ar,
    fr: typeof source.fr === 'string' && source.fr ? source.fr : defaultVoiceSettings.fr,
    en: typeof source.en === 'string' && source.en ? source.en : defaultVoiceSettings.en,
  }
}

export function voiceLabel(preset: VoicePreset) {
  const engine = preset.engine === 'xtts' ? 'XTTS' : 'macOS'
  return `${preset.displayName} (${preset.language.toUpperCase()}, ${preset.gender}, ${engine})`
}
