import type {
  Answer,
  Counter,
  KioskDevice,
  Location,
  QuestionEvent,
  UnknownQuestion,
  VisitorAction,
} from '@prisma/client'
import {
  demoActions,
  initialDemoAnswers,
  initialUnknownQuestions,
  pilotProfile,
  type DemoAction,
  type DemoAnswer,
  type DemoLanguage,
  type LocalizedText,
  type PilotProfile,
  type UnknownQuestion as UiUnknownQuestion,
  type QuestionEvent as UiQuestionEvent,
} from '../demo-data'
import {
  normalizeAnswers,
  normalizeLocalizedText,
  normalizePilotProfile,
  normalizeQuestionEvents,
  normalizeUnknownQuestions,
  type PilotSnapshot,
} from '../pilot-config'
import { getPilotScenario } from '../pilot-scenarios'
import { createQuestionEvent, createUnknownQuestion, promoteCandidateToAnswer } from '../prototype-logic'
import {
  defaultVoiceSettings,
  normalizeVoiceSettings,
  type VoiceSettings,
} from '../voice-library'
import { listCachedAnswerAudio, type CachedAnswerAudioRef } from './answer-audio-manifest'
import { setAdminPassword } from './auth'
import { defaultLocationId, prisma } from './db'
import { generateAndStoreDraft, isLlmDraftsEnabled, loadDraft } from './llm-drafts'

export type KioskDeviceStatus = 'online' | 'stale' | 'offline'

export type KioskDeviceUi = {
  id: string
  label: string
  status: KioskDeviceStatus
  userAgent?: string
  heartbeatCount: number
  lastSeenAt?: string
  updatedAt: string
}

export type PilotAnalytics = {
  totalEvents: number
  cacheHitRate: number
  unknownCount: number
  activeUnknownCount: number
  languageSplit: Record<DemoLanguage, number>
  topQuestions: Array<{ question: string; count: number; cacheHit: boolean }>
  topAnswers: Array<{ answerId: string; question: LocalizedText; usageCount: number }>
  dailySummary: Array<{ date: string; total: number; cacheHits: number; unknowns: number }>
}

export type KioskPayload = {
  profile: PilotProfile
  actions: DemoAction[]
  answers: DemoAnswer[]
  voiceSettings: VoiceSettings
  cachedAudio: CachedAnswerAudioRef[]
}

export type AdminPayload = KioskPayload & {
  unknownQuestions: UiUnknownQuestion[]
  events: UiQuestionEvent[]
  devices: KioskDeviceUi[]
  analytics: PilotAnalytics
  auditLogs: Array<{
    id: string
    actor: string
    action: string
    entityType: string
    entityId: string
    summary: string
    createdAt: string
  }>
}

function toJson(value: unknown) {
  return JSON.stringify(value)
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return undefined
  }
}

function locationToProfile(location: Location, counters: Counter[]): PilotProfile {
  return normalizePilotProfile({
    tenantName: parseJson(location.tenantNameJson),
    locationName: parseJson(location.locationNameJson),
    welcomeTitle: parseJson(location.welcomeTitleJson),
    serviceSummary: parseJson(location.serviceSummaryJson),
    privacyNote: parseJson(location.privacyNoteJson),
    openingHours: parseJson(location.openingHoursJson),
    contactNumber: location.contactNumber,
    defaultLanguage: location.defaultLanguage,
    currentWait: parseJson(location.currentWaitJson),
    liveStatus: parseJson(location.liveStatusJson),
    fallbackResponse: parseJson(location.fallbackResponseJson),
    useInternetFallback: location.useInternetFallback,
    internetFallbackPrefix: parseJson(location.internetFallbackPrefixJson),
    counters: counters
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((counter) => ({
        id: counter.id,
        label: normalizeLocalizedText(parseJson(counter.labelJson), pilotProfile.counters[0]?.label),
        status: normalizeLocalizedText(parseJson(counter.statusJson), pilotProfile.counters[0]?.status),
      })),
  })
}

function actionToUi(action: VisitorAction): DemoAction {
  return {
    id: action.id,
    type: action.type as DemoAction['type'],
    label: normalizeLocalizedText(parseJson(action.labelJson), demoActions[0].label),
    description: normalizeLocalizedText(parseJson(action.descriptionJson), demoActions[0].description),
    value: action.value,
  }
}

