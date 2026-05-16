# Clickable Prototype Spec

## Purpose

This document defines the first clickable prototype for the Lite First Digital Receptionist.

The goal is to make the product feel real enough to show to a potential pilot customer before building the full backend.

This prototype should answer:

- Does the kiosk experience make sense to a visitor?
- Does the admin workflow make sense to the customer?
- Are cached answers and unknown-question review easy to understand?
- Does the Lite First positioning feel useful without premium avatar realism?

## Prototype Rule

Build only what proves the product flow.

Use hardcoded or local JSON data first. Do not integrate real LLM, TTS, STT, HeyGen, D-ID, database, authentication, or billing in the first clickable prototype.

## Target Demo

The demo should simulate one location:

```txt
Customer type: municipal/public-service style office
Assistant name: Amel
Languages: Arabic, French, English
Avatar mode: Lite 2D
Input modes: quick buttons + typed question
Voice input: disabled in first clickable prototype
Premium avatar: disabled in first clickable prototype
```

## Prototype Pages

### 1. Kiosk Page

Route suggestion:

```txt
/kiosk
```

Primary user:

```txt
Visitor standing in front of the kiosk
```

The kiosk page should be full-screen and touch-friendly.

It should include:

- language selector
- lite avatar panel
- assistant state
- quick question buttons
- typed question input
- answer panel
- QR/action panel
- human escalation button

No marketing hero. No explanatory landing page.

### 2. Admin Dashboard

Route suggestion:

```txt
/admin
```

Primary user:

```txt
Location manager or staff member
```

The admin page should include:

- location overview
- approved answers list
- answer editor
- unknown question queue
- QR action manager
- simple analytics summary
- budget/policy summary

### 3. Demo Switcher

Route suggestion:

```txt
/
```

Simple local demo navigation:

- open kiosk
- open admin

This page can be minimal. The customer-facing demo should start from `/kiosk`.

## Kiosk Screen Layout

Recommended layout:

```txt
┌─────────────────────────────────────────────────────────────┐
│ Arabic | Français | English                         Help    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────┐  ┌──────────────────────────┐  │
│  │                         │  │ Answer                   │  │
│  │      Lite Avatar        │  │                          │  │
│  │                         │  │ Text answer appears here │  │
│  │  idle/listening/talking │  │                          │  │
│  └─────────────────────────┘  └──────────────────────────┘  │
│                                                             │
│  Quick Questions                                            │
│  [Where do I go?] [Documents] [Services] [QR code]          │
│                                                             │
│  Ask a question                                             │
│  ┌───────────────────────────────────────────────┐ [Ask]    │
│  │ Type your question...                         │          │
│  └───────────────────────────────────────────────┘          │
│                                                             │
│  ┌──────────────────────── QR / Action ───────────────────┐ │
│  │ Shows checklist, direction, or escalation action        │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Kiosk States

### Idle

Initial state.

Shows:

- greeting
- quick question buttons
- avatar idle animation
- no QR action

Example greeting:

```txt
Hello. I can help you find the right service, documents, and counter.
```

### Thinking

After the visitor taps or submits a question.

Shows:

- avatar thinking state
- short loading message
- disabled ask button

This state can last 300 to 800ms in the prototype to make the flow readable.

### Answering Known Question

When a matching approved answer exists.

Shows:

- answer text
- cache hit badge for demo/internal visibility
- avatar speaking state
- optional QR/action

Prototype can simulate speaking with simple mouth animation and subtitle highlighting. Real audio can be deferred.

### Answering Unknown Question

When no approved answer exists.

Shows:

- cautious fallback answer
- note that staff can help
- "This question was saved for review" demo badge
- avatar speaking state

The unknown question should appear in admin queue immediately.

### Escalation

When visitor taps human help or confidence is low.

Shows:

- direction to staff desk
- optional QR/contact action
- avatar neutral state

## Quick Questions

Use these first:

- Who are you?
- What services are available?
- Where do I go?
- What documents do I need?
- What are the opening hours?
- Can I scan a QR code?
- Can I speak Arabic/French/English?
- I do not know which counter I need

## Typed Question Matching

Prototype matching can be simple:

1. lowercase the question
2. search keywords
3. return matching approved answer
4. otherwise create unknown question event

Example keywords:

```txt
documents, papers, dossier -> documents answer
counter, where, go -> direction answer
hours, open, time -> opening hours answer
arabic, french, english, language -> language answer
qr, scan, code -> QR answer
```

This is enough for clickable validation.

## Language Behavior

Languages:

- Arabic
- French
- English

First clickable prototype must support UI language switching and answer switching for at least Arabic and French. English can be included with simpler translations.

Prototype language rules:

- language selector changes labels
- quick question labels change
- answer text changes if translation exists
- unknown fallback appears in selected language

Arabic layout:

- use RTL for Arabic text areas
- keep high-level layout stable
- avoid making the whole app RTL in phase one if it slows implementation; answer and labels must still read correctly

## Lite Avatar

The avatar should be browser-rendered, not AI-generated.

Prototype options:

- simple SVG face
- CSS/HTML character
- canvas face
- small vector mascot

Required states:

- idle
- listening
- thinking
- speaking
- fallback/escalation

Required animation:

- blink or breathing in idle
- small pulse while thinking
- simple mouth open/close while speaking

Do not spend time on photorealism.

## QR And Action Panel

The action panel appears when the answer includes an action.

Action types:

- QR checklist
- direction/counter
- phone/contact
- staff escalation

For prototype:

- QR can be a generated placeholder block or a local QR-style visual
- no external QR library is required in phase one unless already convenient
- show label and short instruction

Example:

```txt
Document checklist
Scan this QR code to open the renewal checklist.
```

## Admin Dashboard Layout

Recommended admin sections:

```txt
┌─────────────────────────────────────────────────────────────┐
│ Digital Receptionist Admin                                  │
├─────────────────────────────────────────────────────────────┤
│ Location: Municipal Office Demo                             │
│ Policy: Lite First | Languages: AR / FR / EN                │
├─────────────────────────────────────────────────────────────┤
│ Metrics: Questions today | Cache hit rate | Unknown queue   │
├─────────────────────────────────────────────────────────────┤
│ Approved Answers                 │ Unknown Questions        │
│ - documents                      │ - submit for my father   │
│ - opening hours                  │ - lost receipt           │
│ - where to go                    │                          │
├─────────────────────────────────────────────────────────────┤
│ Answer Editor / Preview                                     │
└─────────────────────────────────────────────────────────────┘
```

## Admin Features For Prototype

### Approved Answers List

Show:

- canonical question
- language availability
- has QR/action
- last updated
- simulated usage count

Admin can:

- select answer
- edit answer text
- save locally in state

Persistence can be local state or localStorage for phase one.

### Unknown Question Queue

Show:

- question text
- language
- generated/fallback response
- confidence label
- count if repeated

Admin can:

- approve as reusable answer
- edit and approve
- reject
- mark out of scope

When approved:

- answer appears in approved answers list
- kiosk can answer it next time

### Metrics

Show simple simulated or local-session metrics:

- total questions
- cache hits
- unknown questions
- top language
- escalations

These do not need a real database yet.

### Budget Summary

Show:

```txt
Policy: Lite First
Premium spend today: $0.00
Fallback mode: Lite avatar + text
```

This reinforces the business positioning.

## Sample Data

Create sample data with:

- one tenant
- one location
- one persona
- at least 12 approved answers
- at least 3 QR actions
- at least 3 unknown question examples
- translations for Arabic and French

Suggested file in prototype repo:

```txt
src/data/demo-data.ts
```

Suggested structure:

```ts
export type DemoLanguage = 'ar' | 'fr' | 'en'

