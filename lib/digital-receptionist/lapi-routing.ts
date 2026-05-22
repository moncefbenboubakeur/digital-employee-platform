/**
 * Shared backend routing for the matcher and drafter call sites.
 *
 * The admin settings page lets an operator pick which LAPI backend each
 * call site should hit, so they can compare claude-cli vs codex-cli vs
 * agy-cli vs mock without restarting anything. The choice rides on
 * request headers from the kiosk to the API routes, which resolve it to
 * the LAPI project name.
 *
 * The "pinned" choice means "use whatever the production YAML in
 * ~/.llmbridge/projects/dep-match.yaml (or dep-drafter.yaml) says".
 * Any other choice routes to the matching bench-<backend>.yaml project,
 * which is just a one-line YAML with `backend: <backend>` and no tools.
 */

export const MATCHER_BACKEND_HEADER = 'x-dep-matcher-backend'
export const DRAFTER_BACKEND_HEADER = 'x-dep-drafter-backend'

export const PINNED = 'pinned' as const

// Backends the admin UI offers. Must each have a corresponding
// `~/.llmbridge/projects/bench-<id>.yaml` registered with the LAPI daemon.
export const TESTABLE_BACKENDS = [
  'codex-cli',
  'claude-cli',
  'agy-cli',
  'mock',
] as const
export type TestableBackend = (typeof TESTABLE_BACKENDS)[number]

export type RoutingChoice = typeof PINNED | TestableBackend

export const MATCHER_PINNED_PROJECT = 'dep-match'
export const DRAFTER_PINNED_PROJECT = 'dep-drafter'

/** Resolve a routing choice to the LAPI project name. */
export function resolveMatcherProject(choice: RoutingChoice | undefined): string {
  if (!choice || choice === PINNED) return MATCHER_PINNED_PROJECT
  return `bench-${choice}`
}

export function resolveDrafterProject(choice: RoutingChoice | undefined): string {
  if (!choice || choice === PINNED) return DRAFTER_PINNED_PROJECT
  return `bench-${choice}`
}

/** Accept only known values; anything else collapses to pinned. */
export function parseRoutingChoice(value: string | null | undefined): RoutingChoice {
  if (!value) return PINNED
  if (value === PINNED) return PINNED
  if ((TESTABLE_BACKENDS as readonly string[]).includes(value)) {
    return value as TestableBackend
  }
  return PINNED
}