function answerToUi(answer: Answer): DemoAnswer {
  return normalizeAnswers([
    {
      id: answer.id,
      canonicalQuestion: parseJson(answer.canonicalQuestionJson),
      answerText: parseJson(answer.answerTextJson),
      keywords: parseJson(answer.keywordsJson),
      actionId: answer.actionId ?? undefined,
      usageCount: answer.usageCount,
      lastUpdated: answer.lastUpdated,
      category: answer.category,
      published: answer.published,
    },
  ])[0]
}

function unknownToUi(question: UnknownQuestion): UiUnknownQuestion {
  return normalizeUnknownQuestions([
    {
      id: question.id,
      question: question.question,
      language: question.language,
      fallbackResponse: parseJson(question.fallbackResponseJson),
      count: question.count,
      confidence: question.confidence,
      status: question.status,
      createdAt: question.createdAt.toISOString(),
    },
  ])[0]
}

function eventToUi(event: QuestionEvent): UiQuestionEvent {
  return normalizeQuestionEvents([
    {
      id: event.id,
      question: event.question,
      language: event.language,
      cacheHit: event.cacheHit,
      answerId: event.answerId ?? undefined,
      createdAt: event.createdAt.toISOString(),
    },
  ])[0]
}

function deviceStatus(device: KioskDevice): KioskDeviceStatus {
  if (!device.lastSeenAt) {
    return 'offline'
  }

  const ageMs = Date.now() - device.lastSeenAt.getTime()

  if (ageMs < 1000 * 60) {
    return 'online'
  }

  if (ageMs < 1000 * 60 * 5) {
    return 'stale'
  }

  return 'offline'
}

function deviceToUi(device: KioskDevice): KioskDeviceUi {
  return {
    id: device.id,
    label: device.label,
    status: deviceStatus(device),
    userAgent: device.userAgent ?? undefined,
    heartbeatCount: device.heartbeatCount,
    lastSeenAt: device.lastSeenAt?.toISOString(),
    updatedAt: device.updatedAt.toISOString(),
  }
}

function createAnalytics(input: {
  answers: DemoAnswer[]
  unknownQuestions: UiUnknownQuestion[]
  events: UiQuestionEvent[]
}): PilotAnalytics {
  const languageSplit = input.events.reduce(
    (acc, event) => {
      acc[event.language] += 1
      return acc
    },
    { ar: 0, fr: 0, en: 0 } satisfies Record<DemoLanguage, number>
  )
  const topQuestionMap = new Map<string, { question: string; count: number; cacheHit: boolean }>()
  const dailyMap = new Map<string, { date: string; total: number; cacheHits: number; unknowns: number }>()

  input.events.forEach((event) => {
    const key = event.question.toLocaleLowerCase().trim()
    const questionEntry = topQuestionMap.get(key) ?? {
      question: event.question,
      count: 0,
      cacheHit: event.cacheHit,
    }
    questionEntry.count += 1
    questionEntry.cacheHit = questionEntry.cacheHit || event.cacheHit
    topQuestionMap.set(key, questionEntry)

    const date = event.createdAt.slice(0, 10)
    const day = dailyMap.get(date) ?? { date, total: 0, cacheHits: 0, unknowns: 0 }
    day.total += 1
    if (event.cacheHit) {
      day.cacheHits += 1
    } else {
      day.unknowns += 1
    }
    dailyMap.set(date, day)
  })

  const totalEvents = input.events.length
  const cacheHits = input.events.filter((event) => event.cacheHit).length

  return {
    totalEvents,
    cacheHitRate: totalEvents === 0 ? 100 : Math.round((cacheHits / totalEvents) * 100),
    unknownCount: input.unknownQuestions.length,
    activeUnknownCount: input.unknownQuestions.filter((question) => question.status === 'new').length,
    languageSplit,
    topQuestions: Array.from(topQuestionMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    topAnswers: input.answers
      .slice()
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 8)
      .map((answer) => ({
        answerId: answer.id,
        question: answer.canonicalQuestion,
        usageCount: answer.usageCount,
      })),
    dailySummary: Array.from(dailyMap.values())
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 14),
  }
}

