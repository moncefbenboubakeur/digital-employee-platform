# LAPI Requirement 02 — Long-lived CLI subprocess sessions

**Status:** Filed — DEP integration measurement, not blocking, but justifies prioritization
**Filed:** 2026-05-22
**Affects LAPI version:** v2.3.0 (current at filing time)
**Reporter:** DEP receptionist matcher benchmark
**Related v2-roadmap item:** "Long-lived subprocess sessions" (was already in the v2.1+ follow-ups list as speculative; this requirement promotes it to data-justified)

## What

LAPI's four subscription-CLI backends (`claude-cli`, `codex-cli`,
`gemini-cli`, `agy-cli`) should support a **long-lived per-project
subprocess** mode where the CLI binary is spawned once per project and
reused across subsequent `Backend.run()` calls, instead of being
spawned fresh per call as v2.3.0 does.

The contract change: `BackendSession.state` carries a live
`ChildProcess` handle (with `stdin`, `stdout`, `stderr` streams). The
session manager's existing idle-eviction logic (15-minute default,
configurable via `LLMBRIDGE_IDLE_TIMEOUT_MIN`) takes care of cleanup
when the project goes quiet.

Each backend needs:
- A way to invoke the CLI in "stay alive, read prompts from stdin"
  mode (verified to exist for all four — they all support interactive
  mode by default; the trick is replacing `--print` / `-p` /
  positional-prompt invocation with stdin-piped prompts).
- A way to detect end-of-response per call. Could be a sentinel line
  (like the existing `codex-pty` backend uses), a heartbeat pattern,
  or a structured JSON output mode if the CLI supports it.
- Error recovery: if the subprocess dies (auth expiry, OAuth refresh,
  CLI crash), the next call detects and re-spawns.

## Why

DEP's receptionist matcher benchmark, run 2026-05-22 against v2.3.0,
showed that **CLI subprocess overhead dominates matcher latency for
realistic prompts**:

| Backend     | Matcher (full 50 catalog) | After embedding pre-filter (top-8) | Speedup |
|-------------|---------------------------|------------------------------------|---------|
| `claude-cli` | 18.04s                    | 19.36s                             | **0.9× (no help)** |
| `codex-cli`  | 14.30s                    | 9.53s                              | 1.5×    |
| `gemini-cli` | 11.00s                    | 12.06s                             | 0.9×    |
| `agy-cli`    | 11.23s                    | 9.58s                              | 1.2×    |

Cutting the LLM input from ~7,500 tokens to ~1,500 tokens via local
embeddings barely moved the needle. The latency floor for CLI
backends is set by:

```
Fork + exec subprocess           ~1-2s
CLI's own auth/config read       ~2-3s
Model load (when CLI cold-starts) ~1-3s
─────────────────────────────────
Fixed cost PER CALL              ~4-8s
```

This fixed cost is paid on every single visitor question today. A
kiosk handling 500 questions/day pays that cold-start tax 500 times.
**With long-lived sessions, it would be paid once at project boot.**

Expected payoff from this requirement, based on the bench
decomposition:

- `codex-cli` matcher (today: ~9-14s) → estimated ~3-5s warm
- `claude-cli` matcher (today: ~18s) → estimated ~7-10s warm (Claude
  Sonnet remains slower than other models — keepalive doesn't fix that)
- `agy-cli` matcher (today: ~11s) → estimated ~4-6s warm
- `gemini-cli` matcher (today: ~11s) → estimated ~4-6s warm (until
  the 2026-06-18 sunset deadline anyway)

Together with the existing embedding pre-filter, that's a credible
path to **3-5s matcher latency on free subscription routing** — within
acceptable kiosk UX territory.

Without this requirement: free-subscription matcher routing is stuck
at 9-18s indefinitely, regardless of input-prompt optimization.

## Current LAPI behavior

`src/backends/claude-cli/index.ts`, `codex-cli/index.ts`,
`gemini-cli/index.ts`, `agy-cli/index.ts` — all four `run()` methods
spawn a brand-new subprocess via `runCliSubprocess()` per call. The
`Backend.open()` returns an empty `BackendSession` with `state: null`
because there's nothing to hold onto between calls.

The CLI subprocess is killed (or naturally exits) at the end of each
`run()`. Cold-start cost is paid every time.

The existing `SessionManager` already supports per-project session
lifecycles and idle eviction; it's just that the current CLI backends
don't put any state in the session.

## Proposed shape

**1. Each CLI backend's `open(project)` spawns the binary** in
interactive (stdin-reading) mode and stashes the `ChildProcess` in
`BackendSession.state`. The first `run()` call against a fresh session
doesn't pay the cold-start (the open() did; the engine treats open
overhead as part of project warm-up, not a per-call cost).

