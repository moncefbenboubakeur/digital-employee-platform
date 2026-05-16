# Knowledge And Answer Policy

## Purpose

The kiosk must answer safely and locally. It should not hallucinate policies, invent document requirements, or pretend to know things outside the approved knowledge base.

## Knowledge Sources

MVP knowledge should be structured, not magical.

Use:

- services
- required documents
- directions
- opening hours
- contact information
- QR links
- FAQ answers
- escalation instructions

Avoid relying on unreviewed long documents in the first pilot.

## Answer Types

### Approved Answer

Reusable answer reviewed by admin.

Behavior:

- can be served instantly
- can have cached audio
- can have lite animation
- can later have premium video

### Generated Candidate

Answer generated for a new question.

Behavior:

- can be served live if confidence is acceptable
- must be stored for admin review
- does not become reusable until approved

### Fallback Answer

Safe answer used when confidence is low.

Example:

```txt
I am not sure about this request. Please go to the information desk so a staff member can help you.
```

## Runtime Answer Rules

The assistant should:

- answer from approved answers first
- use customer knowledge only
- cite or reference the relevant service/procedure internally
- avoid legal/medical/financial advice unless explicitly approved
- escalate when confidence is low
- never invent required documents
- never say a service exists unless it is in knowledge
- never collect private data in MVP

## Unknown Question Policy

Unknown questions are allowed.

The live system should:

- try to answer from approved knowledge
- say uncertainty clearly
- offer human escalation
- store question and answer candidate

Admin later decides whether the answer becomes reusable.

## Approval Policy

An answer becomes reusable only after:

- admin approves it
- answer text is clear
- source knowledge is attached
- language is correct
- expiration/effective date is checked if needed

## Multilingual Policy

Every approved answer should ideally have:

- Arabic version
- French version
- English version if location needs it

If a translation is generated:

- mark it as machine-translated
- let admin approve it before long-term reuse

For live unknown answers:

- generated translation is acceptable only if confidence is high
- otherwise offer another language or human help

## Cache Policy

Cache the following:

- answer text
- TTS audio
- subtitles
- lite avatar timing/animation
- premium video if generated

Cache key should include:

- tenant
- location
- answer id
- language
- voice profile
- avatar profile
- media quality

## Update Policy

When admin edits an approved answer:

- old cached media is stale
- text cache updates immediately
- audio/lite media is regenerated in background
- premium video is either marked stale or regenerated manually

## Safety Principle

In a public kiosk, a safe non-answer is better than a confident wrong answer.