export async function ensureDefaultPilot() {
  const existing = await prisma.location.findUnique({ where: { id: defaultLocationId } })

  if (existing) {
    return
  }

  await prisma.tenant.create({
    data: {
      id: 'tenant-demo-apc',
      name: pilotProfile.tenantName.fr,
      locations: {
        create: {
          id: defaultLocationId,
          tenantNameJson: toJson(pilotProfile.tenantName),
          locationNameJson: toJson(pilotProfile.locationName),
          welcomeTitleJson: toJson(pilotProfile.welcomeTitle),
          serviceSummaryJson: toJson(pilotProfile.serviceSummary),
          privacyNoteJson: toJson(pilotProfile.privacyNote),
          openingHoursJson: toJson(pilotProfile.openingHours),
          contactNumber: pilotProfile.contactNumber,
          defaultLanguage: pilotProfile.defaultLanguage,
          currentWaitJson: toJson(pilotProfile.currentWait),
          liveStatusJson: toJson(pilotProfile.liveStatus),
          fallbackResponseJson: toJson(pilotProfile.fallbackResponse),
          useInternetFallback: pilotProfile.useInternetFallback,
          internetFallbackPrefixJson: toJson(pilotProfile.internetFallbackPrefix),
          voiceSettingsJson: toJson(defaultVoiceSettings),
          counters: {
            create: pilotProfile.counters.map((counter, index) => ({
              id: counter.id,
              labelJson: toJson(counter.label),
              statusJson: toJson(counter.status),
              sortOrder: index,
            })),
          },
          actions: {
            create: demoActions.map((action) => ({
              id: action.id,
              type: action.type,
              labelJson: toJson(action.label),
              descriptionJson: toJson(action.description),
              value: action.value,
            })),
          },
          answers: {
            create: initialDemoAnswers.map((answer) => ({
              id: answer.id,
              canonicalQuestionJson: toJson(answer.canonicalQuestion),
              answerTextJson: toJson(answer.answerText),
              keywordsJson: toJson(answer.keywords),
              actionId: answer.actionId,
              usageCount: answer.usageCount,
              lastUpdated: answer.lastUpdated,
              category: answer.category,
              published: answer.published,
            })),
          },
          unknownQuestions: {
            create: initialUnknownQuestions.map((question) => ({
              id: question.id,
              question: question.question,
              language: question.language,
              fallbackResponseJson: toJson(question.fallbackResponse),
              count: question.count,
              confidence: question.confidence,
              status: question.status,
              createdAt: new Date(question.createdAt),
            })),
          },
        },
      },
    },
  })
}

export async function getKioskPayload(): Promise<KioskPayload> {
  await ensureDefaultPilot()
  const [location, cachedAudio] = await Promise.all([
    prisma.location.findUniqueOrThrow({
      where: { id: defaultLocationId },
      include: {
        counters: true,
        actions: true,
        answers: {
          where: { published: true },
          orderBy: { updatedAt: 'desc' },
        },
      },
    }),
    listCachedAnswerAudio(),
  ])

  return {
    profile: locationToProfile(location, location.counters),
    actions: location.actions.map(actionToUi),
    answers: location.answers.map(answerToUi),
    voiceSettings: normalizeVoiceSettings(parseJson(location.voiceSettingsJson)),
    cachedAudio,
  }
}

export async function getAdminPayload(): Promise<AdminPayload> {
  await ensureDefaultPilot()
  const [location, cachedAudio] = await Promise.all([
    prisma.location.findUniqueOrThrow({
      where: { id: defaultLocationId },
      include: {
        counters: true,
        actions: true,
        answers: { orderBy: { updatedAt: 'desc' } },
        unknownQuestions: { orderBy: { updatedAt: 'desc' } },
        questionEvents: { orderBy: { createdAt: 'desc' }, take: 250 },
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 100 },
        devices: { orderBy: { updatedAt: 'desc' } },
      },
    }),
    listCachedAnswerAudio(),
  ])
  const answers = location.answers.map(answerToUi)
  const baseUnknown = location.unknownQuestions.map(unknownToUi)
  const unknownQuestions = await Promise.all(
    baseUnknown.map(async (candidate) => {
      if (candidate.status !== 'new') {
        return candidate
      }
      const draft = await loadDraft(candidate.id)
      return draft ? { ...candidate, draft } : candidate
    })
  )
  const events = location.questionEvents.map(eventToUi)

  return {
    profile: locationToProfile(location, location.counters),
    actions: location.actions.map(actionToUi),
    answers,
    voiceSettings: normalizeVoiceSettings(parseJson(location.voiceSettingsJson)),
    cachedAudio,
    unknownQuestions,
    events,
    devices: location.devices.map(deviceToUi),
    analytics: createAnalytics({ answers, unknownQuestions, events }),
    auditLogs: location.auditLogs.map((log) => ({
      id: log.id,
      actor: log.actor,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      summary: log.summary,
      createdAt: log.createdAt.toISOString(),
    })),
  }
}

