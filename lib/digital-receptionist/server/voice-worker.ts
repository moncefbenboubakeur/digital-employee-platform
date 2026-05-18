import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process'

// Persistent xtts worker manager. Spawns scripts/voice_worker.py once and
// pipelines JSON-line requests to it, avoiding the ~30–60s Python+model
// startup per call that generate_voice.py pays.
//
// Enable by setting VOICE_WORKER_COMMAND in .env, e.g.
//   VOICE_WORKER_COMMAND="'/Volumes/.../voice-venv/bin/python' scripts/voice_worker.py"
//
// If unset, getOrCreateAnswerAudio falls back to the legacy VOICE_COMMAND
// shell-spawn path.

export type VoiceWorkerStatus = {
  enabled: boolean
  state: 'stopped' | 'starting' | 'ready' | 'busy' | 'failed' | 'unavailable'
  pid?: number
  model?: string
  device?: string
  sampleRate?: number
  warmupSeconds?: number
  startedAt?: string
  readyAt?: string
  lastError?: string
  pendingRequests: number
  completed: number
  failed: number
}

type WorkerRequest = {
  id: string
  textFile: string
  reference: string
  language: string
  output: string
}

type PendingResolver = {
  resolve: () => void
  reject: (error: Error) => void
  timeoutHandle?: ReturnType<typeof setTimeout>
}

type WorkerRuntime = {
  process?: ChildProcessWithoutNullStreams
  state: VoiceWorkerStatus['state']
  pid?: number
  model?: string
  device?: string
  sampleRate?: number
  warmupSeconds?: number
  startedAt?: string
  readyAt?: string
  lastError?: string
  readyPromise?: Promise<void>
  readyResolve?: () => void
  readyReject?: (error: Error) => void
  pending: Map<string, PendingResolver>
  // Single-flight gate so requests are dispatched one at a time (xtts is
  // single-threaded inside Python anyway).
  inflight: Promise<void>
  stdoutBuffer: string
  requestCounter: number
  completed: number
  failed: number
  explicitlyStopped: boolean
}

const globalKey = '__digitalReceptionistVoiceWorker'

function getRuntime(): WorkerRuntime {
  const g = globalThis as typeof globalThis & { [globalKey]?: WorkerRuntime }
  if (!g[globalKey]) {
    g[globalKey] = {
      state: 'stopped',
      pending: new Map(),
      inflight: Promise.resolve(),
      stdoutBuffer: '',
      requestCounter: 0,
      completed: 0,
      failed: 0,
      explicitlyStopped: false,
    }
  }
  return g[globalKey] as WorkerRuntime
}

export function isVoiceWorkerEnabled(): boolean {
  return Boolean(process.env.VOICE_WORKER_COMMAND?.trim())
}

export function getVoiceWorkerStatus(): VoiceWorkerStatus {
  const runtime = getRuntime()
  const enabled = isVoiceWorkerEnabled()
  return {
    enabled,
    state: enabled ? runtime.state : 'unavailable',
    pid: runtime.pid,
    model: runtime.model,
    device: runtime.device,
    sampleRate: runtime.sampleRate,
    warmupSeconds: runtime.warmupSeconds,
    startedAt: runtime.startedAt,
    readyAt: runtime.readyAt,
    lastError: runtime.lastError,
    pendingRequests: runtime.pending.size,
    completed: runtime.completed,
    failed: runtime.failed,
  }
}