export type DemoAnswer = {
  id: string
  canonicalQuestion: Record<DemoLanguage, string>
  answerText: Record<DemoLanguage, string>
  keywords: string[]
  actionId?: string
  usageCount: number
}

export type DemoAction = {
  id: string
  type: 'qr' | 'direction' | 'contact' | 'escalation'
  label: Record<DemoLanguage, string>
  description: Record<DemoLanguage, string>
  value: string
}
```

## Required Demo Answers

Include at least these:

1. Who are you?
2. What services are available?
3. Where do I go for document renewal?
4. What documents do I need?
5. Can I speak Arabic/French/English?
6. What are the opening hours?
7. I do not know which counter I need.
8. Can I scan a QR code?
9. Where is the information desk?
10. What should I do if my file is incomplete?
11. Can I get help for an elderly person?
12. How do I contact the office?

## Unknown Demo Questions

Include examples:

- Can I submit documents for my father?
- I lost my payment receipt. What should I do?
- Can I complete this service online?

These should demonstrate the review loop.

## Component List

Kiosk:

- `KioskPage`
- `LanguageSwitcher`
- `LiteAvatar`
- `QuickQuestionGrid`
- `QuestionInput`
- `AnswerPanel`
- `ActionPanel`
- `EscalationButton`

Admin:

- `AdminPage`
- `LocationSummary`
- `MetricsStrip`
- `ApprovedAnswerList`
- `UnknownQuestionQueue`
- `AnswerEditor`
- `BudgetPolicyCard`
- `KioskPreview`

Shared:

- `demoData`
- `matchQuestion`
- `translate`
- `createQuestionEvent`
- `promoteCandidateToAnswer`

## Prototype Interaction Logic

Kiosk submit flow:

```txt
onSubmit(question):
  set state = thinking
  wait 300-800ms
  result = matchQuestion(question, selectedLanguage)
  if result.hit:
    record event cacheHit=true
    show approved answer
    show action if present
    set state = speaking
  else:
    create unknown question candidate
    record event cacheHit=false
    show cautious fallback
    set state = speaking
```

Admin approve flow:

```txt
select unknown candidate
edit answer text if needed
click approve
candidate moves to approved answers
kiosk can match it after approval
```

## Visual Direction

The product should feel:

- public-service friendly
- clear
- trustworthy
- touch-first
- multilingual
- operational, not flashy

Avoid:

- marketing landing page
- tiny text
- decorative dashboards
- photoreal avatar obsession
- complex settings during demo

Use:

- large buttons
- clear contrast
- simple icons
- stable layout
- visible state changes
- generous spacing for kiosk touch targets

## Prototype Acceptance

The clickable prototype is complete when:

- `/kiosk` answers quick questions
- `/kiosk` accepts typed questions
- `/kiosk` creates unknown candidates
- `/admin` shows approved answers
- `/admin` shows unknown queue
- admin can approve an unknown question
- after approval, kiosk can answer it
- language switch changes labels and answer text
- action panel can show at least 3 QR/direction/contact examples
- budget card shows Lite First policy
- no external AI provider is required

## Explicit Deferrals

Do not build in this prototype:

- real authentication
- real database
- real TTS
- real STT
- real LLM
- real HeyGen/D-ID
- premium video cache
- analytics backend
- multi-tenant permissions
- production deployment

These come after the demo proves the flow.

## Next File After This

After this spec, create an implementation plan:

```txt
Codex/pilot-mvp/10-prototype-implementation-plan.md
```

That plan should choose the exact folder/repo, framework, route structure, components, and sample data tasks.