export async function saveVoiceSettings(settings: VoiceSettings) {
  const normalized = normalizeVoiceSettings(settings)

  await ensureDefaultPilot()
  await prisma.location.update({
    where: { id: defaultLocationId },
    data: {
      voiceSettingsJson: toJson(normalized),
    },
  })
  await writeAudit({
    action: 'update',
    entityType: 'voice_settings',
    entityId: defaultLocationId,
    summary: `Updated voice presets: AR ${normalized.ar ?? 'none'}, FR ${normalized.fr ?? 'none'}, EN ${normalized.en ?? 'none'}.`,
  })

  return getAdminPayload()
}

export async function recordDeviceHeartbeat(input: {
  deviceId: string
  label?: string
  userAgent?: string
}) {
  await ensureDefaultPilot()
  await prisma.kioskDevice.upsert({
    where: { id: input.deviceId },
    create: {
      id: input.deviceId,
      locationId: defaultLocationId,
      label: input.label || 'Reception kiosk',
      status: 'online',
      userAgent: input.userAgent,
      heartbeatCount: 1,
      lastSeenAt: new Date(),
    },
    update: {
      label: input.label || 'Reception kiosk',
      status: 'online',
      userAgent: input.userAgent,
      heartbeatCount: { increment: 1 },
      lastSeenAt: new Date(),
    },
  })

  return getAdminPayload()
}

async function writeAudit(input: {
  action: string
  entityType: string
  entityId: string
  summary: string
  actor?: string
}) {
  await prisma.auditLog.create({
    data: {
      id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      locationId: defaultLocationId,
      actor: input.actor ?? 'admin',
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary,
    },
  })
}

export async function saveProfile(profile: PilotProfile) {
  const normalized = normalizePilotProfile(profile)

  await ensureDefaultPilot()
  await prisma.$transaction(async (tx) => {
    await tx.location.update({
      where: { id: defaultLocationId },
      data: {
        tenantNameJson: toJson(normalized.tenantName),
        locationNameJson: toJson(normalized.locationName),
        welcomeTitleJson: toJson(normalized.welcomeTitle),
        serviceSummaryJson: toJson(normalized.serviceSummary),
        privacyNoteJson: toJson(normalized.privacyNote),
        openingHoursJson: toJson(normalized.openingHours),
        contactNumber: normalized.contactNumber,
        defaultLanguage: normalized.defaultLanguage,
        currentWaitJson: toJson(normalized.currentWait),
        liveStatusJson: toJson(normalized.liveStatus),
        fallbackResponseJson: toJson(normalized.fallbackResponse),
        useInternetFallback: normalized.useInternetFallback,
        internetFallbackPrefixJson: toJson(normalized.internetFallbackPrefix),
      },
    })
    await tx.counter.deleteMany({ where: { locationId: defaultLocationId } })
    await tx.counter.createMany({
      data: normalized.counters.map((counter, index) => ({
        id: counter.id,
        locationId: defaultLocationId,
        labelJson: toJson(counter.label),
        statusJson: toJson(counter.status),
        sortOrder: index,
      })),
    })
    await tx.auditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        locationId: defaultLocationId,
        actor: 'admin',
        action: 'update',
        entityType: 'pilot_profile',
        entityId: defaultLocationId,
        summary: 'Updated pilot profile and visible counters.',
      },
    })
  })

  return getAdminPayload()
}

