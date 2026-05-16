# 90 Day High Level Plan

## Goal

Build and validate the Lite First version of the AI avatar kiosk MVP.

The first 90 days should prove that a low-cost multilingual assistant can answer useful questions in a physical setting, capture unknown questions, and avoid surprise AI costs.

## Month 1: Working Prototype

### Product

- Kiosk web interface.
- Lightweight 2D/vector/cartoon avatar.
- Microphone input.
- Text chat fallback.
- Language detection.
- Basic answer retrieval from a local knowledge base.
- TTS voice output.
- Subtitles.
- QR code display.
- Safe live answer fallback for non-sensitive demo questions.

### Admin

- Simple admin page to add questions and answers.
- Upload or link video answers.
- Mark answers as approved.
- View unknown questions.

### Technical

- Build semantic search over approved answers.
- Store sessions, questions, answers, and usage counts.
- Integrate one LLM provider.
- Integrate one speech-to-text provider.
- Integrate one TTS provider.
- Track estimated cost per interaction.

### Demo Target

Create a demo assistant for AlgeriaTech:

- Who are we?
- What services are available?
- Where can I go next?
- Can I scan a QR code?
- Can I speak Arabic, French, or English?

## Month 2: Pilot-Ready MVP

### Product

- Better kiosk UI for touch screens.
- Better lightweight avatar animation.
- Subtitles during responses.
- QR code display.
- Human handoff button.
- Clarifying questions for low-confidence matches.
- Idle screen and attract loop.

### Admin

- Review queue for new Q&A candidates.
- Approve/reject workflow.
- Regenerate answer text.
- Publish approved answer to kiosk.
- Basic analytics dashboard.

### Technical

- Add media storage for audio, subtitles, QR codes, and future videos.
- Add placeholder workflow for future premium batch video generation.
- Add confidence thresholds for semantic matching.
- Add environment config per customer/location.
- Add logs for failed questions and latency.

## Month 3: Real Pilot

### Pilot

- Deploy on a laptop, tablet, or kiosk screen at one real location.
- Run a supervised pilot.
- Collect usage data.
- Measure top questions.
- Measure failed answers.
- Measure average latency.
- Estimate cost per conversation.

### Sales

- Build a short demo video.
- Create a one-page sales deck.
- Prepare pricing packages.
- Approach 5-10 potential pilot customers.

### Product Hardening

- Improve multilingual prompts.
- Add stricter safety rules.
- Improve admin UX.
- Add export of analytics.
- Prepare installation checklist.

## Success Criteria

- The kiosk can handle 50-100 demo conversations without manual intervention.
- At least 70 percent of questions map to cached or approved answers after the initial setup.
- New unknown questions are captured cleanly for review.
- The team can estimate cost per conversation.
- One potential customer agrees to a paid or serious pilot.

## Next Phase After 90 Days

If the Lite First MVP works, the next product phase is Adaptive Hybrid:

- Generate premium cached videos for selected approved answers.
- Keep lightweight avatar for new questions.
- Add batch upgrade workflow.
- Improve analytics around which answers deserve premium treatment.
