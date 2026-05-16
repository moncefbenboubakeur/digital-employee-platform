# Lightweight Avatar Options

Research date: 2026-05-16.

## Executive Recommendation

For the Lite First MVP, do not use AI video generation at runtime.

Build a reusable browser-rendered avatar:

```text
STT -> LLM/RAG -> TTS audio -> browser avatar lip-sync -> subtitles/UI
```

The avatar rendering cost should be close to zero per conversation. The only runtime AI costs should be speech-to-text, LLM, and text-to-speech.

Best first stack:

```text
Rive or SVG character
  + Web Audio amplitude / viseme timing
  + TTS
  + subtitles
  + expressive UI
```

## Options Matrix

| Option | Runtime Cost | Build Difficulty | Visual Quality | Best Use | Recommendation |
|---|---:|---:|---:|---|---|
| Static character + mouth shapes | Near $0 | Low | Basic | First prototype | Build immediately |
| SVG/vector face animation | Near $0 | Low-medium | Good if designed well | Lite First MVP | Strong option |
| Rive interactive character | Near $0 after design/export | Medium | Very good | Production Lite First | Best product-quality option |
| Lottie/dotLottie animation | Near $0 if self-hosted | Medium | Good | Looped gestures, idle states | Good supporting option |
| Live2D model | Near $0 runtime, licensing complexity | Medium-high | Excellent anime/manga style | Premium Lite or mascot assistant | Later, not first MVP |
| PixiJS/Canvas sprite avatar | Near $0 | Medium | Good | Game-like mascot | Good if we want full code control |
| Three.js/VRM 3D avatar | Near $0 runtime | Medium-high | Good 3D | 3D assistant | Later experiment |
| AI talking-photo/video APIs | Per second/minute | Low integration, high usage cost | Realistic | Batch premium upgrades | Not for Lite First runtime |

## Option 1: Static Character + Mouth Shapes

Description:

- A single illustrated character.
- 5-9 mouth shapes.
- Eye blinking.
- Head bob.
- Subtitle panel.
- QR code/actions panel.

How lip sync works:

- Simplest: mouth opens/closes based on audio volume.
- Better: precompute mouth timing from text or generated audio.
- Best later: phoneme/viseme timing from TTS provider or a local lip-sync tool.

Cost:

- Runtime avatar cost: near $0.
- Design cost: one-time illustration and mouth-shape set.
- AI cost: STT + LLM + TTS only.

Difficulty:

- Low.
- Good first prototype in days.

Risk:

- Can look too simple if design is weak.

Verdict:

- Best for the first proof of concept.

## Option 2: SVG / Vector Character

Description:

- Character built from SVG layers.
- Mouth, eyes, eyebrows, head, shoulders, and hands are separate elements.
- JavaScript controls mouth, blinking, expressions, and small movements.

Cost:

- Runtime avatar cost: near $0.
- Design cost: one-time vector asset.
- Hosting cost: normal app hosting.

Difficulty:

- Low-medium.
- Good for a web kiosk because it is lightweight, scalable, and easy to brand.

Implementation idea:

```text
TTS audio plays
  ↓
Web Audio API measures loudness / timing
  ↓
React state changes mouth shape
  ↓
CSS/SVG animations handle blink, idle, expression
```

Verdict:

- Strong MVP choice if we want maximum code ownership and no animation-tool dependency.

## Option 3: Rive Interactive Character

Description:

- Rive is a vector animation tool with state machines and web runtimes.
- It can produce a high-quality interactive character that runs inside the kiosk UI.

Relevant pricing:

- Rive Free: $0/seat/month for learning and limited collaboration.
- Rive Cadet: $9/seat/month, includes exports for shipping.
- Rive Voyager: $32/seat/month for teams/libraries.
- Rive Enterprise: $120/seat/month for large org features.

Cost:

- Runtime rendering: near $0 once embedded in the app.
- Tooling: likely $9/month for the first shippable version.
- Design/rigging: one-time effort.

Difficulty:

- Medium.
- Requires learning Rive state machines and building a good character rig.

Best features for us:

- State machines.
- Interactivity.
- JavaScript/React runtime.
- Responsive vector rendering.
- Good balance of quality and cost.

Verdict:

- Best production-quality Lite First path.
- My recommended stack after the first raw SVG prototype.

Source:

- Rive pricing: https://www.rive.app/pricing