export async function applyPilotScenario(scenarioId: string) {
  const scenario = getPilotScenario(scenarioId)

  if (!scenario) {
    throw new Error(`Unknown pilot scenario: ${scenarioId}`)
  }

  const profile = normalizePilotProfile(scenario.profile)
  const answers = normalizeAnswers(scenario.answers)
  const unknownQuestions = normalizeUnknownQuestions(scenario.unknownQuestions)

  await ensureDefaultPilot()
  await prisma.$transaction(async (tx) => {
    const location = await tx.location.findUniqueOrThrow({
      where: { id: defaultLocationId },
      select: { tenantId: true },
    })

    await tx.questionEvent.deleteMany({ where: { locationId: defaultLocationId } })
    await tx.unknownQuestion.deleteMany({ where: { locationId: defaultLocationId } })
    await tx.answer.deleteMany({ where: { locationId: defaultLocationId } })
    await tx.visitorAction.deleteMany({ where: { locationId: defaultLocationId } })
    await tx.counter.deleteMany({ where: { locationId: defaultLocationId } })

    await tx.tenant.update({
      where: { id: location.tenantId },
      data: {
        name: profile.tenantName.fr || profile.tenantName.en || profile.tenantName.ar,
      },
    })
    await tx.location.update({
      where: { id: defaultLocationId },
      data: {
        tenantNameJson: toJson(profile.tenantName),
        locationNameJson: toJson(profile.locationName),
        welcomeTitleJson: toJson(profile.welcomeTitle),
        serviceSummaryJson: toJson(profile.serviceSummary),
        privacyNoteJson: toJson(profile.privacyNote),
        openingHoursJson: toJson(profile.openingHours),
        contactNumber: profile.contactNumber,
        defaultLanguage: profile.defaultLanguage,
        currentWaitJson: toJson(profile.currentWait),
        liveStatusJson: toJson(profile.liveStatus),
        fallbackResponseJson: toJson(profile.fallbackResponse),
        useInternetFallback: profile.useInternetFallback,
        internetFallbackPrefixJson: toJson(profile.internetFallbackPrefix),
      },
    })
    await tx.counter.createMany({
      data: profile.counters.map((counter, index) => ({
        id: counter.id,
        locationId: defaultLocationId,
        labelJson: toJson(counter.label),
        statusJson: toJson(counter.status),
        sortOrder: index,
      })),
    })
    await tx.visitorAction.createMany({
      data: scenario.actions.map((action) => ({
        id: action.id,
        locationId: defaultLocationId,
        type: action.type,
        labelJson: toJson(action.label),
        descriptionJson: toJson(action.description),
        value: action.value,
      })),
    })
    await tx.answer.createMany({
      data: answers.map((answer) => ({
        id: answer.id,
        locationId: defaultLocationId,
        canonicalQuestionJson: toJson(answer.canonicalQuestion),
        answerTextJson: toJson(answer.answerText),
        keywordsJson: toJson(answer.keywords),
        actionId: answer.actionId,
        usageCount: answer.usageCount,
        lastUpdated: answer.lastUpdated,
        category: answer.category,
        published: answer.published,
      })),
    })
    await tx.unknownQuestion.createMany({
      data: unknownQuestions.map((question) => ({
        id: question.id,
        locationId: defaultLocationId,
        question: question.question,
        language: question.language,
        fallbackResponseJson: toJson(question.fallbackResponse),
        count: question.count,
        confidence: question.confidence,
        status: question.status,
        createdAt: new Date(question.createdAt),
      })),
    })
    await tx.auditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        locationId: defaultLocationId,
        actor: 'admin',
        action: 'apply',
        entityType: 'pilot_scenario',
        entityId: scenario.id,
        summary: `Applied pilot scenario: ${scenario.title}.`,
      },
    })
  })

  return getAdminPayload()
}

export async function saveAnswer(answer: DemoAnswer) {
  const normalized = normalizeAnswers([answer])[0]

  await ensureDefaultPilot()
  await prisma.answer.upsert({
    where: { id: normalized.id },
    create: {
      id: normalized.id,
      locationId: defaultLocationId,
      canonicalQuestionJson: toJson(normalized.canonicalQuestion),
      answerTextJson: toJson(normalized.answerText),
      keywordsJson: toJson(normalized.keywords),
      actionId: normalized.actionId,
      usageCount: normalized.usageCount,
      lastUpdated: normalized.lastUpdated,
      category: normalized.category,
      published: normalized.published,
    },
    update: {
      canonicalQuestionJson: toJson(normalized.canonicalQuestion),
      answerTextJson: toJson(normalized.answerText),
      keywordsJson: toJson(normalized.keywords),
      actionId: normalized.actionId,
      usageCount: normalized.usageCount,
      lastUpdated: new Date().toISOString().slice(0, 10),
      category: normalized.category,
      published: normalized.published,
    },
  })
  await writeAudit({
    action: 'upsert',
    entityType: 'answer',
    entityId: normalized.id,
    summary: `Saved answer: ${normalized.canonicalQuestion.fr || normalized.canonicalQuestion.en}`,
  })

  return getAdminPayload()
}

