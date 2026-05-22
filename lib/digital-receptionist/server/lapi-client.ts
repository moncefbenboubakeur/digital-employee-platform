import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * Shared helper for talking to the LAPI (llmbridge) daemon.
 *
 * DEP no longer talks to provider APIs (Anthropic, OpenAI, Google) directly.
 * Every LLM call goes through the local LAPI daemon on http://127.0.0.1:9999.
 * The daemon owns the provider credentials (API keys, OAuth tokens from
 * subscription CLIs); DEP only carries the LAPI auth token, which is just a
 * bearer secret created by the daemon when it first started.
 *
 * Override the defaults via env:
 *   - LAPI_BASE_URL   — daemon URL (default: http://127.0.0.1:9999)
 *   - LAPI_TOKEN_PATH — auth token file (default: ~/.llmbridge/auth.token)
 */

const DEFAULT_BASE_URL = 'http://127.0.0.1:9999'
const DEFAULT_TOKEN_PATH = join(homedir(), '.llmbridge', 'auth.token')

let cachedToken: string | undefined

export function lapiBaseUrl(): string {
  return process.env.LAPI_BASE_URL ?? DEFAULT_BASE_URL
}

export function lapiTokenPath(): string {
  return process.env.LAPI_TOKEN_PATH ?? DEFAULT_TOKEN_PATH
}

/**
 * Returns `true` when an LAPI auth token file is present on disk. Used by
 * feature gates so the kiosk doesn't enable LLM-backed paths when the
 * daemon isn't set up.
 *
 * NOTE: this does NOT confirm the daemon process is running — only that
 * a token has been written. If the daemon is stopped, the first actual
 * call will fail with a connection error and DEP logs a warning. Adding
 * a /healthz probe to this check would be cleaner; v2 follow-up.
 */
export function lapiIsConfigured(): boolean {
  try {
    return existsSync(lapiTokenPath())
  } catch {
    return false
  }
}

/**
 * Reads and caches the LAPI auth token. Throws if missing — callers
 * should guard with `lapiIsConfigured()` first, or be ready to catch.
 */
export function getLapiAuthToken(): string {
  if (cachedToken) return cachedToken
  cachedToken = readFileSync(lapiTokenPath(), 'utf8').trim()
  return cachedToken
}
