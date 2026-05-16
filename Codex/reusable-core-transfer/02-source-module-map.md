# Source Module Map

This maps AlgeriaTechGen files to the startup components they inspire.

## Core Adapter Pattern

| Existing source | What to reuse | New startup destination |
|---|---|---|
| `lib/generation/types.ts` | Adapter interfaces and normalized outputs | `packages/adapters/src/contracts.ts` |
| `lib/generation/factory.ts` | Provider selection by mode | `packages/adapters/src/registry.ts` |
| `lib/generation/voice/local-command-voice-adapter.ts` | TTS provider wrapper idea | `packages/adapters/src/tts/*` |
| `lib/generation/avatar/lipsync-avatar-adapter.ts` | Avatar provider wrapper idea | `packages/adapters/src/avatar/*` |
| `lib/generation/avatar/static-avatar-adapter.ts` | Cheap fallback visual mode | `packages/adapters/src/avatar/lite-static.ts` |

## Job System

| Existing source | What to reuse | New startup destination |
|---|---|---|
| `lib/generation/orchestrator.ts` | Step-by-step pipeline shape | `packages/jobs/src/pipelines/*` |
| `lib/generation/job-lock.ts` | DB-backed lock concept | `packages/jobs/src/locks.ts` |
| `lib/generation/recovery.ts` | Stuck job recovery | `packages/jobs/src/recovery.ts` |
| `app/api/projects/[id]/generate/route.ts` | Start job API route pattern | `apps/api/src/routes/jobs.ts` |
| `app/api/projects/[id]/job-status/route.ts` | Poll job status pattern | `apps/api/src/routes/job-status.ts` |

New startup job types:

- `answer_cache_warmup`
- `premium_avatar_generation`
- `knowledge_sync`
- `analytics_rollup`
- `media_repackage`
- `tenant_import`

Live conversations should not depend on long jobs.

## Local Command Runner And Logs

| Existing source | What to reuse | New startup destination |
|---|---|---|
| `lib/generation/local-command/run-local-command.ts` | Run external engines safely | `packages/jobs/src/local-command.ts` |
| `lib/generation/local-command/substitute-template.ts` | Command templating | `packages/jobs/src/template.ts` |
| `app/api/projects/[id]/logs/[step]/route.ts` | Controlled log access | `apps/api/src/routes/logs.ts` |
| `components/editor/log-panel.tsx` | Failure inspection UI | `apps/admin-dashboard/src/components/job-log-panel.tsx` |

This remains useful for self-hosted or experimental providers, but the commercial MVP should prefer providers with clear commercial terms.

## Catalog Pattern

| Existing source | What to reuse | New startup destination |
|---|---|---|
| `lib/voice-library/load-catalog.ts` | Load/validate catalog JSON | `packages/adapters/src/catalogs/load-catalog.ts` |
| `lib/voice-library/types.ts` | Zod-validated catalog records | `packages/adapters/src/catalogs/types.ts` |
| `scripts/seed_voice_library.py` | Seed catalog from available providers | `scripts/seed-provider-catalogs.ts` |
| `components/editor/voice-preset-picker.tsx` | Filterable/rankable provider picker | `apps/admin-dashboard/src/components/provider-picker.tsx` |

New catalog types:

- `VoiceProfile`
- `AvatarProfile`
- `PersonaProfile`
- `LanguageProfile`
- `ProviderCapability`

## Storage And Artifacts

| Existing source | What to reuse | New startup destination |
|---|---|---|
| `lib/storage.ts` | Storage root and safe relative paths | `packages/core/src/storage.ts` |
| `app/api/projects/[id]/assets/route.ts` | Upload validation and asset rows | `apps/api/src/routes/assets.ts` |
| `lib/generation/generation-manifest.ts` | Manifest for generated media truth | `packages/media/src/manifest.ts` |
| `lib/generation/build-bundle-zip.ts` | Export bundle pattern | `packages/media/src/bundles.ts` |

New artifact folders:

```txt
storage/tenants/{tenantId}/
  locations/{locationId}/
    knowledge/
    assets/
    cached-answers/
    generated-audio/
    generated-lite-avatar/
    generated-premium-video/
    logs/
    reports/
```

## Rendering And Media

| Existing source | What to reuse | New startup destination |
|---|---|---|
| `lib/generation/render/remotion-renderer.ts` | Batch composition renderer | `packages/media/src/batch-renderers/remotion.ts` |
| `remotion/*` | Reference for branded batch videos | `apps/content-studio` or `packages/media/remotion` |
| `lib/generation/subtitles.ts` | Simple subtitle generation | `packages/media/src/subtitles.ts` |
| `lib/generation/render/audio-mix.ts` | Voice/music mixing | `packages/media/src/audio-mix.ts` |

Do not use Remotion as the live kiosk renderer. Use React/canvas/Rive/SVG for live 2D avatar responses, then use Remotion only for batch-generated premium videos or reports.

## Product-Specific Code To Leave Behind

These are useful examples but should not become startup platform primitives:

- `lib/output/extract-editor-inputs.ts`
- `lib/output/scrape-article.ts`
- `lib/output/build-youtube-description.ts`
- `lib/output/build-metadata.ts`
- `remotion/compositions/*` as-is
- `DecisionRadar` schema and UI
- AlgeriaTech article selectors