export async function deleteAnswer(answerId: string) {
  await prisma.answer.delete({ where: { id: answerId } })
  await writeAudit({
    action: 'delete',
    entityType: 'answer',
    entityId: answerId,
    summary: 'Deleted approved answer.',
  })
  return getAdminPayload()
}

export async function recordQuestionEvent(input: {
  question: string
  language: DemoLanguage
  cacheHit: boolean
  answerId?: string
}) {
  const event = createQuestionEvent(input)
  await ensureDefaultPilot()
  await prisma.questionEvent.create({
    data: {
      id: event.id,
      locationId: defaultLocationId,
      question: event.question,
      language: event.language,
      cacheHit: event.cacheHit,
      answerId: event.answerId,
      createdAt: new Date(event.createdAt),
    },
  })

  if (input.cacheHit && input.answerId) {
    await prisma.answer.update({
      where: { id: input.answerId },
      data: { usageCount: { increment: 1 } },
    })
  }

  return event
}

export async function recordUnknownQuestion(
  question: string,
  language: DemoLanguage,
  /** LAPI project for the draft, or `null` to log only and skip drafting. */
  drafterProjectName?: string | null,
) {
  await ensureDefaultPilot()
  const existing = await prisma.unknownQuestion.findMany({
    where: { locationId: defaultLocationId, status: 'new', language },
  })
  const nextQuestions = createUnknownQuestion(question, language, existing.map(unknownToUi))
  const nextQuestion = nextQuestions.find((candidate) => candidate.question === question) ?? nextQuestions[0]
  const existingMatch = existing.find((candidate) => candidate.id === nextQuestion.id)

  if (existingMatch) {
    await prisma.unknownQuestion.update({
      where: { id: existingMatch.id },
      data: { count: nextQuestion.count },
    })
  } else {
    await prisma.unknownQuestion.create({
      data: {
        id: nextQuestion.id,
        locationId: defaultLocationId,
        question: nextQuestion.question,
        language: nextQuestion.language,
        fallbackResponseJson: toJson(nextQuestion.fallbackResponse),
        count: nextQuestion.count,
        confidence: nextQuestion.confidence,
        status: nextQuestion.status,
        createdAt: new Date(nextQuestion.createdAt),
      },
    })

    // Only generate a draft for genuinely new candidates — don't re-roll on
    // every repeat occurrence of the same question. Fire-and-forget so the
    // kiosk visitor isn't blocked on the LLM round-trip.
    // `drafterProjectName === null` means "log only" (admin disabled drafting
    // for this browser session) — skip the LLM call entirely.
    if (isLlmDraftsEnabled() && drafterProjectName !== null) {
      const location = await prisma.location.findUniqueOrThrow({
        where: { id: defaultLocationId },
        include: { counters: true },
      })
      const profile = locationToProfile(location, location.counters)
      void generateAndStoreDraft({
        unknownId: nextQuestion.id,
        question: nextQuestion.question,
        language: nextQuestion.language,
        profile,
        projectName: drafterProjectName,
      })
    }
  }

  return getAdminPayload()
}

export async function markUnknownQuestion(candidateId: string, status: 'rejected' | 'out_of_scope') {
  await prisma.unknownQuestion.update({
    where: { id: candidateId },
    data: { status },
  })
  await writeAudit({
    action: status,
    entityType: 'unknown_question',
    entityId: candidateId,
    summary: `Marked unknown question as ${status}.`,
  })
  return getAdminPayload()
}

export async function approveUnknownQuestion(input: {
  candidateId: string
  answerText: LocalizedText
  actionId?: string
}) {
  const candidate = await prisma.unknownQuestion.findUniqueOrThrow({
    where: { id: input.candidateId },
  })
  const existingAnswers = await prisma.answer.findMany({ where: { locationId: defaultLocationId } })
  const approvedAnswer = promoteCandidateToAnswer({
    candidate: unknownToUi(candidate),
    answerText: input.answerText,
    actionId: input.actionId,
    existingAnswers: existingAnswers.map(answerToUi),
  })

  await prisma.$transaction(async (tx) => {
    await tx.answer.create({
      data: {
        id: approvedAnswer.id,
        locationId: defaultLocationId,
        canonicalQuestionJson: toJson(approvedAnswer.canonicalQuestion),
        answerTextJson: toJson(approvedAnswer.answerText),
        keywordsJson: toJson(approvedAnswer.keywords),
        actionId: approvedAnswer.actionId,
        usageCount: approvedAnswer.usageCount,
        lastUpdated: approvedAnswer.lastUpdated,
        category: approvedAnswer.category,
        published: approvedAnswer.published,
      },
    })
    await tx.unknownQuestion.update({
      where: { id: input.candidateId },
      data: { status: 'approved' },
    })
    await tx.auditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        locationId: defaultLocationId,
        actor: 'admin',
        action: 'approve',
        entityType: 'unknown_question',
        entityId: input.candidateId,
        summary: `Approved unknown question into answer ${approvedAnswer.id}.`,
      },
    })
  })

  return getAdminPayload()
}

