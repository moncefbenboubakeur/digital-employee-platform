import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fallbackResponse, type DemoLanguage } from '../demo-data'
import { normalizeLocalizedText } from '../pilot-config'
import { normalizeVoiceSettings } from '../voice-library'
import { listAnswerAudioFiles } from './answer-audio-manifest'
import { debugLog } from './debug-log'
import { defaultLocationId, prisma } from './db'
import { ensureDefaultPilot } from './repository'
import { absoluteStoragePath } from './storage'
import { findVoicePreset, voicePreviewPath } from './voice-library'
import { isVoiceWorkerEnabled, runVoiceWorkerRequest } from './voice-worker'

type AnswerAudioResult = {
  path: string
  generated: boolean
  presetId: string
}

type AnswerAudioOptions = {
  force?: boolean
  cachedOnly?: boolean
}

type PublishedAudioTarget = {
  answerId: string
  language: DemoLanguage
  presetId: string
  text: string
  fileName: string
  filePath: string
}

export type AudioCacheLanguageSummary = {
  language: DemoLanguage
  presetId: string | null
  total: number
  ready: number
  missing: number
}

export type AudioCacheStatus = {
  total: number
  ready: number
  missing: number
  files: number
  bytes: number
  staleFiles: number
  staleBytes: number
  staleAfterDays: number
  languages: AudioCacheLanguageSummary[]
}

export type AudioCacheWarmMode = 'missing' | 'regenerate'

export type AudioCacheWarmJobStatus = {
  id: string
  status: 'running' | 'completed' | 'failed'
  mode: AudioCacheWarmMode
  languages: DemoLanguage[]
  total: number
  completed: number
  generated: number
  reused: number
  failed: number
  current?: {
    answerId: string
    language: DemoLanguage
  }
  errors: string[]
  startedAt: string
  lastProgressAt: string
  finishedAt?: string
}

type InternalAudioCacheWarmJob = AudioCacheWarmJobStatus

type AudioCacheRuntimeState = {
  activeAudioGenerations: Map<string, Promise<AnswerAudioResult>>
  voiceCommandQueue: Promise<void>
  currentAudioCacheWarmJob?: InternalAudioCacheWarmJob
}

const globalAudioCacheState = globalThis as typeof globalThis & {
  __digitalReceptionistAudioCacheState?: AudioCacheRuntimeState
}

// Synthetic answer id used to cache the fallback ("I don't have an approved
// answer yet…") line per language × preset. Kept out of the DB-backed answers
// so it has no canonical question / keywords, just a deterministic id whose
// filename is computed the same way as approved-answer audio.
export const FALLBACK_ANSWER_ID = '__fallback__'

const commandTimeoutSeconds = 600
const audibleSampleThreshold = 32
const demoLanguages: DemoLanguage[] = ['ar', 'fr', 'en']
const preferredWarmLanguageOrder: DemoLanguage[] = ['fr', 'en', 'ar']
const audioCacheRuntimeState =
  globalAudioCacheState.__digitalReceptionistAudioCacheState ??= {
    activeAudioGenerations: new Map<string, Promise<AnswerAudioResult>>(),
    voiceCommandQueue: Promise.resolve(),
  }

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return undefined
  }
}

function substituteTemplate(template: string, variables: Record<string, string>) {
  return Object.entries(variables).reduce(
    (command, [key, value]) => command.replaceAll(`{${key}}`, value),
    template
  )
}

function configuredTimeoutMs() {
  const parsed = Number.parseInt(process.env.VOICE_COMMAND_TIMEOUT_SEC ?? '', 10)
  const seconds = Number.isFinite(parsed) && parsed > 0 ? parsed : commandTimeoutSeconds
  return Math.min(seconds, commandTimeoutSeconds) * 1000
}

