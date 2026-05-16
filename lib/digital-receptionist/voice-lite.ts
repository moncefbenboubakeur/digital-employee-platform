import type { DemoLanguage } from './demo-data'

export type VoiceCandidate = {
  default?: boolean
  lang: string
  localService?: boolean
  name: string
}

const languagePreferences: Record<DemoLanguage, string[]> = {
  ar: ['ar-DZ', 'ar', 'ar-SA', 'ar-EG'],
  fr: ['fr-DZ', 'fr-FR', 'fr'],
  en: ['en-US', 'en-GB', 'en'],
}

export function speechLangForLanguage(language: DemoLanguage) {
  return languagePreferences[language][0]
}

function baseLanguage(lang: string) {
  return lang.toLocaleLowerCase().split('-')[0]
}

export function scoreVoiceForLanguage(voice: VoiceCandidate, language: DemoLanguage) {
  const preferred = languagePreferences[language].map((lang) => lang.toLocaleLowerCase())
  const voiceLang = voice.lang.toLocaleLowerCase()
  const exactIndex = preferred.indexOf(voiceLang)

  if (exactIndex >= 0) {
    return 100 - exactIndex * 5 + (voice.localService ? 2 : 0) + (voice.default ? 1 : 0)
  }

  const baseMatch = preferred.findIndex((lang) => baseLanguage(lang) === baseLanguage(voiceLang))

  if (baseMatch >= 0) {
    return 70 - baseMatch * 5 + (voice.localService ? 2 : 0) + (voice.default ? 1 : 0)
  }

  return voice.default ? 1 : 0
}

export function chooseVoiceForLanguage<TVoice extends VoiceCandidate>(
  voices: TVoice[],
  language: DemoLanguage
) {
  const scored = voices
    .map((voice) => ({
      voice,
      score: scoreVoiceForLanguage(voice, language),
    }))
    .sort((a, b) => b.score - a.score)

  return scored[0]?.score ? scored[0].voice : undefined
}