export async function importSnapshot(snapshot: PilotSnapshot) {
  const profile = normalizePilotProfile(snapshot.profile)
  const answers = normalizeAnswers(snapshot.answers)
  const unknownQuestions = normalizeUnknownQuestions(snapshot.unknownQuestions)
  const events = normalizeQuestionEvents(snapshot.events)

  await ensureDefaultPilot()
  await prisma.$transaction(async (tx) => {
    await tx.questionEvent.deleteMany({ where: { locationId: defaultLocationId } })
    await tx.unknownQuestion.deleteMany({ where: { locationId: defaultLocationId } })
    await tx.answer.deleteMany({ where: { locationId: defaultLocationId } })
    await tx.counter.deleteMany({ where: { locationId: defaultLocationId } })

    await tx.location.update({
      where: { id: defaultLocationId },
      data: {
        tenantNameJson: toJson(profile.tenantName),
        locationNameJson: toJson(profile.locationName),
        welcomeTitleJson: toJson(profile.welcomeTitle),
        serviceSummaryJson: toJson(profile.serviceSummary),
        privacyNoteJson: toJson(profile.privacyNote),
        openingHoursJson: toJson(profile.openingHours),
        contactNumber: profile.contactNumber,
        defaultLanguage: profile.defaultLanguage,
        currentWaitJson: toJson(profile.currentWait),
        liveStatusJson: toJson(profile.liveStatus),
        fallbackResponseJson: toJson(profile.fallbackResponse),
        useInternetFallback: profile.useInternetFallback,
        internetFallbackPrefixJson: toJson(profile.internetFallbackPrefix),
      },
    })
    await tx.counter.createMany({
      data: profile.counters.map((counter, index) => ({
        id: counter.id,
        locationId: defaultLocationId,
        labelJson: toJson(counter.label),
        statusJson: toJson(counter.status),
        sortOrder: index,
      })),
    })
    await tx.answer.createMany({
      data: answers.map((answer) => ({
        id: answer.id,
        locationId: defaultLocationId,
        canonicalQuestionJson: toJson(answer.canonicalQuestion),
        answerTextJson: toJson(answer.answerText),
        keywordsJson: toJson(answer.keywords),
        actionId: answer.actionId,
        usageCount: answer.usageCount,
        lastUpdated: answer.lastUpdated,
        category: answer.category,
        published: answer.published,
      })),
    })
    await tx.unknownQuestion.createMany({
      data: unknownQuestions.map((question) => ({
        id: question.id,
        locationId: defaultLocationId,
        question: question.question,
        language: question.language,
        fallbackResponseJson: toJson(question.fallbackResponse),
        count: question.count,
        confidence: question.confidence,
        status: question.status,
        createdAt: new Date(question.createdAt),
      })),
    })
    await tx.questionEvent.createMany({
      data: events.map((event) => ({
        id: event.id,
        locationId: defaultLocationId,
        question: event.question,
        language: event.language,
        cacheHit: event.cacheHit,
        answerId: event.answerId,
        createdAt: new Date(event.createdAt),
      })),
    })
    await tx.auditLog.create({
      data: {
        id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        locationId: defaultLocationId,
        actor: 'admin',
        action: 'import',
        entityType: 'pilot_snapshot',
        entityId: defaultLocationId,
        summary: 'Imported pilot JSON snapshot.',
      },
    })
  })

  return getAdminPayload()
}

export async function resetPilot() {
  return applyPilotScenario('apc-civil-status')
}

export async function updateAdminPassword(password: string) {
  await setAdminPassword(password)
  await writeAudit({
    action: 'update',
    entityType: 'admin_settings',
    entityId: 'admin-password',
    summary: 'Changed local admin password.',
  })

  return getAdminPayload()
}
