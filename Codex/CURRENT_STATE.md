# Current State Checkpoint

Updated: 2026-05-16

## Latest Session Update

The prototype now has the first convincing pilot loop for a Lite First receptionist:

- Prisma + SQLite schema in `prisma/schema.prisma`
- seed script in `prisma/seed.ts`
- local DB configured through `.env`
- default SQLite URL currently points to `/private/tmp/digital-employee-platform-dev.db`
  because this external volume path contains spaces and Prisma's SQLite engine failed
  against `file:./dev.db`
- protected `/admin` with simple password login at `/admin/login`
- public `/kiosk`
- operations/admin additions:
  - kiosk device heartbeat
  - device status view
  - activity/audit log UI
  - pilot analytics UI
  - local admin password change UI
  - session expiry display
  - clear demo/local mode settings banner
- API routes:
  - `/api/pilot`
  - `/api/answers`
  - `/api/unknown-questions`
  - `/api/events`
  - `/api/import-export`
  - `/api/devices`
  - `/api/admin-settings`
  - `/api/auth/login`
  - `/api/auth/logout`
  - `/api/auth/session`
  - `/api/voice-library`
  - `/api/voice-library/preview/[id]`
  - `/api/voice-settings`
  - `/api/answer-audio`
- admin and kiosk now share backend data instead of browser-only storage
- admin setup, FAQ editor, review queue, reset, and import/export now write through API routes
- imported the AlgeriaTechGen local voice library:
  - 98 presets in `storage/voice-library`
  - 8 macOS `say` previews and 90 XTTS previews
  - Arabic/French/English voice settings in the admin Settings tab
  - generated approved-answer WAV cache in `storage/answer-audio`
  - `VOICE_COMMAND`-based local XTTS generation for known approved answers
  - browser TTS remains as fallback for unknown/escalation answers
  - replay, stop, mute controls, and persisted local mute preference
- browser flow verified: login -> kiosk unknown question -> admin approval -> kiosk approved backend answer
- latest browser smoke verified:
  - cached known-answer WAV request returned `x-voice-cache: hit`
  - admin Settings showed the 98-preset voice library
  - kiosk unknown question -> admin approval -> kiosk reused approved answer

Default local admin password:

```txt
pilot-admin
```

Working directory:

```txt
/Volumes/My Book Duo-1/Dev/DigitalEmployeePlatform
```

## Why This File Exists

This file is the handoff checkpoint for the current strategy and build direction. If context gets compacted or a future session starts cold, read this file first, then continue from the "Next Step" section.

## Product Split

There are two related but separate products:

1. **AlgeriaTechGen**  
   Existing repo/product. A batch article-to-video studio for AlgeriaTech content.

2. **New digital-employee startup**  
   A separate startup/product branch for live AI receptionists, kiosks, company reception, malls, government offices, and later content/learning products.

Important decision:

```txt
Do not turn AlgeriaTechGen directly into the kiosk startup.
Use AlgeriaTechGen as source inspiration and reusable architecture.
Build the new startup in a fresh repo when implementation starts.
```

## What Was Learned From Existing Code

AlgeriaTechGen already contains much more than TTS:

- project/data model with Prisma + SQLite
- script and Decision Radar editor
- asset uploads
- local TTS through `VOICE_COMMAND`
- voice preset library with previews
- Wav2Lip and SadTalker avatar adapters
- static portrait fallback
- Remotion rendering
- subtitles
- YouTube/export packaging
- generated manifests
- rerender/repackage jobs
- DB-backed job lock
- stuck job recovery
- voice/avatar logs
- actual generated outputs on disk

Current code supports avatar modes:

```txt
static_portrait
local_command
wav2lip
sadtalker
```

HeyGen is validated manually and documented, but not implemented in code yet.

## Existing HeyGen Findings

Manual HeyGen T0 tests are documented in:

```txt
docs/heygen-t0-walkthrough.md
```

Key conclusion:

- HeyGen quality passed strongly for French and Arabic.
- Arabic Algeria voice exists in HeyGen voice catalog.
- Avatar III quality appears good enough for AlgeriaTechGen.
- HeyGen integration is a good future path for AlgeriaTechGen content production.

But for the new startup:

```txt
Do not make premium HeyGen live avatar the first MVP dependency.
Start with Lite First kiosk experience.
```

## New Startup Strategic Decisions

The startup should start from the bottom of the avatar-cost ladder:

