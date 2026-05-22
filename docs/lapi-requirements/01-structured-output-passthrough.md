# LAPI Requirement 01 — Structured-output passthrough

**Status:** ✅ RESOLVED in LAPI v2.2.0 (commit ec62b94, 2026-05-22)
**Filed:** 2026-05-22
**Affects LAPI version:** v2.1.0 (fixed in v2.2.0)
**Reporter:** DEP integration (first feature consumed: receptionist LLM match + draft)

---

**Resolution note:** Shipped as v2.2.0 the same day. Three layers patched
(`LlmCall.outputConfig` added; both adapters parse-and-thread; claude-api
backend forwards to SDK with json_object → permissive json_schema
translation for SDK compatibility). 11 new tests across the three layers.
DEP can now route both `llm-match.ts` and `llm-drafts.ts` through LAPI
without code changes to their schemas — just swap the SDK transport. See
LAPI's README "Structured output (v2.2.0)" section for the wire shape.

## What

LAPI's `/v1/messages` adapter (Anthropic shape) must pass the
`output_config` parameter through from the inbound HTTP request to the
backend. Specifically the `output_config.format` field which carries
the model's structured-output instructions:

- `{ type: 'json_schema', schema: <jsonschema> }` — force JSON matching
  a schema
- `{ type: 'json_object' }` — force JSON without a fixed schema
- Future formats Anthropic adds

The adapter currently parses inbound bodies with a strict Zod schema
that only accepts `{ model, max_tokens, messages, system, stream }` —
everything else gets silently dropped. So `output_config` never reaches
the backend even when the caller sends it.

Equivalent passthrough is needed in the OpenAI-shape adapter
(`/v1/chat/completions`) for the OpenAI structured-output surfaces:
`response_format: { type: 'json_object' }` and
`response_format: { type: 'json_schema', json_schema: {...} }`.

The relevant `claude-api` backend already accepts arbitrary
Anthropic-SDK options when it calls `client.messages.create(...)` —
it's the adapter's input schema that strips them out, not the backend
that can't handle them.

## Why

DEP has two LLM call sites that depend on structured output and
**cannot tolerate free-form text responses**:

1. **`lib/digital-receptionist/server/llm-match.ts`** — visitor-question
   matcher. Sends a catalog of approved answers plus the visitor's
   question, expects back JSON with `matchedAnswerId` (string|null)
   and `confidence` (high|medium|low). Downstream:
   `JSON.parse(textBlock.text)` then strict field-shape checks at
   lines 109-117. Without schema enforcement the model commonly
   returns:
   - "I think the matching id is `answer-3` with high confidence."
     → parse fails → returns null → fallback to keyword matching →
     user gets wrong answer
   - JSON wrapped in markdown code fences → parse fails
   - Trailing commentary after the JSON → parse fails

2. **`lib/digital-receptionist/server/llm-drafts.ts`** — trilingual
   draft generator for unknown questions. Sends the visitor's
   question, expects back JSON with `{ ar, fr, en }` all string.
   Downstream: `JSON.parse(textBlock.text)` then strict 3-language
   field check at lines 143-150. Same failure modes as above.

Both features are user-facing on the kiosk; silent fallbacks degrade
the experience without any audit signal. Both are gated by env vars
(`DR_LLM_MATCH=1` / `DR_LLM_DRAFTS=1`) so they're explicitly opt-in,
which makes a flaky structured-output story even worse — the operator
turned them on expecting them to work.

This is the #1 LAPI gap surfaced by attempting to consume the daemon
from a real product. Until it's fixed, DEP cannot route either of
its two LLM call sites through LAPI.

## Current LAPI behavior

`/Volumes/My Book Duo-1/Dev/LAPI/src/adapters/anthropic.ts`:

```ts
const requestSchema = z.object({
  model: z.string(),
  max_tokens: z.number().int().positive(),
  messages: z.array(messageSchema).min(1),
  system: z.string().optional(),
  stream: z.boolean().optional().default(false),
})
```

Inbound `output_config` field is silently stripped by `.safeParse()`.
Backend never sees it. Model returns free-form text.

Symptom on the wire: caller sends a properly-shaped Messages API
request including `output_config`, gets back a 200 with text content,
but the text is not the expected JSON shape because the model wasn't
told to constrain it.

`src/backends/claude-api/index.ts` constructs the SDK call from the
internal `LlmCall` type, which doesn't carry `output_config` either.
So even if the adapter passed it through, the backend would need a
matching field to forward.

`src/types.ts` `LlmCall`:

```ts
export type LlmCall = {
  project: string
  messages: LlmMessage[]
  toolsRequested: ToolCategory[]
  stream: boolean
  depth: number
  signal?: AbortSignal
}
```

No `outputConfig` / `responseFormat` field.

## Proposed shape

Three coordinated changes inside LAPI:

