import { NextResponse } from 'next/server'
import { lapiBaseUrl, lapiIsConfigured } from '@/lib/digital-receptionist/server/lapi-client'

export const dynamic = 'force-dynamic'
// Short ceiling so a hung daemon doesn't block the admin badge for long.
export const maxDuration = 10

const PROBE_TIMEOUT_MS = 3000

/**
 * Probe the local LAPI daemon's /healthz endpoint and report status to the
 * admin "LAPI health" badge. Cheap (<5ms when up), short timeout when
 * down, no auth required (LAPI's /healthz is unauthenticated).
 *
 * Used by AdminPrototype's <LapiHealthBadge>, polled every 15s. Surfaces
 * "LAPI offline" visibly so silent failures (like the internet-fallback
 * regression caused by a stopped daemon) become obvious to the operator.
 */
export async function GET() {
  if (!lapiIsConfigured()) {
    return NextResponse.json({
      status: 'unconfigured',
      baseUrl: null,
      error: 'LAPI_TOKEN_PATH or LAPI_BASE_URL is missing',
    })
  }

  const baseUrl = lapiBaseUrl()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  const start = Date.now()
  try {
    const res = await fetch(`${baseUrl}/healthz`, { signal: controller.signal })
    const latencyMs = Date.now() - start
    if (!res.ok) {
      return NextResponse.json({
        status: 'offline',
        baseUrl,
        latencyMs,
        error: `LAPI responded ${res.status}`,
      })
    }
    return NextResponse.json({ status: 'online', baseUrl, latencyMs })
  } catch (error) {
    const latencyMs = Date.now() - start
    const message = error instanceof Error ? error.message : String(error)
    // ECONNREFUSED, AbortError (timeout), DNS failure — all "offline" to
    // the operator, the specific cause goes in the error field for tooltip.
    return NextResponse.json({
      status: 'offline',
      baseUrl,
      latencyMs,
      error: message,
    })
  } finally {
    clearTimeout(timer)
  }
}