1. Lite First
2. Adaptive Hybrid
3. Budgeted Premium
4. Full Live Premium

Product strategy:

```txt
Build the cheap, reliable, cached, useful assistant first.
Add premium avatar providers after the answer/cache/admin loop works.
```

The real startup value is:

```txt
Reliable localized digital employee
  + controlled knowledge
  + cached approved answers
  + budget-safe media policy
  + Arabic/French/English support
  + admin improvement loop
```

The avatar is the face. The answer/cache/governance system is the business.

## Documentation Created

### Main Startup Workspace

Root:

```txt
Codex/README.md
```

Core sections:

- `Codex/company/`
- `Codex/products/`
- `Codex/platform/`
- `Codex/business/`
- `Codex/execution/`

### Reusable Core Transfer Pack

Created:

```txt
Codex/reusable-core-transfer/
```

Purpose:

Capture what should transfer from AlgeriaTechGen into the new startup.

Key docs:

- `README.md`
- `01-transfer-strategy.md`
- `02-source-module-map.md`
- `03-target-startup-architecture.md`
- `04-adapter-contracts-draft.md`
- `05-migration-roadmap.md`
- `06-commercial-and-licensing-notes.md`

Core transfer decision:

```txt
Transfer architecture patterns, not the AlgeriaTech product.
```

Reusable:

- adapter/factory pattern
- job orchestration
- local command runner
- logs
- catalogs
- storage/artifacts
- generated media cache thinking
- cost-aware fallback policy

Do not transfer as core:

- Decision Radar
- article scraping
- YouTube packaging
- AlgeriaTech-specific scripts
- non-commercial local AI engines as production dependencies

### Pilot MVP Pack

Created:

```txt
Codex/pilot-mvp/
```

Purpose:

Define the first buildable pilot.

Key docs:

- `README.md`
- `01-pilot-product-definition.md`
- `02-kiosk-user-flow.md`
- `03-admin-flow.md`
- `04-first-data-model.md`
- `05-knowledge-and-answer-policy.md`
- `06-build-roadmap.md`
- `07-demo-script.md`
- `08-acceptance-criteria.md`
- `09-clickable-prototype-spec.md`
- `10-prototype-implementation-plan.md`

Current MVP recommendation:

```txt
Lite First Digital Receptionist
for a small public office, branch, mall desk, or company reception.
```

## Pilot MVP Definition

First MVP should include:

- language selector: Arabic/French/English
- simple kiosk screen
- typed input first
- quick question buttons
- approved answer cache
- visible answer text
- browser TTS Voice Lite
- subtitles
- lite 2D/static avatar
- QR action area
- safe fallback answer
- admin answer editor
- unknown question review
- usage/event logging
- simple budget policy

First MVP should not include:

- premium live avatar
- full HeyGen integration
- identity verification
- payments
- private account lookup
- complex government/backend integrations
- full document-ingestion automation

## Runtime Flow

```txt
Visitor chooses language
  -> asks via button or typed input
  -> system normalizes question
  -> searches approved cached answers
  -> if match: answer immediately
  -> if no match: generate cautious answer from approved knowledge, or safe fallback
  -> show text/subtitles/audio/lite avatar
  -> log event
  -> store unknown question for admin review
```

Admin approval must not block the live visitor.

## Admin Flow

```txt
Admin creates tenant/location
  -> adds services, FAQs, documents, QR links
  -> publishes approved answers
  -> reviews unknown questions later
  -> edits/approves/rejects candidates
  -> optionally upgrades useful answers to premium media later
```

## First Data Model Draft

Main entities:

- Tenant
- Location
- KioskDevice
- Persona
- KnowledgeSource
- Answer
- AnswerCandidate
- CachedMedia
- QuestionEvent
- BudgetPolicy
- CostLedger
- QRAction

The first implementation should prioritize:

1. Tenant
2. Location
3. KioskDevice
4. KnowledgeSource
5. Answer
6. AnswerCandidate
7. CachedMedia
8. QuestionEvent
9. BudgetPolicy

## Commercial/Licensing Warning

Current local engines in AlgeriaTechGen are not automatically commercial-safe:

- XTTS setup references CPML/non-commercial constraints.
- Wav2Lip setup references research/non-commercial constraints.
- SadTalker setup references research/non-commercial constraints.

For the new startup:

```txt
Use these as prototypes/benchmarks only unless licensing is resolved.
Prefer commercial APIs or owned lightweight avatar rendering for paid pilots.
```