## Option 4: Lottie / dotLottie

Description:

- Lottie is excellent for small vector animations: idle loops, gestures, transitions, loading states, expressive UI.
- It is less ideal as the main talking character if we need precise live mouth control, but it can work with segmented animations.

Relevant pricing:

- LottieFiles has a free version for preview/testing/sharing and free library access.
- Individual plan: $19.99/user/month billed annually.
- Team plan: $24.99/user/month billed annually.

Cost:

- Runtime rendering: near $0 if assets are self-hosted.
- Tooling/asset platform: optional paid subscription.

Difficulty:

- Medium.
- Great for designer handoff and motion polish.
- Harder than SVG/Rive for exact live lip sync unless we structure separate mouth/gesture segments.

Verdict:

- Use Lottie for supporting animations and UI polish.
- Do not make it the main runtime mouth-control engine unless the prototype proves it works cleanly.

Source:

- LottieFiles pricing: https://lottiefiles.com/pricing

## Option 5: Live2D

Description:

- Live2D is strong for anime/manga-style 2D characters with head turns, eyes, hair, expressions, physics, and lip sync.
- It is common in VTuber-style products.

Relevant official notes:

- Live2D Cubism FREE is always free but has feature limits.
- Live2D Cubism PRO starts with a 42-day trial.
- The FREE version can be used commercially only by general users and small-scale enterprises under Live2D's revenue threshold.
- Live2D SDK can be downloaded for development at no initial cost, but release licensing depends on usage, business scale, and whether the app is considered expandable.
- For AI/chatbot interfaces, the SDK release license page specifically points to usage-plan checks and possible special licensing.

Cost:

- Runtime can be low, but licensing must be checked carefully before commercial deployment.
- Model rigging cost can be significant if outsourced.
- Good Live2D rigging is not trivial.

Difficulty:

- Medium-high.
- More complex than SVG/Rive.
- Requires art separation, rigging, expressions, physics, and SDK integration.

Verdict:

- Excellent later option for a manga-style assistant or premium Lite mascot.
- Not the fastest first MVP because of licensing and rigging complexity.

Sources:

- Live2D FREE vs PRO comparison: https://www.live2d.com/en/cubism/comparison/
- Live2D SDK release license: https://www.live2d.com/en/sdk/license/

## Option 6: PixiJS / Canvas Sprite Avatar

Description:

- Use PixiJS or HTML canvas to build a sprite-based 2D assistant.
- The avatar can have sprite sheets for mouth shapes, eyes, expressions, hands, and idle motion.

Cost:

- Runtime avatar cost: near $0.
- Tooling cost: open-source stack.
- Design cost: sprite/illustration work.

Difficulty:

- Medium.
- More engineering-heavy than Rive.
- Good if we want full control and no proprietary editor.

Verdict:

- Good second-choice if Rive feels too tool-dependent.
- Strong for mascot-style assistants.

Source:

- PixiJS renderer docs: https://pixijs.com/8.x/guides/components/renderers

## Option 7: Three.js / VRM 3D Avatar

Description:

- Browser-rendered 3D avatar using Three.js, VRM models, and blend shapes for lip sync.
- Can feel more premium than 2D while still avoiding per-minute video generation.

Cost:

- Runtime avatar cost: near $0.
- 3D model creation/customization cost: one-time.
- More GPU/browser performance considerations.

Difficulty:

- Medium-high.
- Needs 3D model pipeline, blend shapes, lighting, camera, performance testing.

Important note:

- Ready Player Me used to be a convenient avatar source, but public services were discontinued on January 31, 2026 after the Netflix acquisition. Avoid depending on it for new production work.

Verdict:

- Useful later if customers want a 3D Lite assistant.
- Not first MVP.

Sources:

- Three.js official site: https://threejs.org/
- Ready Player Me discontinuation notice: https://readyplayer.me/

## Option 8: AI Talking-Photo / Talking-Video APIs

Description:

- Services that generate a talking video from an image and audio.
- Good for batch generation, not ideal for low-cost live kiosk runtime.

Cost:

- Usually per second or per minute.
- Cheaper than some high-end avatar systems, but still not close to zero.

Use case:

- Batch upgrade approved answers.
- Generate premium cached answers.
- Create demos.

Not recommended for:

- Every new live question in Lite First mode.

Verdict:

- Keep as a batch/premium tool, not the Lite First runtime.

