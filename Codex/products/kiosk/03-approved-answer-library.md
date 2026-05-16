# Approved Answer Library

## Purpose

The Approved Answer Library is the core cost-control and trust system.

Instead of generating expensive avatar answers every time, the product saves approved answers and reuses them as videos, audio, subtitles, and structured actions.

## Main Principle

The current visitor should receive an answer immediately.

Human approval is used only for future reuse, not to block the live conversation.

## Runtime Flow

```text
User asks question
  ↓
Detect language and intent
  ↓
Search approved answer library
  ↓
High-confidence match?
  ↓
Yes: play saved video
No: handle live or fallback
  ↓
Save unknown question as candidate
  ↓
Admin reviews later
  ↓
If approved, generate reusable video
```

## Matching Strategy

Use semantic search so different phrasings map to the same answer.

Examples that should map together:

- Where is the registration office?
- Which floor for registration?
- Ou est le bureau d'inscription?
- وين نروح باش نسجل؟

## Answer States

- Draft: created by admin or AI but not usable yet.
- Pending review: candidate from live interaction.
- Approved: safe to use.
- Published: available on kiosk.
- Archived: kept for history but not used.

## Sensitive Categories

Some categories should require approved content:

- Legal.
- Medical.
- Banking.
- Insurance.
- Government procedures.
- HR policy.
- Security.
- Payments.

If no approved answer exists for these, the system should use a safe fallback.

## Cost Impact

The system becomes cheaper over time:

- First repeated question: generate or upload answer once.
- Next 1000 repeated questions: play saved media with almost no AI cost.

This is one of the strongest business advantages of the product.

