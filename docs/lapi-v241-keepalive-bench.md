# LAPI v2.4.1 keepalive bench — 2026-05-22

Validates the long-lived subprocess sessions shipped in LAPI v2.4.0 / patched in
v2.4.1 against the real provider CLIs (no stubs). Compares against the v2.3.0
baseline where every LAPI call cold-spawned its CLI subprocess.

**Methodology**
- Bench script: [`scripts/lapi-bench.ts`](../scripts/lapi-bench.ts)
- 10 samples per (backend × matcher), 5 per (backend × drafter)
- First sample dropped as warm-up; median / p95 / min / max reported on the rest
- DEP-shaped prompts: 50-entry trilingual catalog matcher + APC-receptionist trilingual drafter
- LAPI daemon restarted on v2.4.1 immediately before the run

## Results

| Backend / Prompt | v2.3.0 (cold/call) | v2.4.1 (warm) | Speedup | Parse v2.3.0 → v2.4.1 |
|---|---:|---:|---:|---|
| `claude-cli` / matcher | 15.42s | **4.78s** | 3.2× | 10/10 → 10/10 |
| `claude-cli` / drafter | 38.89s | **6.38s** | **6.1×** | 2/5 → **5/5** |
| `codex-cli` / matcher  | 7.57s  | **2.11s** | 3.6× | 10/10 → 10/10 |
| `codex-cli` / drafter  | 12.27s | **7.00s** | 1.8× | 5/5 → 5/5 |
| `gemini-cli` / matcher | 8.99s  | 8.93s | 1.0× | 10/10 → 10/10 |
| `gemini-cli` / drafter | 20.77s | 34.38s | 0.6× | 2/5 → 0/5 |
| `agy-cli` / matcher    | 8.48s  | 2.86s | 3.0× | 10/10 → 4/10 |
| `agy-cli` / drafter    | 33.04s | 2.70s | 12.2× | 5/5 → 0/5 |

## Warming signature (first sample vs last sample)

Confirms keepalive on the two backends v2.4.0 actually rewrote:

| Backend / Prompt | Sample 1 | Last sample | Behavior |
|---|---:|---:|---|
| `claude-cli` / matcher | 13.9s | 4.2s | warming — cold spawn, then warm |
| `claude-cli` / drafter | 15.5s | 6.5s | warming |
| `codex-cli` / matcher  | 8.9s | 2.1s | warming |
| `codex-cli` / drafter  | 7.0s | 7.6s | warm by start of drafter run (matcher already warmed it) |
| `gemini-cli` / matcher | 9.5s | 8.9s | flat — stateless, untouched in v2.4.0 |
| `agy-cli` / matcher    | 10.3s | 2.7s | warming-ish, but parse breakage suggests rate-limit not keepalive |

## Caveats

- **`agy-cli`** went from 10/10 parse → 4/10 (matcher) and 5/5 → 0/5 (drafter). The fast 2.7s
  responses are agy returning a short non-JSON message after a few calls — looks like
  the Antigravity free tier throttling, not anything LAPI changed. agy-cli is still
  stateless in v2.4.1 (Bubble Tea TUI requires `/dev/tty`, blocked by `child_process.spawn`).
- **`gemini-cli`** drafter is unstable (one sample timed out at 301s). gemini is
  sunsetting 2026-06-18 for free-tier users; we are migrating to `agy-cli` for Google.
- **First-call cost is unchanged.** Keepalive amortizes spawn, it does not eliminate it.
  Plan for a 9-15s cold spawn on the very first request per project after daemon start.

## DEP routing decisions

Routing pinned at `~/.llmbridge/projects/dep-match.yaml` and `dep-drafter.yaml`:

- `dep-match` → `codex-cli` — 2.11s warm median, 10/10 parse, best latency for a call that
  runs on every visitor utterance.
- `dep-drafter` → `claude-cli` — 6.38s warm median, 5/5 parse, best trilingual output
  quality. Well inside the ~10s background budget.

Fallback to `claude-api` (paid) is the recommended path if subscription quota runs out.

## Raw data

- `scripts/lapi-bench-results.json` — v2.4.1 keepalive run (2026-05-22 15:22Z)
- `scripts/lapi-bench-results-v2.3.0.json` — v2.3.0 cold-spawn baseline (2026-05-22 09:07Z)
