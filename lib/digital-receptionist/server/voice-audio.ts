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
  return Math.min(seconds, 3600) * 1000
}

function sanitizeForFile(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_')
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
    const child = spawn('bash', ['-lc', command], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const timer = windowlessSetTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`VOICE_COMMAND timed out after ${timeoutMs / 1000}s.`))
    }, timeoutMs)
    const output: string[] = []

    child.stdout.on('data', (chunk: Buffer) => output.push(chunk.toString()))
    child.stderr.on('data', (chunk: Buffer) => output.push(chunk.toString()))
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`VOICE_COMMAND exited ${code ?? 'unknown'}.\n${output.join('').slice(-4000)}`))
    })
  })
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
    return { path: finalPath, generated: false, presetId }
  } catch {
    // Generate below.
  }

  await fs.mkdir(audioDir, { recursive: true })

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
    await runVoiceCommand(command, configuredTimeoutMs())
    await fs.stat(rawAudioPath)
    await fs.rename(rawAudioPath, finalPath)
    await removeOlderCachedFiles(answer.id, language, finalPath)
  } finally {
    await fs.rm(workDir, { recursive: true, force: true })
  }

  return { path: finalPath, generated: true, presetId }
}