function sanitizeForFile(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function findWavDataChunk(bytes: Buffer) {
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') {
    return undefined
  }

  let offset = 12
  while (offset + 8 <= bytes.length) {
    const chunkId = bytes.toString('ascii', offset, offset + 4)
    const chunkSize = bytes.readUInt32LE(offset + 4)
    const dataStart = offset + 8
    const dataEnd = Math.min(dataStart + chunkSize, bytes.length)

    if (chunkId === 'data') {
      return { start: dataStart, end: dataEnd }
    }

    offset = dataStart + chunkSize + (chunkSize % 2)
  }

  return undefined
}

async function isAudiblePcm16Wav(filePath: string) {
  const bytes = await fs.readFile(filePath)
  const dataChunk = findWavDataChunk(bytes)

  if (!dataChunk) {
    return false
  }

  for (let index = dataChunk.start; index + 1 < dataChunk.end; index += 2) {
    if (Math.abs(bytes.readInt16LE(index)) > audibleSampleThreshold) {
      return true
    }
  }

  return false
}

async function assertAudiblePcm16Wav(filePath: string, presetId: string) {
  if (await isAudiblePcm16Wav(filePath)) {
    return
  }

  throw new Error(`Generated audio for ${presetId} is silent. Try another voice preset.`)
}

function audioHash(input: { text: string; language: DemoLanguage; presetId: string }) {
  return crypto
    .createHash('sha1')
    .update(input.text)
    .update(input.language)
    .update(input.presetId)
    .digest('hex')
    .slice(0, 12)
}

function answerAudioFileName(input: {
  answerId: string
  language: DemoLanguage
  presetId: string
  text: string
}) {
  return [
    sanitizeForFile(input.answerId),
    input.language,
    sanitizeForFile(input.presetId),
    audioHash(input),
  ].join('.')
}

function answerAudioFilePath(input: {
  answerId: string
  language: DemoLanguage
  presetId: string
  text: string
}) {
  return path.join(absoluteStoragePath('answer-audio'), `${answerAudioFileName(input)}.wav`)
}

function runVoiceCommand(command: string, timeoutMs: number) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn('bash', ['-lc', `exec ${command}`], {
      cwd: process.cwd(),
      detached: true,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let settled = false
    let killTimer: ReturnType<typeof setTimeout> | undefined
    const output: string[] = []

    const terminateChild = () => {
      if (!child.pid) {
        return
      }

      try {
        process.kill(-child.pid, 'SIGTERM')
      } catch {
        child.kill('SIGTERM')
      }

      killTimer = windowlessSetTimeout(() => {
        if (!child.pid) {
          return
        }

        try {
          process.kill(-child.pid, 'SIGKILL')
        } catch {
          child.kill('SIGKILL')
        }
      }, 2000)
    }

    const timer = windowlessSetTimeout(() => {
      if (settled) {
        return
      }

      settled = true
      terminateChild()
      reject(new Error(`VOICE_COMMAND timed out after ${timeoutMs / 1000}s.`))
    }, timeoutMs)

    const finish = (error?: Error) => {
      if (settled) {
        return
      }

      settled = true
      clearTimeout(timer)
      if (killTimer) {
        clearTimeout(killTimer)
      }

      if (error) {
        reject(error)
        return
      }

      resolve()
    }

    child.stdout.on('data', (chunk: Buffer) => output.push(chunk.toString()))
    child.stderr.on('data', (chunk: Buffer) => output.push(chunk.toString()))
    child.on('error', (error) => {
      finish(error)
    })
    child.on('close', (code) => {
      if (killTimer) {
        clearTimeout(killTimer)
      }

      if (settled) {
        return
      }

      if (code === 0) {
        finish()
        return
      }

      finish(new Error(`VOICE_COMMAND exited ${code ?? 'unknown'}.\n${output.join('').slice(-4000)}`))
    })
  })
}

function queueVoiceCommand(command: string, timeoutMs: number) {
  const queuedCommand = audioCacheRuntimeState.voiceCommandQueue
    .catch(() => undefined)
    .then(() => runVoiceCommand(command, timeoutMs))

  audioCacheRuntimeState.voiceCommandQueue = queuedCommand.catch(() => undefined)
  return queuedCommand
}

