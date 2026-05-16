# Product Roadmap

## Roadmap Principle

Build from the bottom up:

```text
Lite First
  ↓
Adaptive Hybrid
  ↓
Budgeted Premium
  ↓
Full Live Premium
```

This is the right startup path because every level builds reusable platform capabilities for the next level. The first version should prove usefulness, language support, answer quality, and cost control before chasing expensive realism.

## Phase 1: Lite First MVP

Target timeline:

- 0 to 90 days.

Goal:

- Build the cheapest useful version of the AI digital receptionist.

Target customers:

- AlgeriaTech demo.
- Small event booth.
- Small mall or showroom.
- Local branch or school reception.

Core product:

- Browser-based kiosk UI.
- Lightweight 2D/vector/cartoon talking avatar.
- Voice input.
- Text input fallback.
- TTS voice output.
- Subtitles.
- Arabic/French/English language support.
- Approved FAQ answers.
- QR code display.
- Human handoff.
- Unknown question capture.
- Basic admin dashboard.
- Basic analytics.

Key platform capabilities:

- Customers.
- Locations.
- Kiosks.
- Approved answers.
- Semantic matching.
- Sessions and interactions.
- Cost tracking at the interaction level.

Recommended avatar stack:

- Start with SVG/static character and simple mouth shapes.
- Move to Rive for the production Lite First character.
- Use TTS + subtitles + browser-rendered lip sync.
- Keep runtime avatar rendering near $0 per conversation.

What not to build yet:

- Full realistic live avatar.
- Complex video editor.
- Government-grade compliance.
- Full LMS.
- Custom trained avatar models.

Success gate:

- A real user can ask common questions and receive useful answers in under a few seconds.
- The system can capture unknown questions for review.
- The cost per conversation is predictable.

## Phase 2: Adaptive Hybrid

Target timeline:

- 3 to 6 months.

Goal:

- Add premium cached answers without making every live answer expensive.

Target customers:

- Medium mall.
- University or private school.
- Corporate reception.
- Public-service branch pilot.

Core product:

- Cached premium avatar videos for approved repeated answers.
- Lightweight avatar for new or low-confidence questions.
- Admin review queue for new questions.
- Batch upgrade selected answers to premium video.
- Better confidence thresholds.
- Answer expiration and review dates.
- Improved analytics for top questions and failed questions.

Key platform capabilities:

- Media asset storage.
- Background video generation jobs.
- Answer lifecycle: draft, pending, approved, published, archived.
- Batch generation workflow.
- Reusable intro/outro and language variants.

Success gate:

- Most common questions are answered by cached approved content.
- Admins can identify which questions deserve premium upgrade.
- The product shows clear cost savings compared with always-live premium avatar.

## Phase 3: Budgeted Premium

Target timeline:

- 6 to 9 months.

Goal:

- Let larger customers use premium avatar experiences with strict budget control.

Target customers:

- Bank branch network.
- Telecom branch network.
- Large company reception.
- Busy public-facing locations.

Core product:

- Premium live avatar provider integration.
- Hourly, daily, and monthly budget controls.
- Budget per customer, location, and kiosk.
- Automatic fallback when thresholds are reached.
- Admin alerts.
- Usage dashboards.
- Abuse controls and rate limits.
- Optional manager override.

Key platform capabilities:

- Policy engine.
- Budget governor.
- Provider routing.
- Cost estimation before response.
- Usage anomaly alerts.
- Multi-location management.

Success gate:

- A customer can run premium mode without surprise invoices.
- The platform automatically switches modes based on budget and safety policy.
- Finance/admin users can understand usage and cost.

## Phase 4: Full Live Premium

Target timeline:

- 9 to 15 months.

Goal:

- Offer the highest-end enterprise version for customers where brand image and experience justify the cost.

Target customers:

- Sonatrach/Sonelgaz-style enterprises.
- Banks.
- Telecom headquarters.
- Airports.
- Premium government locations.
- Large enterprise visitor centers.

Core product:

- Premium live realistic avatar as default.
- Custom avatar and voice packages.
- Enterprise admin controls.
- SLA and monitoring.
- Multi-language routing.
- Human handoff integrations.
- Queue, CRM, appointment, or helpdesk integrations.
- Security and privacy package.

Key platform capabilities:

- Enterprise deployment playbook.
- Health monitoring.
- Audit logs.
- Role-based access.
- Integration framework.
- Contract-level usage reporting.

Success gate:

- The platform can support high-visibility enterprise deployments with reliability, cost controls, and governance.

## Phase 5: Platform Expansion

Target timeline:

- 12 to 24 months.

Goal:

- Expand from kiosk into AI Presenter Studio and AI Learning using the same platform.

Presenter Studio expansion:

- Article-to-video.
- Document-to-video.
- YouTube and Shorts generation.
- Brand templates.
- Subtitle and translation workflow.

Learning expansion:

- Document-to-course.
- Training videos.
- Quizzes.
- Certificates later.
- SCORM/xAPI/LMS export later.

Regional expansion:

- Darja support.
- Tamazight support where commercially needed.
- Francophone Africa.
- MENA public-service and enterprise use cases.

Longer-term technical expansion:

- Local voices.
- Local pronunciation models.
- Private/on-premise deployments.
- More self-owned avatar rendering.
- Reduced dependency on external avatar APIs.

## Why This Roadmap Works

Every phase creates reusable assets:

- Lite First creates the kiosk, admin, knowledge base, language, and analytics foundation.
- Adaptive Hybrid adds media caching and answer lifecycle.
- Budgeted Premium adds the policy engine and cost governance.
- Full Live Premium adds enterprise quality, integrations, and SLA.
- Platform Expansion reuses the same avatar, voice, subtitle, knowledge, and workflow infrastructure.

This avoids building a beautiful but expensive demo before proving the customer problem.
