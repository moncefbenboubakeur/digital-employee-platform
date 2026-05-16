# Admin Flow

## Admin Goal

The admin keeps the kiosk useful without being involved in every live conversation.

Admin work happens after interactions, not during them.

## Admin Setup Flow

```txt
Create tenant
  -> create location
  -> choose languages
  -> choose avatar policy
  -> add services
  -> add common questions
  -> add required documents
  -> add QR links
  -> preview kiosk
  -> publish
```

## Knowledge Setup

Admin can add:

- service list
- office map or directions
- opening hours
- document requirements
- common procedures
- contact numbers
- QR codes
- escalation instructions

First MVP can use structured forms instead of full document ingestion.

Example structured service:

```txt
Service: Renew card
Department: Counter 3
Documents:
  - ID card
  - two photos
  - old card
  - payment receipt
QR: /renew-card-checklist
Languages: ar, fr
```

## Unknown Question Review

Admin sees a queue:

- raw visitor question
- detected language
- generated answer
- confidence
- sources used
- how many times similar question was asked
- whether visitor escalated

Admin actions:

- approve as reusable answer
- edit answer then approve
- reject answer
- merge with existing answer
- mark as out of scope
- add missing knowledge
- request premium video generation later

## Answer Approval Flow

```txt
Unknown question appears
  -> admin reviews
  -> admin edits if needed
  -> admin approves
  -> answer becomes reusable
  -> audio/lite media can be generated
  -> if high value, premium video can be generated
```

This improves future interactions without blocking the original visitor.

## Analytics Flow

Admin should see:

- total questions
- cache hit rate
- unknown questions
- top repeated questions
- language usage
- failed answers
- escalations
- estimated cost
- premium budget usage

The most important early metric is cache hit rate.

## Budget Management

Admin can choose:

- Lite First
- Adaptive Hybrid
- Budgeted Premium
- Full Live Premium

For MVP, implement:

- Lite First
- Adaptive Hybrid

Budget controls:

- daily max estimated spend
- max premium generations per day
- disable premium live
- fallback when budget is reached

## Admin Principle

The admin dashboard should feel like controlling a receptionist knowledge base, not configuring an AI lab.
