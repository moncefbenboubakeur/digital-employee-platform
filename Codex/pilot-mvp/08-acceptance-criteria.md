# Acceptance Criteria

## Pilot MVP Acceptance

The pilot MVP is ready to show when all items below are true.

## Kiosk Experience

- User can choose Arabic, French, or English.
- User can tap common question buttons.
- User can type a question.
- Known questions return approved answers.
- Unknown questions return safe fallback or generated cautious answer.
- Answer text is visible.
- Audio can play for approved answers.
- Subtitles are visible while audio plays.
- Lite avatar has idle, listening, thinking, and speaking states.
- QR code/action area appears when answer includes an action.
- Human escalation is available when confidence is low.

## Admin Experience

- Admin can create a tenant.
- Admin can create a location.
- Admin can create/edit approved answers.
- Admin can add QR links.
- Admin can review unknown questions.
- Admin can approve, edit, reject, or merge answer candidates.
- Admin can see top questions.
- Admin can see cache hit/miss counts.
- Admin can see language usage.

## Data And Logging

- Every interaction creates a QuestionEvent.
- Cache hit/miss is recorded.
- Language is recorded.
- Matched answer id is recorded when available.
- Unknown questions become AnswerCandidate records.
- Cost estimate is recorded when provider calls happen.

## Safety

- System does not invent document requirements when knowledge is missing.
- Low-confidence answer escalates to staff.
- Out-of-scope questions are refused or redirected.
- No private personal data workflow is required in MVP.
- Admin approval is required before an answer becomes reusable.

## Cost Control

- Lite First mode works without premium avatar API.
- Adaptive Hybrid mode can choose cached media when available.
- Daily budget setting exists, even if first version is simple.
- Provider failures fall back to cheaper display modes.

## Performance Targets

Cached answer:

- text appears in under 1 second
- cached audio starts in under 2 seconds

Unknown answer:

- first useful response appears in under 5 seconds when provider is available
- fallback appears in under 2 seconds when provider is unavailable

## Demo Dataset

At least:

- 12 approved questions
- 3 QR actions
- 2 languages fully populated
- 1 unknown question review example
- 1 fallback/escalation example

## First Pilot Success Metrics

During a real pilot, measure:

- total questions per day
- cache hit rate
- unknown question rate
- top repeated questions
- language distribution
- staff escalation count
- average response latency
- estimated cost per interaction
- customer satisfaction

## Go/No-Go For Next Phase

Go to premium avatar integration only if:

- the kiosk answers useful questions
- admin review loop works
- cache hit rate improves over time
- customer sees operational value
- cost remains predictable

Do not invest heavily in premium avatar realism before this is true.
