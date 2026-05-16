# Migration Roadmap

This roadmap transfers reusable value from AlgeriaTechGen into the new startup without turning the new startup into a copy of the old video studio.

## Phase 0: Freeze The Transfer Scope

Output:

- This transfer pack
- List of reusable modules
- List of modules to leave behind
- Initial adapter contracts

Acceptance:

- New startup has a clear starting architecture.
- AlgeriaTechGen remains untouched as the content studio.

## Phase 1: Create The New Repo Skeleton

Create:

```txt
apps/api
apps/admin-dashboard
apps/kiosk-player
packages/core
packages/adapters
packages/jobs
packages/knowledge
packages/answer-cache
packages/media
packages/billing
packages/observability
```

Transfer conceptually:

- `lib/storage.ts`
- adapter contract shape
- job status shape
- catalog validation shape

Do not transfer:

- article scraper
- Decision Radar
- Remotion templates
- YouTube package builder

Acceptance:

- API starts.
- Admin dashboard starts.
- Kiosk player starts.
- Shared packages compile.

## Phase 2: Build The Answer Cache First

Build:

- Tenant
- Location
- KioskDevice
- KnowledgeSource
- Answer
- AnswerVersion
- CachedMedia
- QuestionEvent

MVP flow:

```txt
typed question -> exact/semantic cache lookup -> answer text displayed
```

Acceptance:

- Admin can create known answers.
- Kiosk can answer known questions without any LLM call.
- Every interaction is logged.

## Phase 3: Add Lite First Live Assistant

Build:

- TTS adapter
- simple 2D/vector/static avatar mode
- subtitles
- language switch
- QR action display
- safe fallback response

Acceptance:

- A small facility can run the kiosk with low cost.
- Known answers are fast.
- Unknown questions can be answered with text/audio/lite avatar.
- No premium avatar API is required for the MVP to work.

## Phase 4: Add Knowledge And Safety Layer

Build:

- document upload
- FAQ import
- retrieval from customer knowledge
- answer confidence
- source citations
- allowed topic policy
- escalation policy

Acceptance:

- Unknown questions are answered only from approved knowledge.
- The kiosk refuses unsafe or out-of-scope questions.
- Admin can review unknown questions after the fact.

## Phase 5: Add Budget And Avatar Policy

Build:

- Lite First
- Adaptive Hybrid
- Budgeted Premium
- Full Live Premium
- daily/hourly budgets
- abuse protection
- cost ledger

Acceptance:

- Tenant can choose avatar policy.
- Tenant can set a max daily budget.
- When budget is reached, system falls back automatically.
- Customer never gets a surprise invoice.

## Phase 6: Add Premium Avatar Providers

Build:

- HeyGen/D-ID or other premium avatar adapter
- premium cached video generation
- batch upgrade queue
- provider catalog
- provider status/cost reporting

Acceptance:

- Admin can select useful answers and upgrade them to premium avatar video.
- Known upgraded answers play from cache.
- Live premium mode is available only for tenants/plans that choose it.

## Phase 7: Pilot Deployment

Pilot targets:

- one small private facility using Lite First
- one medium location using Adaptive Hybrid
- one large company using Budgeted Premium or Full Live Premium

Measure:

- questions per day
- cache hit rate
- unknown question rate
- average latency
- cost per interaction
- number of human escalations avoided
- customer satisfaction

## Recommended First MVP

Start with:

```txt
Admin creates FAQ answers
Kiosk answers known questions
Unknown questions use safe LLM answer from uploaded knowledge
Lite avatar + voice + subtitles
Admin reviews unknown questions later
Popular answers can be upgraded manually
```

This validates the real business before spending too much time on premium avatar realism.
