import {
  ChildProcessWithoutNullStreams,
  spawn,
} from 'node:child_process'
import { randomUUID } from 'node:crypto'

/**
 * Persistent local-embeddings worker manager.
 *
 * Spawns `scripts/embeddings_worker.py` (sentence-transformers
 * multilingual model) once and pipelines JSON-line requests, avoiding
 * the ~8s Python + torch + model-load cost per call.
 *
 * Why local + Python: DEP already runs Python for xtts via the same
 * persistent-worker pattern; sentence-transformers gets multilingual
 * embeddings (AR/FR/EN strong) at ~30-50ms per query with no network
 * round-trip. The kiosk's matcher pre-filter stays offline-capable.
 *
 * Why a singleton: one worker per Node process. The model is ~120 MB
 * resident and starts in ~8s; we don't want to pay that more than once.
 *
 * Enable by setting EMBEDDINGS_WORKER_COMMAND in .env, e.g.
 *   EMBEDDINGS_WORKER_COMMAND="'/Volumes/.../voice-venv/bin/python' scripts/embeddings_worker.py"
 *
 * If unset, `embedTexts` rejects — callers should branch on
 * `embeddingsAvailable()` first.
 */

type WorkerRequest = {
  id: string
  texts: string[]
  resolve: (vectors: number[][]) => void
  reject: (err: Error) => void
}

type WorkerState =
  | { kind: 'unconfigured' }
  | { kind: 'starting'; promise: Promise<void> }
  | { kind: 'ready'; child: ChildProcessWithoutNullStreams; model: string; dim: number }
  | { kind: 'failed'; error: Error }

let state: WorkerState = { kind: 'unconfigured' }
const pending = new Map<string, WorkerRequest>()
let stdoutBuffer = ''

export function embeddingsAvailable(): boolean {
  return Boolean(process.env.EMBEDDINGS_WORKER_COMMAND?.trim())
}

export type EmbeddingsStatus = {
  enabled: boolean
  state: 'unconfigured' | 'starting' | 'ready' | 'failed'
  model?: string
  dim?: number
  pendingRequests: number
  lastError?: string
}

export function embeddingsStatus(): EmbeddingsStatus {
  if (!embeddingsAvailable()) {
    return {
      enabled: false,
      state: 'unconfigured',
      pendingRequests: 0,
    }
  }
  if (state.kind === 'ready') {
    return {
      enabled: true,
      state: 'ready',
      model: state.model,
      dim: state.dim,
      pendingRequests: pending.size,
    }
  }
  if (state.kind === 'starting') {
    return { enabled: true, state: 'starting', pendingRequests: pending.size }
  }
  if (state.kind === 'failed') {
    return {
      enabled: true,
      state: 'failed',
      pendingRequests: pending.size,
      lastError: state.error.message,
    }
  }
  return { enabled: true, state: 'unconfigured', pendingRequests: 0 }
}

/**
 * Embed an array of texts. Returns one vector per input.
 *
 * Auto-starts the worker on first call. Subsequent calls share the
 * already-running worker. If the worker died, the next call re-spawns.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!embeddingsAvailable()) {
    throw new Error(
      'EMBEDDINGS_WORKER_COMMAND not set — local embeddings unavailable',
    )
  }
  if (texts.length === 0) return []

  await ensureWorkerReady()

  if (state.kind !== 'ready') {
    throw new Error(`embeddings worker not ready: ${state.kind}`)
  }
  const child = state.child

  return new Promise<number[][]>((resolve, reject) => {
    const id = randomUUID()
    pending.set(id, { id, texts, resolve, reject })
    const payload = JSON.stringify({ id, texts }) + '\n'
    if (!child.stdin.write(payload)) {
      // The worker isn't draining stdin fast enough. Should be rare since
      // each request is small.
      child.stdin.once('drain', () => {
        /* nothing — request already in flight */
      })
    }
  })
}