**1. Extend `LlmCall` in `src/types.ts`** with an optional structured-
output field:

```ts
export type StructuredOutputSpec =
  | { type: 'json_object' }
  | { type: 'json_schema'; schema: Record<string, unknown> }

export type LlmCall = {
  // ... existing fields ...
  /**
   * Optional structured-output constraint. When set, backends MUST
   * forward it to their underlying provider (Anthropic
   * `output_config.format`, OpenAI `response_format`, etc.). Backends
   * that can't honor it should still return a successful response;
   * callers that strictly need it will see the failure as a JSON
   * parse error downstream.
   */
  outputConfig?: { format: StructuredOutputSpec }
}
```

**2. Anthropic adapter** (`src/adapters/anthropic.ts`):

```ts
const structuredFormatSchema = z.union([
  z.object({ type: z.literal('json_object') }),
  z.object({
    type: z.literal('json_schema'),
    schema: z.record(z.string(), z.unknown()),
  }),
])

const requestSchema = z.object({
  // ... existing ...
  output_config: z
    .object({ format: structuredFormatSchema })
    .optional(),
})

// in the LlmCall construction:
const call: LlmCall = {
  // ... existing ...
  outputConfig: parsed.data.output_config,
}
```

**3. OpenAI adapter** (`src/adapters/openai.ts`):

```ts
const requestSchema = z.object({
  // ... existing ...
  response_format: z
    .union([
      z.object({ type: z.literal('json_object') }),
      z.object({
        type: z.literal('json_schema'),
        json_schema: z.object({
          name: z.string().optional(),
          schema: z.record(z.string(), z.unknown()),
          strict: z.boolean().optional(),
        }),
      }),
    ])
    .optional(),
})

// Map OpenAI shape → internal StructuredOutputSpec when constructing LlmCall.
```

**4. Claude-API backend** (`src/backends/claude-api/index.ts`): when
`call.outputConfig` is set, pass it through:

```ts
const response = await client.messages.create({
  model: this.model,
  max_tokens,
  system,
  messages,
  ...(call.outputConfig ? { output_config: call.outputConfig } : {}),
})
```

**5. Other backends** (mock, claude-cli, codex-cli, gemini-cli,
agy-cli, ollama, codex-pty): document that they may ignore
`outputConfig` since CLI binaries don't typically expose structured-
output flags. The contract is "best effort"; consumers must still
validate the response.

**6. Tests**:
- Anthropic adapter test: send a request with `output_config`, verify
  the backend receives it via a stub backend that records its call.
- OpenAI adapter test: same with `response_format`.
- Claude-api backend test: verify the SDK call includes
  `output_config` when set.
- E2E test: full round-trip via OpenAI adapter with `response_format:
  { type: "json_schema", json_schema: {...} }` against a stubbed
  Anthropic client that asserts the parameter was forwarded.

## Workaround (if we choose to defer the fix)

There is **no clean workaround in DEP** that keeps the experiment
honest. Options I considered and rejected:

- **Strip `output_config` in DEP, parse loosely.** Would have to add
  a permissive JSON extractor (regex out the first `{...}` block,
  retry on parse failure, fall back to keyword matching). Adds
  complexity to DEP for a problem LAPI is meant to solve. Also
  silently changes behavior — the operator turns on `DR_LLM_MATCH=1`
  expecting reliable matching and gets flakiness.

- **Use `mock` backend until LAPI is fixed.** Doesn't actually
  exercise the integration; defers the question, doesn't answer it.

- **Direct Anthropic SDK call** (already-existing code path). Would
  violate the no-fallback rule.

So: **no workaround that consumes LAPI honestly. DEP integration of
these two features is blocked until this requirement is shipped.**

## Estimated scope

Small, well-bounded:

- ~30 lines in `src/types.ts`
- ~20 lines added to each of the two adapters
- ~5 lines in the claude-api backend
- ~6 new tests
- Total: probably under 200 lines including tests

Estimated work: 2-3 hours including TDD discipline + tests + live
verification with one of DEP's two call sites as the smoke test.

## Decision needed

Pick one:

1. **Lift the LAPI seal for this fix.** Ship as v2.2.0 (minor bump
   because it adds a feature). Both DEP call sites can then route
   through LAPI as designed. Probably the right call — without
   structured output LAPI can only handle a fraction of real
   production use cases.

2. **Authorize a one-off direct-SDK exception** for these two
   files. DEP keeps using the Anthropic SDK for now; the rest of
   any future DEP LLM calls go through LAPI. Defers the LAPI fix
   indefinitely. Honest but skips the actual problem.

3. **Defer the DEP feature.** Don't route llm-match / llm-drafts
   anywhere yet; pick a different DEP LLM use case (intent
   classification, summarization, etc.) that doesn't need
   structured output for the first integration. The drafted-text
   path is more permissive — could route through LAPI as-is.

4. **Other** — your call.
