# Target Startup Architecture

## Product Shape

The new startup is a multi-tenant digital employee platform.

It should support:

- Live kiosk assistant
- Admin knowledge management
- Cached approved answers
- Budget-aware avatar quality policies
- Premium answer upgrades
- Analytics and usage reporting
- Later: content studio and learning generation

## Suggested Repo Layout

```txt
digital-employee-platform/
  apps/
    api/
    admin-dashboard/
    kiosk-player/
    content-studio/
  packages/
    core/
    adapters/
    jobs/
    knowledge/
    answer-cache/
    media/
    billing/
    observability/
```

## Domain Model Draft

### Tenant

The customer organization.

Examples:

- Sonatrach
- Sonelgaz
- mall operator
- post office branch network
- private clinic

### Location

A physical or operational place belonging to a tenant.

Examples:

- head office reception
- mall entrance
- agency branch
- trade fair booth

### KioskDevice

The actual kiosk, tablet, screen, or browser instance installed at a location.

Tracks:

- device id
- location id
- online status
- language defaults
- hardware capabilities
- assigned persona

### Persona

The customer-facing identity.

Tracks:

- name
- languages
- tone
- avatar profile
- voice profile
- allowed topics
- escalation behavior

### KnowledgeSource

Documents and structured data used for answers.

Examples:

- FAQ
- PDF procedures
- office map
- service list
- required documents
- opening hours
- queue instructions

### Answer

An approved reusable response.

Tracks:

- normalized question
- language
- answer text
- safety status
- approval status
- source citations
- effective dates

### CachedMedia

Generated media attached to an answer.

Types:

- text only
- audio only
- lite 2D animation
- premium avatar video

### QuestionEvent

Every user question or interaction.

Tracks:

- raw question
- normalized question
- detected language
- confidence
- matched answer id
- generated answer id
- latency
- cost
- escalation

### BudgetPolicy

Controls cost and quality behavior per tenant/location.

Examples:

- daily premium avatar budget
- hourly API budget
- fallback avatar mode
- abuse throttling
- max unknown questions per hour

## Runtime Flow

```txt
Visitor asks question
  -> speech-to-text or typed input
  -> language detection
  -> normalize question
  -> search approved answer cache
  -> if matched: serve cached media
  -> if not matched: generate safe answer from knowledge base
  -> synthesize audio
  -> animate lite avatar or use premium live avatar depending policy
  -> store event, answer candidate, cost, confidence
  -> admin reviews later
```

## Admin Flow

```txt
Admin uploads knowledge
  -> system extracts/structures content
  -> admin creates or approves answers
  -> system pre-generates high-frequency cached answers
  -> admin monitors unknown questions
  -> admin batch-upgrades selected answers to premium avatar video
```

## Avatar Policy Flow

```txt
Full Live Premium:
  all answers use premium live avatar where possible

Budgeted Premium:
  premium until budget is reached, then fallback

Adaptive Hybrid:
  cached known answers can use premium media
  new or low-confidence answers use lite avatar
  useful answers are upgraded later

Lite First:
  default to 2D/vector/static plus voice/subtitles
  premium is optional, rare, or disabled
```

## What The Kiosk Must Always Do

Even when AI generation fails, the kiosk should still help the visitor:

- show text answer
- show QR code
- show direction or department
- offer language switch
- offer human escalation
- show "I am not sure" safely

This is more important than avatar realism.
