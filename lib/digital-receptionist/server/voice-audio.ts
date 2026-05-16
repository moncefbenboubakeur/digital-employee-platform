import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fallbackResponse, type DemoLanguage } from '../demo-data'
import { normalizeLocalizedText } from '../pilot-config'
import { normalizeVoiceSettings } from '../voice-library'
import { defaultLocationId, prisma } from './db'
import { ensureDefaultPilot } from './repository'
import { absoluteStoragePath } from './storage'
import { findVoicePreset, voicePreviewPath } from './voice-library'

type AnswerAudioResult = {
  path: string
  generated: boolean
  presetId: string
}

const commandTimeoutSeconds = 600
const activeAudioGenerations = new Map<string, Promise<AnswerAudioResult>>()
let voiceCommandQueue: Promise<void> = Promise.resolve()
const audibleSampleThreshold = 32

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
  return Math.min(seconds, 110) * 1000
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
  const queuedCommand = voiceCommandQueue
    .catch(() => undefined)
    .then(() => runVoiceCommand(command, timeoutMs))

  voiceCommandQueue = queuedCommand.catch(() => undefined)
  return queuedCommand
}

// Keeps the Node type explicit without pulling browser timer overloads into this server file.
function windowlessSetTimeout(callback: () => void, ms: number) {
  return setTimeout(callback, ms)
}

async function removeOlderCachedFiles(answerId: string, language: DemoLanguage, keepPath: string) {
  const audioDir = absoluteStoragePath('answer-audio')
  const prefix = `${sanitizeForFile(answerId)}.${language}.`

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

export async function getOrCreateAnswerAudio(
  answerId: string,
  language: DemoLanguage
): Promise<AnswerAudioResult | undefined> {
  await ensureDefaultPilot()

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
    return undefined
  }

  const answerText = normalizeLocalizedText(parseJson(answer.answerTextJson), fallbackResponse)
  const text = answerText[language]?.trim()
  const presetId = normalizeVoiceSettings(parseJson(location.voiceSettingsJson))[language]

  if (!text || !presetId) {
    return undefined
  }

  const preset = await findVoicePreset(presetId)

  if (!preset) {
    throw new Error(`Voice preset ${presetId} is not available.`)
  }

  const commandTemplate = process.env.VOICE_COMMAND?.trim()

  if (!commandTemplate) {
    throw new Error('VOICE_COMMAND is not configured.')
  }

  const audioDir = absoluteStoragePath('answer-audio')
  const fileName = [
    sanitizeForFile(answer.id),
    language,
    sanitizeForFile(presetId),
    audioHash({ text, language, presetId }),
  ].join('.')
  const finalPath = path.join(audioDir, `${fileName}.wav`)

  try {
    await fs.access(finalPath)
    if (!(await isAudiblePcm16Wav(finalPath))) {
      await fs.rm(finalPath, { force: true })
      throw new Error('Cached audio was silent and has been removed.')
    }
    return { path: finalPath, generated: false, presetId }
  } catch {
    // Generate below.
  }

  await fs.mkdir(audioDir, { recursive: true })

  const activeGeneration = activeAudioGenerations.get(finalPath)
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

    const command = substituteTemplate(commandTemplate, {
      scriptPath,
      audioPath: rawAudioPath,
      voiceReferencePath,
      language,
      outputDir: workDir,
    })

    try {
      await queueVoiceCommand(command, configuredTimeoutMs())
      await fs.stat(rawAudioPath)
      await assertAudiblePcm16Wav(rawAudioPath, presetId)
      await fs.rename(rawAudioPath, finalPath)
      await removeOlderCachedFiles(answer.id, language, finalPath)
    } finally {
      await fs.rm(workDir, { recursive: true, force: true })
    }

    return { path: finalPath, generated: true, presetId }
  })()

  activeAudioGenerations.set(finalPath, generation)

  try {
    return await generation
  } finally {
    if (activeAudioGenerations.get(finalPath) === generation) {
      activeAudioGenerations.delete(finalPath)
    }
  }
}
