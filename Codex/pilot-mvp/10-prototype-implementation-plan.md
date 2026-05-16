# Prototype Implementation Plan

## Purpose

This plan turns the clickable prototype spec into an implementation that runs in a clean startup root without turning AlgeriaTechGen into the new startup.

The prototype is a validation artifact. It should help us show the Lite First digital receptionist flow to a potential pilot customer, learn from feedback, and later decide what becomes the production startup application.

## Implementation Decision

Use a fresh Next.js app in the startup workspace.

Do not replace or extend the existing AlgeriaTech AI Presenter Studio home page.

Canonical folder:

```txt
/Volumes/My Book Duo-1/Dev/DigitalEmployeePlatform
```

Prototype routes:

```txt
/        demo switcher
/kiosk   visitor-facing kiosk
/admin   customer/admin dashboard
```

Prototype code folders:

```txt
app/
components/digital-receptionist/
lib/digital-receptionist/
```

This gives us a fast clickable demo while preserving the strategic decision that the kiosk startup is separate from AlgeriaTechGen.

## Scope For First Build

Build:

- local approved answer library
- local unknown question queue
- local session metrics
- keyword-based answer matching
- Arabic/French/English switching
- Lite 2D avatar states
- QR/direction/contact/escalation action panel
- admin answer editing
- admin approval of unknown questions
- localStorage persistence for prototype continuity

Do not build:

- real database
- authentication
- LLM calls
- TTS/STT
- HeyGen/D-ID integration
- billing
- production analytics
- multi-tenant permissions

## Data Model

Create local TypeScript data and logic:

```txt
lib/digital-receptionist/demo-data.ts
lib/digital-receptionist/prototype-logic.ts
```

Main types:

```txt
DemoLanguage
DemoAnswer
DemoAction
UnknownQuestion
QuestionEvent
```

The data should include:

- 12 approved answers
- 3 or more action types
- Arabic/French/English translations
- 3 seed unknown questions
- keyword sets in all supported languages where useful

## State Model

Use browser localStorage through a small client-side store hook.

Create:

```txt
components/digital-receptionist/use-prototype-store.ts
```

The store owns:

- answers
- unknown questions
- question events
- answer updates
- candidate approval/rejection
- metrics

This keeps the kiosk and admin flows connected without a backend.

## Kiosk Page

Create:

```txt
app/kiosk/page.tsx
components/digital-receptionist/kiosk-prototype.tsx
```

The kiosk page should include:

- top language selector
- large Lite avatar area
- answer panel
- quick questions
- typed question input
- action panel
- human escalation button

Behavior:

```txt
visitor asks question
  -> thinking state for a short delay
  -> keyword match approved answer
  -> otherwise create/update unknown candidate
  -> show answer or fallback in selected language
```

## Admin Page

Create:

```txt
app/admin/page.tsx
components/digital-receptionist/admin-prototype.tsx
```

The admin page should include:

- location summary
- metrics strip
- approved answers list
- answer editor
- unknown question queue
- budget policy card
- small kiosk preview link

Behavior:

```txt
admin edits approved answer
  -> saves to localStorage

admin approves unknown question
  -> creates reusable approved answer
  -> removes candidate from active queue
  -> kiosk can answer it after approval
```

## Demo Switcher

Create:

```txt
app/page.tsx
```

This page should stay minimal:

- open kiosk
- open admin
- short status cards for the demo

It is not a marketing page.

## Visual Direction

Use a public-service operational style:

- light surface
- strong readable contrast
- large touch targets
- Arabic/French/English labels
- clear state badges
- restrained accent colors
- no photoreal avatar dependency

The kiosk should feel usable on a wall screen or tablet. The admin should feel like a practical control panel, not a SaaS landing page.

## Verification

Run:

```txt
npm test
npm run lint
npm run build
```

Then start the app:

```txt
npm run dev
```

Manual smoke test:

- open `/`
- open `/kiosk`
- ask a known question
- ask an unknown question
- open `/admin`
- approve the unknown question
- return to `/kiosk`
- ask the same question again

## Next Step

Start the dev server, manually review the kiosk/admin flow, then choose the first pilot scenario to customize.