function handleStdoutLine(runtime: WorkerRuntime, line: string) {
  const trimmed = line.trim()
  if (!trimmed) {
    return
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    // Worker should only emit JSON; log and skip non-JSON noise.
    console.warn('[voice-worker] non-JSON stdout line:', trimmed.slice(0, 200))
    return
  }

  if (payload.event === 'ready') {
    runtime.state = 'ready'
    runtime.readyAt = new Date().toISOString()
    runtime.model = typeof payload.model === 'string' ? payload.model : undefined
    runtime.device = typeof payload.device === 'string' ? payload.device : undefined
    runtime.sampleRate = typeof payload.sampleRate === 'number' ? payload.sampleRate : undefined
    runtime.warmupSeconds = typeof payload.warmupSeconds === 'number' ? payload.warmupSeconds : undefined
    runtime.readyResolve?.()
    runtime.readyResolve = undefined
    runtime.readyReject = undefined
    return
  }

  const id = typeof payload.id === 'string' ? payload.id : undefined
  if (!id) {
    return
  }
  const pending = runtime.pending.get(id)
  if (!pending) {
    // Orphaned response (probably for a request that already timed out).
    return
  }
  runtime.pending.delete(id)
  if (pending.timeoutHandle) {
    clearTimeout(pending.timeoutHandle)
  }

  if (payload.status === 'ok') {
    runtime.completed += 1
    pending.resolve()
  } else {
    runtime.failed += 1
    const message = typeof payload.message === 'string' ? payload.message : 'voice worker error'
    pending.reject(new Error(message))
  }
}

function failAllPending(runtime: WorkerRuntime, reason: string) {
  const error = new Error(reason)
  for (const [, pending] of runtime.pending) {
    if (pending.timeoutHandle) {
      clearTimeout(pending.timeoutHandle)
    }
    pending.reject(error)
  }
  runtime.pending.clear()
}

function attachProcess(runtime: WorkerRuntime, child: ChildProcessWithoutNullStreams) {
  child.stdout.setEncoding('utf8')
  child.stdout.on('data', (chunk: string) => {
    runtime.stdoutBuffer += chunk
    let newlineIndex = runtime.stdoutBuffer.indexOf('\n')
    while (newlineIndex !== -1) {
      const line = runtime.stdoutBuffer.slice(0, newlineIndex)
      runtime.stdoutBuffer = runtime.stdoutBuffer.slice(newlineIndex + 1)
      handleStdoutLine(runtime, line)
      newlineIndex = runtime.stdoutBuffer.indexOf('\n')
    }
  })

  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk: string) => {
    // Mirror worker diagnostics into the dev server log; do not pollute stdout.
    process.stderr.write(`[voice-worker] ${chunk}`)
  })

  child.on('error', (error) => {
    runtime.state = 'failed'
    runtime.lastError = error.message
    failAllPending(runtime, `voice worker spawn error: ${error.message}`)
    runtime.readyReject?.(error)
    runtime.readyResolve = undefined
    runtime.readyReject = undefined
  })

  child.on('exit', (code, signal) => {
    const reason = signal ? `signal=${signal}` : `code=${code ?? 'null'}`
    const wasReady = runtime.state === 'ready' || runtime.state === 'busy'
    runtime.state = runtime.explicitlyStopped ? 'stopped' : 'failed'
    runtime.pid = undefined
    runtime.process = undefined
    runtime.stdoutBuffer = ''
    if (!runtime.explicitlyStopped && wasReady) {
      runtime.lastError = `worker exited unexpectedly (${reason})`
    }
    failAllPending(runtime, `voice worker exited (${reason})`)
    runtime.readyReject?.(new Error(`voice worker exited before ready (${reason})`))
    runtime.readyResolve = undefined
    runtime.readyReject = undefined
  })
}