// Keeps the Node type explicit without pulling browser timer overloads into this server file.
function windowlessSetTimeout(callback: () => void, ms: number) {
  return setTimeout(callback, ms)
}

async function removeOlderCachedFiles(
  answerId: string,
  language: DemoLanguage,
  presetId: string,
  keepPath: string
) {
  const audioDir = absoluteStoragePath('answer-audio')
  const prefix = `${sanitizeForFile(answerId)}.${language}.${sanitizeForFile(presetId)}.`

  try {
    const entries = await fs.readdir(audioDir)
    await Promise.all(
      entries
        .filter((entry) => entry.startsWith(prefix))
        .map((entry) => path.join(audioDir, entry))
        .filter((entryPath) => entryPath !== keepPath)
        .map((entryPath) => fs.rm(entryPath, { force: true }))
    )
  } catch {
    // Cache cleanup is opportunistic.
  }
}

async function getPublishedAudioTargets(languages = demoLanguages): Promise<{
  targets: PublishedAudioTarget[]
  selectedPresetIds: Set<string>
  languagePresets: Record<DemoLanguage, string | null>
}> {
  await ensureDefaultPilot()

  const [answers, location] = await Promise.all([
    prisma.answer.findMany({
      where: {
        locationId: defaultLocationId,
        published: true,
      },
      select: {
        id: true,
        answerTextJson: true,
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.location.findUnique({
      where: { id: defaultLocationId },
      select: { defaultLanguage: true, voiceSettingsJson: true, fallbackResponseJson: true },
    }),
  ])

  const fallbackText = normalizeLocalizedText(
    parseJson(location?.fallbackResponseJson ?? '{}'),
    fallbackResponse
  )

  const voiceSettings = normalizeVoiceSettings(parseJson(location?.voiceSettingsJson ?? '{}'))
  const defaultLanguage = demoLanguages.includes(location?.defaultLanguage as DemoLanguage)
    ? location?.defaultLanguage as DemoLanguage
    : 'fr'
  const requestedLanguages = languages.filter((language) => demoLanguages.includes(language))
  const orderedLanguages = [
    defaultLanguage,
    ...preferredWarmLanguageOrder,
  ].filter((language, index, source) => requestedLanguages.includes(language) && source.indexOf(language) === index)
  const languagePresets = demoLanguages.reduce(
    (acc, language) => {
      acc[language] = voiceSettings[language] ?? null
      return acc
    },
    {} as Record<DemoLanguage, string | null>
  )
  const selectedPresetIds = new Set(
    Object.values(languagePresets).filter((presetId): presetId is string => Boolean(presetId))
  )
  const answerTargets = orderedLanguages.flatMap((language) =>
    answers.flatMap((answer) => {
      const answerText = normalizeLocalizedText(parseJson(answer.answerTextJson), fallbackResponse)
      const text = answerText[language]?.trim()
      const presetId = languagePresets[language]

      if (!text || !presetId) {
        return []
      }

      const fileName = answerAudioFileName({ answerId: answer.id, language, presetId, text })

      return [
        {
          answerId: answer.id,
          language,
          presetId,
          text,
          fileName,
          filePath: path.join(absoluteStoragePath('answer-audio'), `${fileName}.wav`),
        },
      ]
    })
  )

  // Synthetic fallback target per selected (language, preset) — pre-bakes the
  // "I don't have an approved answer yet…" line so unknown questions play in
  // the same xtts voice as approved ones instead of falling to browser TTS.
  const fallbackTargets = orderedLanguages.flatMap((language) => {
    const text = fallbackText[language]?.trim()
    const presetId = languagePresets[language]
    if (!text || !presetId) {
      return []
    }
    const fileName = answerAudioFileName({ answerId: FALLBACK_ANSWER_ID, language, presetId, text })
    return [
      {
        answerId: FALLBACK_ANSWER_ID,
        language,
        presetId,
        text,
        fileName,
        filePath: path.join(absoluteStoragePath('answer-audio'), `${fileName}.wav`),
      },
    ]
  })

  return {
    targets: [...answerTargets, ...fallbackTargets],
    selectedPresetIds,
    languagePresets,
  }
}

export async function markAnswerAudioAccessed(filePath: string) {
  try {
    const stat = await fs.stat(filePath)
    await fs.utimes(filePath, new Date(), stat.mtime)
  } catch {
    // Access tracking is best effort; playback must not depend on it.
  }
}

export async function getAnswerAudioCacheStatus(staleAfterDays = 2): Promise<AudioCacheStatus> {
  const [{ targets, selectedPresetIds, languagePresets }, files] = await Promise.all([
    getPublishedAudioTargets(),
    listAnswerAudioFiles(),
  ])
  const existingPaths = new Set(files.map((file) => file.filePath))
  const staleCutoffMs = Date.now() - staleAfterDays * 24 * 60 * 60 * 1000
  const staleFiles = files.filter(
    (file) =>
      file.parsed &&
      !selectedPresetIds.has(file.parsed.presetId) &&
      file.accessedAt.getTime() < staleCutoffMs
  )
  const languageSummaries = demoLanguages.map((language) => {
    const languageTargets = targets.filter((target) => target.language === language)
    const ready = languageTargets.filter((target) => existingPaths.has(target.filePath)).length

    return {
      language,
      presetId: languagePresets[language],
      total: languageTargets.length,
      ready,
      missing: languageTargets.length - ready,
    }
  })
  const ready = targets.filter((target) => existingPaths.has(target.filePath)).length

  return {
    total: targets.length,
    ready,
    missing: targets.length - ready,
    files: files.length,
    bytes: files.reduce((sum, file) => sum + file.bytes, 0),
    staleFiles: staleFiles.length,
    staleBytes: staleFiles.reduce((sum, file) => sum + file.bytes, 0),
    staleAfterDays,
    languages: languageSummaries,
  }
}

function publicAudioCacheWarmJob(job: InternalAudioCacheWarmJob): AudioCacheWarmJobStatus {
  return {
    ...job,
    errors: job.errors.slice(-8),
    current: job.current ? { ...job.current } : undefined,
  }
}

export function getAudioCacheWarmJob() {
  return audioCacheRuntimeState.currentAudioCacheWarmJob
    ? publicAudioCacheWarmJob(audioCacheRuntimeState.currentAudioCacheWarmJob)
    : undefined
}

function warmJobStallThresholdMs() {
  // A single xtts generation is bounded by configuredTimeoutMs(); allow a generous
  // safety margin for tracking-only stalls (IIFE crashed, HMR orphaned the closure, etc).
  return configuredTimeoutMs() + 60_000
}

function isWarmJobStalled(job: InternalAudioCacheWarmJob) {
  if (job.status !== 'running') {
    return false
  }

  const lastProgressMs = Date.parse(job.lastProgressAt)
  if (!Number.isFinite(lastProgressMs)) {
    return true
  }

  return Date.now() - lastProgressMs > warmJobStallThresholdMs()
}

export async function startAudioCacheWarmJob(input: {
  mode?: AudioCacheWarmMode
  languages?: DemoLanguage[]
}) {
  const existing = audioCacheRuntimeState.currentAudioCacheWarmJob

  if (existing?.status === 'running') {
    if (isWarmJobStalled(existing)) {
      existing.status = 'failed'
      existing.finishedAt = new Date().toISOString()
      existing.errors.push(
        `Job superseded after no progress for >${Math.round(warmJobStallThresholdMs() / 1000)}s.`
      )
    } else {
      return publicAudioCacheWarmJob(existing)
    }
  }

  const languages = (input.languages?.length ? input.languages : demoLanguages).filter((language) =>
    demoLanguages.includes(language)
  )
  const mode = input.mode ?? 'missing'
  const startedAt = new Date().toISOString()
  const job: InternalAudioCacheWarmJob = {
    id: `audio-cache-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    status: 'running',
    mode,
    languages,
    total: 0,
    completed: 0,
    generated: 0,
    reused: 0,
    failed: 0,
    errors: [],
    startedAt,
    lastProgressAt: startedAt,
  }

  audioCacheRuntimeState.currentAudioCacheWarmJob = job

  const markProgress = () => {
    job.lastProgressAt = new Date().toISOString()
  }

  void (async () => {
    try {
      const { targets } = await getPublishedAudioTargets(languages)

      job.total = targets.length
      markProgress()

      for (const target of targets) {
        job.current = {
          answerId: target.answerId,
          language: target.language,
        }
        markProgress()

        try {
          const result = await getOrCreateAnswerAudio(target.answerId, target.language, {
            force: mode === 'regenerate',
          })

          if (result?.generated) {
            job.generated += 1
          } else {
            job.reused += 1
          }
        } catch (error) {
          job.failed += 1
          const message = error instanceof Error ? error.message : 'Audio generation failed.'
          job.errors.push(`${target.answerId} ${target.language}: ${message}`)
        } finally {
          job.completed += 1
          markProgress()
        }
      }

      job.current = undefined
      job.status = job.failed > 0 ? 'failed' : 'completed'
      job.finishedAt = new Date().toISOString()
      markProgress()
    } catch (error) {
      job.current = undefined
      job.status = 'failed'
      job.finishedAt = new Date().toISOString()
      job.errors.push(error instanceof Error ? error.message : 'Audio cache job failed.')
      markProgress()
    }
  })()

  return publicAudioCacheWarmJob(job)
}

export async function purgeUnusedAnswerAudio(staleAfterDays = 2) {
  const [{ selectedPresetIds }, files] = await Promise.all([
    getPublishedAudioTargets(),
    listAnswerAudioFiles(),
  ])
  const staleCutoffMs = Date.now() - staleAfterDays * 24 * 60 * 60 * 1000
  const staleFiles = files.filter(
    (file) =>
      file.parsed &&
      !selectedPresetIds.has(file.parsed.presetId) &&
      file.accessedAt.getTime() < staleCutoffMs
  )

  await Promise.all(staleFiles.map((file) => fs.rm(file.filePath, { force: true })))

  return {
    deletedFiles: staleFiles.length,
    deletedBytes: staleFiles.reduce((sum, file) => sum + file.bytes, 0),
    staleAfterDays,
  }
}

export async function getOrCreateAnswerAudio(
  answerId: string,
  language: DemoLanguage,
  options: AnswerAudioOptions = {}
): Promise<AnswerAudioResult | undefined> {
  await ensureDefaultPilot()

  let resolvedAnswerId = answerId
  let text: string | undefined
  let presetId: string | undefined

  if (answerId === FALLBACK_ANSWER_ID) {
    const location = await prisma.location.findUnique({
      where: { id: defaultLocationId },
      select: { voiceSettingsJson: true, fallbackResponseJson: true },
    })
    if (!location) {
      debugLog('getOrCreateAnswerAudio.missing-record', {
        answerId,
        language,
        foundAnswer: false,
        foundLocation: false,
      })
      return undefined
    }
    const fallbackText = normalizeLocalizedText(
      parseJson(location.fallbackResponseJson),
      fallbackResponse
    )
    text = fallbackText[language]?.trim()
    presetId = normalizeVoiceSettings(parseJson(location.voiceSettingsJson))[language] ?? undefined
  } else {
    const [answer, location] = await Promise.all([
      prisma.answer.findFirst({
        where: {
          id: answerId,
          locationId: defaultLocationId,
          published: true,
        },
        select: {
          id: true,
          answerTextJson: true,
        },
      }),
      prisma.location.findUnique({
        where: { id: defaultLocationId },
        select: { voiceSettingsJson: true },
      }),
    ])

    if (!answer || !location) {
      debugLog('getOrCreateAnswerAudio.missing-record', {
        answerId,
        language,
        foundAnswer: Boolean(answer),
        foundLocation: Boolean(location),
      })
      return undefined
    }

    resolvedAnswerId = answer.id
    const answerText = normalizeLocalizedText(parseJson(answer.answerTextJson), fallbackResponse)
    text = answerText[language]?.trim()
    presetId = normalizeVoiceSettings(parseJson(location.voiceSettingsJson))[language] ?? undefined
  }

  if (!text || !presetId) {
    debugLog('getOrCreateAnswerAudio.missing-text-or-preset', {
      answerId,
      language,
      hasText: Boolean(text),
      presetId,
    })
    return undefined
  }

  const preset = await findVoicePreset(presetId)

  if (!preset) {
    throw new Error(`Voice preset ${presetId} is not available.`)
  }

  const commandTemplate = process.env.VOICE_COMMAND?.trim()
  const useWorker = isVoiceWorkerEnabled()

  if (!useWorker && !commandTemplate) {
    throw new Error('Neither VOICE_WORKER_COMMAND nor VOICE_COMMAND is configured.')
  }

  const audioDir = absoluteStoragePath('answer-audio')
  const finalPath = answerAudioFilePath({ answerId: resolvedAnswerId, language, presetId, text })

  if (options.force) {
    await fs.rm(finalPath, { force: true })
  }

  try {
    await fs.access(finalPath)
    if (!(await isAudiblePcm16Wav(finalPath))) {
      await fs.rm(finalPath, { force: true })
      throw new Error('Cached audio was silent and has been removed.')
    }
    debugLog('getOrCreateAnswerAudio.cache-hit', { answerId, language, presetId })
    return { path: finalPath, generated: false, presetId }
  } catch {
    if (options.cachedOnly) {
      debugLog('getOrCreateAnswerAudio.cache-miss-cached-only', { answerId, language, presetId })
      return undefined
    }

    debugLog('getOrCreateAnswerAudio.cache-miss-generating', { answerId, language, presetId })
    // Generate below.
  }

  await fs.mkdir(audioDir, { recursive: true })

  const activeGeneration = audioCacheRuntimeState.activeAudioGenerations.get(finalPath)
  if (activeGeneration) {
    await activeGeneration
    return { path: finalPath, generated: false, presetId }
  }

  const generation = (async (): Promise<AnswerAudioResult> => {
    const workDir = path.join(audioDir, `.work-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    await fs.mkdir(workDir, { recursive: true })

    const scriptPath = path.join(workDir, 'voice-input.txt')
    const rawAudioPath = path.join(workDir, 'voice-raw.wav')
    const voiceReferencePath = voicePreviewPath(preset.id)
    await fs.writeFile(scriptPath, text, 'utf8')

    try {
      if (useWorker) {
        await runVoiceWorkerRequest({
          textFile: scriptPath,
          reference: voiceReferencePath,
          language,
          output: rawAudioPath,
          timeoutMs: configuredTimeoutMs(),
        })
      } else {
        const command = substituteTemplate(commandTemplate!, {
          scriptPath,
          audioPath: rawAudioPath,
          voiceReferencePath,
          language,
          outputDir: workDir,
        })
        await queueVoiceCommand(command, configuredTimeoutMs())
      }
      await fs.stat(rawAudioPath)
      await assertAudiblePcm16Wav(rawAudioPath, presetId)
      await fs.rename(rawAudioPath, finalPath)
      await removeOlderCachedFiles(resolvedAnswerId, language, presetId, finalPath)
    } finally {
      await fs.rm(workDir, { recursive: true, force: true })
    }

    return { path: finalPath, generated: true, presetId }
  })()

  audioCacheRuntimeState.activeAudioGenerations.set(finalPath, generation)

  try {
    return await generation
  } finally {
    if (audioCacheRuntimeState.activeAudioGenerations.get(finalPath) === generation) {
      audioCacheRuntimeState.activeAudioGenerations.delete(finalPath)
    }
  }
}