async function ensureWorkerReady(): Promise<void> {
  if (state.kind === 'ready') return
  if (state.kind === 'starting') return state.promise

  // Either unconfigured/failed → spawn fresh.
  const promise = startWorker()
  state = { kind: 'starting', promise }
  return promise
}

function startWorker(): Promise<void> {
  return new Promise((resolve, reject) => {
    const cmd = process.env.EMBEDDINGS_WORKER_COMMAND?.trim()
    if (!cmd) {
      state = { kind: 'failed', error: new Error('EMBEDDINGS_WORKER_COMMAND unset') }
      reject(new Error('EMBEDDINGS_WORKER_COMMAND unset'))
      return
    }

    // The env value can be a shell command with quoted paths (matching
    // VOICE_WORKER_COMMAND's pattern). Spawn through /bin/sh so shell
    // quoting works without us having to parse it.
    const child = spawn('/bin/sh', ['-c', cmd], { stdio: ['pipe', 'pipe', 'pipe'] })

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBuffer += chunk.toString('utf8')
      let nl = stdoutBuffer.indexOf('\n')
      while (nl !== -1) {
        const line = stdoutBuffer.slice(0, nl).trim()
        stdoutBuffer = stdoutBuffer.slice(nl + 1)
        nl = stdoutBuffer.indexOf('\n')
        if (!line) continue
        handleWorkerLine(line, child, resolve, reject)
      }
    })

    child.stderr.on('data', (chunk: Buffer) => {
      // Forward worker stderr to the Next.js dev/server log for diagnostics.
      // Keep it noisy enough to debug startup but not per-request spammy
      // (the worker logs one line per request to stderr, which is fine).
      process.stderr.write(`[embeddings] ${chunk.toString('utf8')}`)
    })

    child.on('error', (err) => {
      state = { kind: 'failed', error: err }
      rejectAllPending(err)
      reject(err)
    })

    child.on('exit', (code, signal) => {
      const err = new Error(
        `embeddings worker exited (code=${code}, signal=${signal})`,
      )
      state = { kind: 'failed', error: err }
      rejectAllPending(err)
    })
  })
}

function handleWorkerLine(
  line: string,
  child: ChildProcessWithoutNullStreams,
  resolveStart: () => void,
  rejectStart: (err: Error) => void,
): void {
  let msg: unknown
  try {
    msg = JSON.parse(line)
  } catch {
    process.stderr.write(`[embeddings] non-JSON stdout: ${line}\n`)
    return
  }
  if (!msg || typeof msg !== 'object') return
  const m = msg as Record<string, unknown>

  if (m.event === 'ready') {
    state = {
      kind: 'ready',
      child,
      model: typeof m.model === 'string' ? m.model : 'unknown',
      dim: typeof m.dim === 'number' ? m.dim : 0,
    }
    resolveStart()
    return
  }

  // Otherwise it's a per-request response.
  const id = typeof m.id === 'string' ? m.id : null
  if (!id || !pending.has(id)) return
  const req = pending.get(id)!
  pending.delete(id)

  if (m.status === 'ok' && Array.isArray(m.vectors)) {
    req.resolve(m.vectors as number[][])
    return
  }
  if (m.status === 'error') {
    req.reject(
      new Error(
        typeof m.message === 'string' ? m.message : 'embeddings worker reported error',
      ),
    )
    return
  }
  // Unknown response shape — log and reject so caller sees the failure.
  rejectStart(new Error(`unexpected response shape: ${line.slice(0, 120)}`))
  req.reject(new Error('unexpected response shape'))
}

function rejectAllPending(err: Error): void {
  for (const req of pending.values()) {
    req.reject(err)
  }
  pending.clear()
}

/**
 * Cosine similarity between two same-length vectors. Both should be
 * already-normalized for full speed, but we don't assume that; this
 * computes the magnitude on the fly. ~5μs per call for 384-dim.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`vector length mismatch: ${a.length} vs ${b.length}`)
  }
  let dot = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}
