import { appendFile } from 'node:fs/promises'
import path from 'node:path'

// Opt-in audit log for debugging the audio cache / warm job pipeline.
// Enable with `DR_DEBUG=1 npm run dev` (writes JSON lines to tmp/dr-debug.log).
const debugLogPath = path.join(process.cwd(), 'tmp', 'dr-debug.log')
const debugEnabled = process.env.DR_DEBUG === '1'

let warned = false

export function debugLog(tag: string, data: Record<string, unknown> = {}) {
  if (!debugEnabled) {
    return
  }

  const line = `${new Date().toISOString()} [${tag}] ${JSON.stringify(data)}\n`

  void appendFile(debugLogPath, line).catch((error) => {
    if (warned) {
      return
    }

    warned = true
    console.error('debugLog: unable to write', debugLogPath, error)
  })
}