## Current Recommendation

Current next completed:

```txt
Built the shared pilot backend, protected admin console, operations/settings views,
imported voice preset management, and cached local WAV answer audio for the kiosk.
```

Prototype routes:

```txt
/
/kiosk
/admin
```

Prototype implementation files:

```txt
app/
components/digital-receptionist/
lib/digital-receptionist/
```

Current implementation includes:

- SQLite/Prisma shared pilot backend
- protected admin login and admin-only writes
- approved answer library shared by kiosk/admin
- unknown question queue shared by kiosk/admin
- keyword matching
- Arabic/French/English answer switching
- Lite 2D avatar states
- imported Arabic/French/English voice library with admin voice selection
- cached approved-answer WAV audio through `VOICE_COMMAND`
- browser TTS fallback with replay/stop/mute
- QR/direction/contact/escalation action panel
- admin answer editor
- admin approval/rejection/out-of-scope flow
- kiosk device heartbeat and operations view
- audit/activity view
- analytics dashboard
- pilot import/export and reset

Do next:

```txt
Customize the first real Algerian pilot scenario, then prepare a deployment/demo package
for a live customer walkthrough.
```

## Full Handoff Status

This is the current canonical project for the new startup:

```txt
/Volumes/My Book Duo-1/Dev/DigitalEmployeePlatform
```

Do not continue new-startup implementation in:

```txt
/Volumes/My Book Duo-1/Dev/AlgeriaTechGen
```

AlgeriaTechGen remains the separate article-to-video product. It should be used only as source inspiration for reusable patterns.

### Current App Status

The clean startup root contains a minimal Next.js app for the Lite First Digital Receptionist prototype.

Implemented routes:

- `/` demo switcher
- `/kiosk` visitor-facing multilingual kiosk
- `/admin` protected admin dashboard
- `/admin/login` simple local password login

Implemented prototype behavior:

- SQLite/Prisma local pilot backend
- protected admin writes
- approved-answer library shared by kiosk/admin
- unknown-question queue shared by kiosk/admin
- keyword-based question matching
- Arabic/French/English switching
- browser-rendered Lite 2D avatar
- avatar states: idle, thinking, speaking, fallback
- imported local voice library with 98 Arabic/French/English presets
- admin voice selection for Arabic/French/English
- approved-answer WAV generation and cache through `/api/answer-audio`
- browser TTS fallback for unknown/escalation answers
- replay, stop, mute, and persisted local mute preference
- QR/direction/contact/escalation action panel
- admin answer editing
- admin approval/rejection/out-of-scope flow
- kiosk device heartbeat
- operations/audit view
- pilot analytics
- import/export/reset
- localStorage only for browser preferences/local fallback

Not implemented yet:

- LLM calls
- STT
- HeyGen/D-ID
- paid/commercial TTS provider
- premium avatar cache
- billing/cost ledger backend
- production multi-tenant auth
- full tenant/location CRUD beyond the first pilot profile editor

### Important Files

Project shell:

```txt
README.md
package.json
app/page.tsx
app/kiosk/page.tsx
app/admin/page.tsx
app/layout.tsx
app/globals.css
```

Prototype UI:

```txt
components/digital-receptionist/kiosk-prototype.tsx
components/digital-receptionist/admin-prototype.tsx
components/digital-receptionist/lite-avatar.tsx
components/digital-receptionist/use-prototype-store.ts
```

Prototype logic/data:

```txt
lib/digital-receptionist/demo-data.ts
lib/digital-receptionist/prototype-logic.ts
lib/digital-receptionist/prototype-logic.test.ts
lib/digital-receptionist/voice-lite.ts
lib/digital-receptionist/voice-library.ts
lib/digital-receptionist/server/voice-library.ts
lib/digital-receptionist/server/voice-audio.ts
lib/digital-receptionist/server/storage.ts
scripts/generate_voice.py
scripts/chunk_script.py
storage/voice-library/
storage/answer-audio/
```

Strategy docs:

```txt
Codex/README.md
Codex/pilot-mvp/README.md
Codex/pilot-mvp/09-clickable-prototype-spec.md
Codex/pilot-mvp/10-prototype-implementation-plan.md
Codex/reusable-core-transfer/README.md
```

### Verification Already Done

In `/Volumes/My Book Duo-1/Dev/DigitalEmployeePlatform`:

```txt
npm install
npm test
npm run lint
npm run build
```

All passed after fixes.

Smoke-tested with HTTP/browser requests:

