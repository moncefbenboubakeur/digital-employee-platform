# Data Model Draft

## Core Entities

### Customer

```text
id
name
industry
billing_plan
created_at
```

### Location

```text
id
customer_id
name
address
timezone
default_language
supported_languages
created_at
```

### Kiosk

```text
id
location_id
name
device_identifier
status
last_seen_at
created_at
```

### Answer

```text
id
customer_id
location_id
language
canonical_question
answer_text
category
sensitivity_level
status
embedding
created_by
approved_by
approved_at
published_at
expires_at
created_at
updated_at
```

### Question Variant

```text
id
answer_id
language
question_text
embedding
created_at
```

### Media Asset

```text
id
answer_id
type
language
url
duration_seconds
provider
generation_cost
status
created_at
```

Types:

- video
- audio
- subtitles
- thumbnail
- qr_code

### Session

```text
id
kiosk_id
language
started_at
ended_at
handoff_requested
```

### Interaction

```text
id
session_id
question_text
detected_language
matched_answer_id
match_confidence
response_mode
latency_ms
cost_estimate
created_at
```

Response modes:

- cached_video
- cached_audio
- live_ai
- clarification
- safe_fallback
- human_handoff

### Candidate Answer

```text
id
customer_id
location_id
source_interaction_id
question_text
proposed_answer_text
language
category
sensitivity_level
status
review_notes
created_at
reviewed_at
```

Statuses:

- pending
- approved
- rejected
- merged

