# Build Roadmap

## Phase 1: Clickable Kiosk Prototype

Goal:

Show the core visitor experience without AI complexity.

Build:

- kiosk screen
- language switch
- quick question buttons
- typed question input
- static/lite avatar placeholder
- answer display
- subtitle area
- QR action area

Data:

- hardcoded sample tenant
- hardcoded location
- hardcoded approved answers

Acceptance:

- user can ask common questions
- system answers instantly
- UI feels like a kiosk, not a web form

## Phase 2: Admin Knowledge MVP

Goal:

Let admin manage approved answers.

Build:

- admin dashboard
- tenant/location setup
- create/edit approved answers
- add QR actions
- choose languages
- publish answers to kiosk

Acceptance:

- admin can update answer without code changes
- kiosk uses latest approved answer

## Phase 3: Answer Cache And Event Logging

Goal:

Measure real usage.

Build:

- QuestionEvent table
- cache hit/miss tracking
- normalized question
- matched answer id
- language usage
- top question report

Acceptance:

- every kiosk interaction is logged
- admin can see common and unknown questions

## Phase 4: TTS And Lite Avatar

Goal:

Make the kiosk feel alive at low cost.

Build:

- TTS adapter
- cached audio per approved answer
- browser-based lite avatar
- subtitle sync
- fallback to text if audio fails

Acceptance:

- approved answer can speak
- avatar mouth moves simply with audio
- no premium avatar API required

## Phase 5: Knowledge-Based Unknown Answers

Goal:

Handle questions not manually pre-written.

Build:

- structured knowledge source table
- retrieval from approved knowledge
- LLM answer adapter
- confidence score
- answer candidate storage
- safe fallback when confidence is low

Acceptance:

- unknown questions get cautious helpful answers
- generated candidate appears in admin review
- visitor never waits for admin approval

## Phase 6: Budget Policy

Goal:

Make cost predictable.

Build:

- BudgetPolicy
- CostLedger
- daily cost estimation
- fallback when budget reached
- Lite First and Adaptive Hybrid modes

Acceptance:

- system can choose response quality based on policy
- admin sees estimated cost
- customer cannot be surprised by runaway usage

## Phase 7: Premium Upgrade Queue

Goal:

Add premium media without making it mandatory.

Build:

- premium generation job
- provider adapter for HeyGen/D-ID or equivalent
- admin selects approved answers to upgrade
- premium video saved as CachedMedia
- kiosk plays premium media when available

Acceptance:

- premium media is cached
- repeated known answers do not call premium API every time
- Lite fallback still works

## First 14-Day Build Target

In the first two weeks, build:

- kiosk prototype
- admin answer editor
- answer cache
- event logging
- text-only unknown question capture

Do not build:

- full live avatar
- provider-heavy integrations
- complex document ingestion
- enterprise permissions

## First Demo Target

Demo should answer at least 12 realistic questions for one location in Arabic and French, with QR actions for at least 3 answers.