- `/` returned Digital Receptionist Demo
- `/kiosk` returned Digital Receptionist / Questions rapides
- `/admin` returned Digital Receptionist Admin / Approved Answers / Unknown Questions
- Playwright browser flow passed:
  kiosk unknown question -> admin login -> review approval -> kiosk approved answer reuse
- Voice library/API smoke passed:
  - `/api/voice-library` returned 98 presets
  - `/api/voice-library/preview/xtts.nova_hogarth.en` returned WAV audio
  - `/api/answer-audio?answerId=required-documents&language=en` returned WAV audio with `x-voice-cache: hit`
- Playwright also verified admin Settings voice library visibility and kiosk known-answer cached audio request

Current dev server:

```txt
http://localhost:3010
```

At handoff time the server process existed:

```txt
node ./node_modules/.bin/next dev -p 3010
```

If it is not running in the new session, start it with:

```txt
npm run dev -- -p 3010
```

### Known Notes

- `npm install` reported 2 moderate audit vulnerabilities. Do not run `npm audit fix --force` blindly because it may introduce breaking dependency changes.
- This clean root is not initialized as a git repository yet.
- `node_modules` and `.next` are ignored by `.gitignore`.
- The prototype still has no paid API dependencies. It does use local XTTS through the AlgeriaTechGen virtualenv for prototype audio generation.
- The imported XTTS/CPML path is acceptable for local proof-of-concept work, but replace it with a commercial-safe provider or licensed voices before a paid pilot.
- First generation for a new answer/voice/language can be slow. Repeated approved answers should hit `storage/answer-audio` and play quickly.
- AlgeriaTechGen has unrelated pre-existing local changes. Do not revert anything there unless explicitly asked.

### Recommended Next Work

1. Choose the first real Algerian pilot scenario: municipal office, post office branch, mall info desk, company reception, or Sonelgaz/Sonatrach-style enterprise reception.
2. Customize `lib/digital-receptionist/demo-data.ts` with that location's real services, counters, hours, documents, and QR actions.
3. Curate the default Arabic/French/English voices in admin Settings and pre-generate audio for the top 10 approved answers.
4. Improve kiosk polish after live browser review: Arabic RTL, large-screen readability, voice loading states, and admin ergonomics.
5. Add an explicit pilot demo checklist and seed reset flow for customer walkthroughs.
6. Consider initializing git for `DigitalEmployeePlatform`.

### Prompt For New Codex Session

Copy/paste this into Codex after opening `/Volumes/My Book Duo-1/Dev/DigitalEmployeePlatform`:

```txt
We are now working in /Volumes/My Book Duo-1/Dev/DigitalEmployeePlatform, not AlgeriaTechGen.

Read Codex/CURRENT_STATE.md first and continue from the handoff. This is the clean root for the new digital-employee startup. AlgeriaTechGen is a separate article-to-video product and should only be used as source inspiration.

Current app: a Next.js Lite First Digital Receptionist prototype with routes /, /kiosk, and /admin. It uses Prisma/SQLite, keyword matching, Arabic/French/English content, a browser-rendered 2D avatar, unknown-question review, admin approval, local admin auth, imported voice presets, cached local WAV answer audio, and browser TTS fallback. No LLM, STT, HeyGen, D-ID, paid TTS provider, billing, or production multi-tenant auth is integrated yet.

Before changing code, verify the project state with:
npm test
npm run lint
npm run build

Then start or reuse the dev server:
npm run dev -- -p 3010

Next task: pick and customize the first real Algerian pilot scenario, curate voices, pre-generate top answer audio, and tighten kiosk/admin polish for a customer walkthrough.
```

## Immediate Next Step

When continuing, start here:

1. Run `npm test`.
2. Run `npm run lint`.
3. Run `npm run build`.
4. Start `npm run dev -- -p 3010`.
5. Open `/kiosk` and ask "What papers do I need?" to confirm cached WAV playback.
6. Open `/admin` -> Settings and verify the Voice library panel.
7. Customize the first pilot scenario and pre-generate the most important answer audio.

Suggested first implementation approach:

```txt
Canonical startup root:
/Volumes/My Book Duo-1/Dev/DigitalEmployeePlatform

AlgeriaTechGen remains the separate article-to-video product.
```

## Current Git State Note

This clean root is not initialized as a git repository yet.

AlgeriaTechGen still has unrelated pre-existing local changes. Do not revert them unless the user explicitly asks.