export async function startVoiceWorker(): Promise<VoiceWorkerStatus> {
  const runtime = getRuntime()
  if (!isVoiceWorkerEnabled()) {
    return getVoiceWorkerStatus()
  }

  if (runtime.state === 'ready' || runtime.state === 'busy' || runtime.state === 'starting') {
    if (runtime.readyPromise) {
      try {
        await runtime.readyPromise
      } catch {
        // fall through; getVoiceWorkerStatus will reflect the failure
      }
    }
    return getVoiceWorkerStatus()
  }

  const command = process.env.VOICE_WORKER_COMMAND?.trim()
  if (!command) {
    return getVoiceWorkerStatus()
  }

  runtime.state = 'starting'
  runtime.startedAt = new Date().toISOString()
  runtime.lastError = undefined
  runtime.explicitlyStopped = false

  const child = spawn('bash', ['-lc', `exec ${command}`], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  }) as ChildProcessWithoutNullStreams

  runtime.process = child
  runtime.pid = child.pid

  runtime.readyPromise = new Promise<void>((resolve, reject) => {
    runtime.readyResolve = resolve
    runtime.readyReject = reject
  })

  attachProcess(runtime, child)

  try {
    await runtime.readyPromise
  } catch (error) {
    runtime.lastError = error instanceof Error ? error.message : String(error)
  } finally {
    runtime.readyPromise = undefined
  }

  return getVoiceWorkerStatus()
}

export async function stopVoiceWorker(): Promise<VoiceWorkerStatus> {
  const runtime = getRuntime()
  runtime.explicitlyStopped = true

  const child = runtime.process
  if (!child) {
    runtime.state = isVoiceWorkerEnabled() ? 'stopped' : 'unavailable'
    return getVoiceWorkerStatus()
  }

  try {
    child.stdin.end()
  } catch {
    // ignore
  }

  await new Promise<void>((resolve) => {
    const killTimer = setTimeout(() => {
      try {
        child.kill('SIGKILL')
      } catch {
        // ignore
      }
    }, 2000)
    child.once('exit', () => {
      clearTimeout(killTimer)
      resolve()
    })
    try {
      child.kill('SIGTERM')
    } catch {
      // process may already be exiting
    }
  })

  return getVoiceWorkerStatus()
}

export async function runVoiceWorkerRequest(input: {
  textFile: string
  reference: string
  language: string
  output: string
  timeoutMs: number
}): Promise<void> {
  if (!isVoiceWorkerEnabled()) {
    throw new Error('VOICE_WORKER_COMMAND is not configured.')
  }

  const runtime = getRuntime()
  runtime.explicitlyStopped = false

  if (runtime.state !== 'ready' && runtime.state !== 'busy') {
    await startVoiceWorker()
    // Re-read through getVoiceWorkerStatus to widen the type — the await
    // above mutated runtime.state but TS narrowed it from the outer check.
    const afterStart = getVoiceWorkerStatus().state
    if (afterStart !== 'ready' && afterStart !== 'busy') {
      throw new Error(runtime.lastError ?? 'voice worker is not ready')
    }
  }

  const child = runtime.process
  if (!child) {
    throw new Error('voice worker process unavailable')
  }

  // Serialize requests; xtts is single-threaded inside Python.
  let release: () => void = () => {}
  const next = new Promise<void>((resolve) => {
    release = resolve
  })
  const previous = runtime.inflight
  runtime.inflight = previous.then(() => next)

  try {
    await previous
  } catch {
    // previous failure shouldn't block us
  }

  runtime.state = 'busy'

  try {
    runtime.requestCounter += 1
    const requestId = `wr-${Date.now()}-${runtime.requestCounter}`
    const request: WorkerRequest = {
      id: requestId,
      textFile: input.textFile,
      reference: input.reference,
      language: input.language,
      output: input.output,
    }

    const responsePromise = new Promise<void>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        if (runtime.pending.delete(requestId)) {
          reject(new Error(`voice worker request timed out after ${input.timeoutMs / 1000}s`))
        }
      }, input.timeoutMs)
      runtime.pending.set(requestId, { resolve, reject, timeoutHandle })
    })

    try {
      child.stdin.write(JSON.stringify(request) + '\n')
    } catch (error) {
      runtime.pending.delete(requestId)
      throw error instanceof Error ? error : new Error(String(error))
    }

    await responsePromise
  } finally {
    if (runtime.state === 'busy' && runtime.pending.size === 0) {
      runtime.state = 'ready'
    }
    release()
  }
}
