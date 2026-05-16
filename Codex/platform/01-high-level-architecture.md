# High Level Architecture

## Platform Overview

The startup should be built as one shared AI media and knowledge platform with three product surfaces:

- Kiosk: real-time digital receptionist.
- Studio: article/document-to-video content creation.
- Learning: document-to-course and training generation.

```text
Product Apps
  ↓
Shared API Backend
  ↓
Knowledge + Project Data
  ↓
AI Orchestration
  ↓
Media Generation + Storage
  ↓
Analytics + Admin Controls
```

## Product Apps

### Kiosk App

Runs on a browser-based screen, tablet, or kiosk device.

Responsibilities:

- Capture voice/text.
- Show avatar/video.
- Display subtitles and QR codes.
- Provide touch controls.
- Handle idle mode.

### Presenter Studio App

Runs as an editor-facing web app.

Responsibilities:

- Import articles and documents.
- Generate scripts and scene plans.
- Review/edit presenter scripts.
- Generate subtitles and YouTube metadata.
- Render or export video packages.

### Learning App

Runs as a training-authoring web app.

Responsibilities:

- Import documents and presentations.
- Generate course outlines and lessons.
- Generate quizzes.
- Preview learner modules.
- Export training packages.

## Shared Components

### Admin Dashboard

Used by customer admins and operators.

Responsibilities:

- Manage approved answers and content.
- Review unknown questions or generated drafts.
- Upload or generate media.
- View analytics.
- Configure languages, customers, and locations.

### API Backend

Responsibilities:

- Sessions.
- Projects.
- Answer matching.
- Knowledge base retrieval.
- LLM orchestration.
- Media lookup.
- Analytics.
- Authentication.

### AI Services

Initial external providers:

- Speech-to-text.
- Text-to-speech.
- Avatar video generation.
- LLM.
- Translation.
- Embeddings.

### Policy Engine

Controls runtime decisions across products.

For kiosk deployments, the policy engine decides:

- Whether to use cached media, premium live avatar, lightweight avatar, audio-only, or fallback.
- Whether the customer has budget remaining.
- Whether the question category is safe to answer.
- Whether a session should be rate-limited or handed off.

### Storage

Stores:

- Customer configuration.
- Approved answers.
- Studio projects.
- Learning modules.
- Question logs.
- Video/audio/subtitle files.
- QR code assets.
- Analytics events.

## Kiosk Caching Logic

```text
Question
  ↓
Embedding
  ↓
Search approved answers
  ↓
Confidence >= threshold
  ↓
Return cached media
```

If no match:

```text
Question
  ↓
Classify sensitivity
  ↓
Check customer avatar/budget policy
  ↓
If safe and allowed: premium live or lite live answer
If sensitive or budget-blocked: fallback/handoff
  ↓
Save candidate for review
```

## Early Tech Stack Candidate

- Next.js or similar web framework.
- PostgreSQL with pgvector for semantic search.
- Object storage for videos and subtitles.
- FFmpeg or Remotion for video processing.
- External APIs for avatar, speech, LLM, and translation.
