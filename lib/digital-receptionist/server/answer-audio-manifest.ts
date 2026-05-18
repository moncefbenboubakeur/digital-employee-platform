import fs from 'node:fs/promises'
import path from 'node:path'
import type { DemoLanguage } from '../demo-data'
import { absoluteStoragePath } from './storage'

export type CachedAnswerAudioRef = {
  answerId: string
  language: DemoLanguage
  presetId: string
}

export type AnswerAudioFile = {
  fileName: string
  filePath: string
  bytes: number
  accessedAt: Date
  updatedAt: Date
  parsed?: {
    answerId: string
    language: DemoLanguage
    presetId: string
    hash: string
  }
}

const demoLanguages: DemoLanguage[] = ['ar', 'fr', 'en']

export function parseAnswerAudioFileName(fileName: string): AnswerAudioFile['parsed'] {
  if (!fileName.endsWith('.wav')) {
    return undefined
  }

  const parts = fileName.slice(0, -4).split('.')
  const language = parts[1] as DemoLanguage | undefined

  if (parts.length < 4 || !language || !demoLanguages.includes(language)) {
    return undefined
  }

  return {
    answerId: parts[0],
    language,
    presetId: parts.slice(2, -1).join('.'),
    hash: parts.at(-1) ?? '',
  }
}

export async function listAnswerAudioFiles(): Promise<AnswerAudioFile[]> {
  const audioDir = absoluteStoragePath('answer-audio')

  try {
    const entries = await fs.readdir(audioDir)
    return Promise.all(
      entries
        .filter((entry) => entry.endsWith('.wav'))
        .map(async (entry) => {
          const filePath = path.join(audioDir, entry)
          const stat = await fs.stat(filePath)

          return {
            fileName: entry,
            filePath,
            bytes: stat.size,
            accessedAt: stat.atime,
            updatedAt: stat.mtime,
            parsed: parseAnswerAudioFileName(entry),
          }
        })
    )
  } catch {
    return []
  }
}

export async function listCachedAnswerAudio(): Promise<CachedAnswerAudioRef[]> {
  const files = await listAnswerAudioFiles()
  return files.flatMap((file) => {
    if (!file.parsed) {
      return []
    }

    return [
      {
        answerId: file.parsed.answerId,
        language: file.parsed.language,
        presetId: file.parsed.presetId,
      },
    ]
  })
}
