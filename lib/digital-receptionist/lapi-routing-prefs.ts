/**
 * Browser-side localStorage helpers for the admin "LAPI test routing" UI.
 *
 * The kiosk reads these on every matcher/drafter call and forwards the
 * chosen backend via request headers. Persisted in localStorage so the
 * choice survives page reloads but isn't synced server-side — this is a
 * test convenience, not a production routing knob.
 */
import {
  MATCHER_BACKEND_HEADER,
  DRAFTER_BACKEND_HEADER,
  PINNED,
  parseDrafterChoice,
  parseRoutingChoice,
  type DrafterChoice,
  type RoutingChoice,
} from './lapi-routing'

const MATCHER_KEY = 'dep.lapi.matcherBackend'
const DRAFTER_KEY = 'dep.lapi.drafterBackend'

function readRaw(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeRaw(key: string, value: string | null): void {
  if (typeof window === 'undefined') return
  try {
    if (value === null || value === PINNED) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // localStorage disabled — silently fall back to default routing.
  }
}

export function getMatcherBackend(): RoutingChoice {
  return parseRoutingChoice(readRaw(MATCHER_KEY))
}

export function setMatcherBackend(value: RoutingChoice): void {
  writeRaw(MATCHER_KEY, value)
}

export function getDrafterBackend(): DrafterChoice {
  return parseDrafterChoice(readRaw(DRAFTER_KEY))
}

export function setDrafterBackend(value: DrafterChoice): void {
  writeRaw(DRAFTER_KEY, value)
}

/** Headers to attach to a fetch that should respect the current overrides. */
export function routingHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const matcher = getMatcherBackend()
  const drafter = getDrafterBackend()
  if (matcher !== PINNED) headers[MATCHER_BACKEND_HEADER] = matcher
  if (drafter !== PINNED) headers[DRAFTER_BACKEND_HEADER] = drafter
  return headers
}
