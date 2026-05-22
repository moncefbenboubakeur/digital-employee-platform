# LAPI setup for DEP

DEP's receptionist LLM features (`DR_LLM_MATCH`, `DR_LLM_DRAFTS`) route
through **LAPI** (the local llmbridge daemon) — DEP no longer holds
provider credentials directly.

## Prerequisites

1. LAPI v2.2.0+ installed at `/Volumes/My Book Duo-1/Dev/LAPI`
   (https://github.com/moncefbenboubakeur/LAPI)
2. The two DEP project YAMLs created at `~/.llmbridge/projects/`:
   - `dep-match.yaml` — matcher (interactive, latency-sensitive)
   - `dep-drafter.yaml` — drafter (background, latency-tolerant)

Both YAMLs are checked in under `docs/lapi-setup-templates/` and need to
be copied to `~/.llmbridge/projects/` (the daemon's config dir, in your
home, NOT in this repo).

## One-time setup

### 1. Copy the project YAMLs

```bash
mkdir -p ~/.llmbridge/projects
cp /Volumes/My\ Book\ Duo-1/Dev/DigitalEmployeePlatform/docs/lapi-setup-templates/*.yaml \
   ~/.llmbridge/projects/
```

### 2. Start the LAPI daemon

```bash
cd /Volumes/My\ Book\ Duo-1/Dev/LAPI
# If using claude-api (paid Anthropic API), export your key for LAPI to use:
export ANTHROPIC_API_KEY=sk-ant-...
npx tsx src/cli.ts start
```

Expected boot output includes:
```
[llmbridge] claude-api backend enabled (model: claude-haiku-4-5; legacy alias: claude-code)
[llmbridge] listening on http://127.0.0.1:9999
```

### 3. Enable the DEP features

In DEP's `.env`:
```bash
DR_LLM_MATCH=1
DR_LLM_DRAFTS=1
```

That's it — no `ANTHROPIC_API_KEY` in DEP's env. The LAPI daemon holds
the key; DEP just reads `~/.llmbridge/auth.token` to authenticate to
the daemon.

## Changing which backend handles each feature

To switch the matcher from paid claude-api to free claude-cli
(subscription-backed), edit `~/.llmbridge/projects/dep-match.yaml`:

```yaml
name: dep-match
backend: claude-cli       # was: claude-api
tools:
  read: false
  write: false
  shell: false
  web: false
```

…and restart the LAPI daemon. **No DEP code change.** The matcher will
now draw from your Claude Pro/Max subscription quota instead of paid
API credits. Trade-off: latency goes from ~500ms (Haiku) to ~3-7s
(claude-cli subprocess spawn).

Available backend choices (per LAPI v2.2.0):

| Backend | Latency | Cost | Notes |
|---|---|---|---|
| `claude-api` | ~500ms | per-token | needs `ANTHROPIC_API_KEY` in LAPI daemon env |
| `claude-cli` | ~3-7s | free subscription | needs `claude` CLI installed + logged in |
| `codex-cli` | ~6-7s | free subscription | needs `codex` CLI installed + logged in |
| `gemini-cli` | ~12s | free / Code Assist | needs `gemini` CLI; sunsetting 2026-06-18 |
| `agy-cli` | ~9s | free Antigravity | needs `agy` CLI installed + logged in |
| `mock` | instant | free | echoes input — for local dev only |

LAPI v2.3.0 will add `openai-api` (paid ChatGPT API, fast) and
`gemini-api` (paid Google AI API, fast) as additional fast paid options.

## Troubleshooting

**Features stay disabled even with `DR_LLM_MATCH=1`** — the gate also
requires LAPI to be configured (`~/.llmbridge/auth.token` exists). Run
the LAPI daemon at least once to create the token, then restart DEP.

**`[llm-match] LAPI call failed`** in the DEP logs — the daemon isn't
running, or the project YAML is missing/misconfigured. Check daemon
boot logs at the terminal that runs `npx tsx src/cli.ts start`, and
verify `~/.llmbridge/projects/dep-match.yaml` exists.

**Wrong model used** — the daemon's `LLMBRIDGE_CC_MODEL` env var picks
the underlying Anthropic model (default: `claude-haiku-4-5`). Override
in the daemon's start environment, not DEP's `.env`.

## Architecture diagram

```
DEP Next.js server (port 3010)
    │
    │  HTTP POST  http://127.0.0.1:9999/v1/messages
    │  Authorization: Bearer <LAPI token>
    │  X-Project: dep-match | dep-drafter
    │  body: { model: 'claude-api', output_config: {...}, ... }
    ▼
LAPI daemon (port 9999)
    ├── reads ~/.llmbridge/projects/<project>.yaml → picks backend
    ├── enforces tool policy
    ├── records audit log entry
    │
    │  delegates to one of:
    ▼
claude-api  | claude-cli | codex-cli | gemini-cli | agy-cli | ollama | mock
   │            │            │           │           │         │       │
   ▼            ▼            ▼           ▼           ▼         ▼       ▼
Anthropic   `claude`     `codex`     `gemini`     `agy`    Ollama   (stub)
   API        CLI          CLI          CLI         CLI    127.0.0.1
   (key)    (Claude     (ChatGPT     (Google      (Google :11434
            Pro/Max)    Plus/Pro)    Code         OAuth)
                                    Assist)
```