**2. Each backend's `run()` writes the prompt to the child's
stdin** and reads stdout until end-of-response. End-of-response
detection per CLI:

- `claude` — supports `--output-format json` and `--output-format stream-json` (one JSON object per response in stream-json; we know when an object completes). Sentinel-free.
- `codex` — interactive mode prints a known prompt marker between
  turns. Detect that.
- `agy` — interactive mode emits the antigravity prompt symbol `>` on
  a fresh line after each response.
- `gemini` — interactive mode also has a known prompt; specifics need
  verification.

**3. `close(session)`** kills the subprocess cleanly (SIGTERM + 500ms
grace + SIGKILL). The existing session manager calls this when the
project's idle timer expires.

**4. Backwards compatibility**: keep the stateless path as a fallback.
If the long-lived session fails to start (CLI errored, auth expired),
fall back to the v2.3.0 stateless `runCliSubprocess` invocation for
that one call. The next call retries the long-lived path.

**5. Config**: an opt-in env var like `LLMBRIDGE_CLI_KEEPALIVE=1`
during the rollout, defaulting to off for safety. After the bench
proves stability, flip the default.

## Workaround (current state)

Two paths DEP can take today, neither solves the latency floor:

1. **Embedding pre-filter** (already shipped in v2.3.0). Reduces LLM
   input tokens. Helps codex-cli + agy-cli by ~1.5×, doesn't help
   claude-cli / gemini-cli at all. Not sufficient for sub-5s matcher.

2. **Route matcher to a paid API backend** (`claude-api`,
   `openai-api`, `gemini-api`). These don't have the CLI subprocess
   overhead — they hit the provider's HTTP API directly. Sub-second
   matcher response possible, but costs per token (~$0.10-1/day at
   kiosk scale).

Neither workaround eliminates the underlying inefficiency. Cold-
starting a CLI 500×/day per kiosk is wasteful regardless of which
backend handles it.

## Estimated scope

Larger than the v2.2.0 structured-output passthrough — this touches
four backend implementations and adds real subprocess lifecycle
complexity. Rough breakdown:

- Shared session-management helper in `src/backends/_lib/`: ~150 LOC
  + tests
- Per-backend refactor (4 backends × ~80 LOC each): ~320 LOC
- Tests (one stable session, abort during call, recovery from killed
  subprocess, idle eviction integration): ~400 LOC
- Live smoke updates to measure warm-state latencies

Estimated 1-2 days of focused work. v2.4.0 sized.

## Decision needed

Pick one when ready:

1. **Ship v2.4.0 with long-lived sessions.** Lifts the seal, larger
   commit than v2.2.0 but well-bounded. After: re-run DEP's bench
   against v2.4.0; the warm-state numbers will determine whether
   subscription-CLI routing is viable for a production kiosk.

2. **Defer until DEP demonstrates the need with real users.** Maybe
   9-18s matcher latency turns out to be tolerable in practice (users
   pause anyway to think, voice synthesis dominates the perceived
   wait, etc.). Don't ship architectural complexity until product
   validation says it's needed.

3. **Route matcher to a paid API backend instead.** Sidesteps the
   problem; latency becomes sub-second; costs cents per day. Sometimes
   the right product call is to spend the money, not the engineering
   time.

Recommendation depends on whether you intend free-subscription routing
to be the long-term plan for production kiosks. If yes → option 1. If
"free is nice-to-have but we'll pay for fast" → option 3 and defer
this requirement.