## Lip Sync Approaches

### Level 1: Volume-Based Mouth

Use audio volume to open/close mouth.

Pros:

- Very easy.
- Works with any TTS provider.
- Real-time.

Cons:

- Not accurate.
- Can look mechanical.

Use:

- First prototype.

### Level 2: Viseme Mouth Shapes

Use 5-9 mouth shapes and switch between them based on text/audio timing.

Pros:

- Much better than volume-only.
- Still lightweight.
- Works well for cartoon/vector avatars.

Cons:

- Needs timing data.
- Multilingual phoneme mapping can be tricky.

Use:

- Lite First MVP.

### Level 3: TTS Provider Timing

Some TTS providers can output word/character timing or streaming events. Use this to align mouth movement and subtitles.

Pros:

- Better timing.
- Good subtitle sync.

Cons:

- Provider-dependent.

Use:

- Production Lite First.

### Level 4: Local Lip-Sync Analysis

Use a local tool to generate mouth cues from generated audio.

Rhubarb Lip Sync is one useful reference because it outputs 2D mouth animation cues and uses 6-9 mouth positions.

Pros:

- Can run offline/server-side.
- Avoids per-minute avatar API cost.

Cons:

- Adds processing step.
- Needs testing for Arabic/French/English audio.

Source:

- Rhubarb Lip Sync: https://github.com/DanielSWolf/rhubarb-lip-sync

## Runtime Cost Model

For Lite First, the avatar itself should cost:

```text
Avatar render: $0 per conversation
Animation runtime: $0 per conversation
Subtitles: $0 if generated from the answer text
```

Paid runtime pieces:

- Speech-to-text.
- LLM/RAG response.
- Text-to-speech.

Example public pricing references:

- OpenAI GPT-4o mini transcription estimate: $0.003/minute.
- OpenAI GPT-Realtime-Whisper: $0.017/minute.
- Deepgram Nova/Flux STT ranges around fractions of a cent per minute depending model.
- Deepgram Aura TTS is priced per 1k characters.
- ElevenLabs has self-serve plans starting at $0, $6/month, $11/month, etc., with included credits/minutes by plan.

Sources:

- OpenAI API pricing: https://platform.openai.com/docs/pricing
- Deepgram pricing: https://deepgram.com/pricing
- ElevenLabs pricing: https://elevenlabs.io/pricing

## Build Difficulty Estimate

### Fastest Prototype: SVG Static Character

Time:

- 2-5 days for a basic working version.

Requires:

- Designer or generated concept art.
- 5 mouth states.
- Simple JS mouth animation.
- TTS playback.
- Subtitle rendering.

### Strong MVP: Rive Character

Time:

- 1-3 weeks depending design quality.

Requires:

- Character design.
- Rive state machine.
- Mouth shape states.
- Expression states.
- React integration.
- Audio timing logic.

### Advanced Lite: Live2D Character

Time:

- 3-8 weeks depending rigging skill.

Requires:

- Layered illustration.
- Live2D rigging.
- SDK integration.
- Licensing check.
- Strong QA.

## Recommended Build Path

### Step 1: SVG Prototype

Build now:

- Static avatar.
- 5 mouth shapes.
- Blinking.
- TTS audio.
- Subtitles.
- QR/action panel.

Goal:

- Validate conversation flow and customer reaction.

### Step 2: Rive Production Lite Avatar

Build next:

- Better animated character.
- State machine.
- Idle/listening/thinking/speaking states.
- Expression changes.
- Mouth shapes.

Goal:

- Make Lite First feel like a real product, not a placeholder.

### Step 3: Batch Premium Upgrade Path

Add later:

- Generate premium realistic avatar videos only for approved high-value answers.
- Keep Rive/SVG avatar for unknown questions.

Goal:

- Move from Lite First to Adaptive Hybrid.

### Step 4: Live2D/Mascot Experiment

Add later:

- Manga/cartoon premium-lite assistant.
- Strong brand mascot option.

Goal:

- Offer a differentiated visual style for customers who do not need photorealism.

## Final Decision

The Lite First avatar should be:

```text
Rive/SVG browser-rendered character
  + TTS
  + subtitles
  + semantic answer matching
  + expressive UI
```

This is feasible, low cost, and buildable with Codex/Claude Code. It gives the startup an owned runtime layer instead of depending on expensive video/avatar APIs for every conversation.

