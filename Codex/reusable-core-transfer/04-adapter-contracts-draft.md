# Adapter Contracts Draft

These are draft contracts for the new startup repo. They are inspired by AlgeriaTechGen's `VoiceAdapter`, `AvatarAdapter`, and `Renderer`, but adapted for live digital employees.

## Common Types

```ts
export type LanguageCode = 'ar' | 'fr' | 'en'

export type ProviderCost = {
  amount: number
  currency: 'USD' | 'DZD'
  unit: 'request' | 'minute' | 'character' | 'token'
}

export type ProviderLatency = {
  startedAt: string
  completedAt: string
  durationMs: number
}

export type ProviderResultMeta = {
  provider: string
  model?: string
  cost?: ProviderCost
  latency: ProviderLatency
  rawProviderId?: string
}
```

## Speech To Text

```ts
export type SpeechToTextInput = {
  audioPath?: string
  audioBuffer?: ArrayBuffer
  languageHint?: LanguageCode
}

export type SpeechToTextOutput = {
  text: string
  language: LanguageCode
  confidence: number
  meta: ProviderResultMeta
}

export interface SpeechToTextAdapter {
  transcribe(input: SpeechToTextInput): Promise<SpeechToTextOutput>
}
```

## Knowledge Answering

```ts
export type AnswerRequest = {
  tenantId: string
  locationId: string
  question: string
  language: LanguageCode
  channel: 'kiosk' | 'admin-test' | 'web'
}

export type AnswerSource = {
  sourceId: string
  title: string
  excerpt?: string
}

export type AnswerOutput = {
  answerText: string
  language: LanguageCode
  confidence: number
  sources: AnswerSource[]
  safety: {
    allowed: boolean
    reason?: string
    escalationRequired?: boolean
  }
  meta: ProviderResultMeta
}

export interface KnowledgeAnswerAdapter {
  answer(input: AnswerRequest): Promise<AnswerOutput>
}
```

## Text To Speech

```ts
export type TextToSpeechInput = {
  text: string
  language: LanguageCode
  voiceProfileId: string
  outputDir: string
}

export type TextToSpeechOutput = {
  audioPath: string
  durationSeconds: number
  meta: ProviderResultMeta
}

export interface TextToSpeechAdapter {
  synthesize(input: TextToSpeechInput): Promise<TextToSpeechOutput>
}
```

## Avatar

```ts
export type AvatarQuality = 'static' | 'lite_2d' | 'premium_cached' | 'premium_live'

export type AvatarInput = {
  tenantId: string
  locationId: string
  answerId?: string
  text: string
  language: LanguageCode
  audioPath: string
  avatarProfileId: string
  quality: AvatarQuality
  outputDir: string
}

export type AvatarOutput = {
  mediaType: 'none' | 'animation_json' | 'mp4' | 'stream_url'
  mediaPath?: string
  streamUrl?: string
  durationSeconds?: number
  meta: ProviderResultMeta
}

export interface AvatarAdapter {
  generate(input: AvatarInput): Promise<AvatarOutput>
}
```

## Cache

```ts
export type CacheLookupInput = {
  tenantId: string
  locationId: string
  question: string
  language: LanguageCode
}

export type CacheLookupOutput = {
  hit: boolean
  answerId?: string
  answerText?: string
  confidence?: number
  cachedMedia?: {
    audioPath?: string
    liteAnimationPath?: string
    premiumVideoPath?: string
  }
}

export interface AnswerCacheAdapter {
  lookup(input: CacheLookupInput): Promise<CacheLookupOutput>
  storeCandidate(input: {
    tenantId: string
    locationId: string
    question: string
    language: LanguageCode
    answerText: string
    confidence: number
    sourceIds: string[]
  }): Promise<{ candidateAnswerId: string }>
}
```

## Budget Policy

```ts
export type AvatarPolicyDecision = {
  quality: AvatarQuality
  reason:
    | 'customer_full_premium'
    | 'budget_available'
    | 'cached_premium_available'
    | 'budget_exhausted'
    | 'low_confidence'
    | 'new_question'
    | 'lite_plan'
}

export interface BudgetPolicyEngine {
  decideAvatarQuality(input: {
    tenantId: string
    locationId: string
    answerKnown: boolean
    answerConfidence: number
    estimatedPremiumCostUsd: number
  }): Promise<AvatarPolicyDecision>
}
```

## Provider Registry

```ts
export type ProviderRegistry = {
  stt: Record<string, SpeechToTextAdapter>
  knowledge: Record<string, KnowledgeAnswerAdapter>
  tts: Record<string, TextToSpeechAdapter>
  avatar: Record<string, AvatarAdapter>
  cache: AnswerCacheAdapter
  budget: BudgetPolicyEngine
}
```

## Key Design Rule

The live kiosk should always have a fast fallback:

```txt
premium_live fails -> lite_2d
lite_2d fails -> audio + subtitles
audio fails -> text + QR
knowledge answer fails -> safe escalation answer
```

That fallback chain is more important than any single provider integration.
