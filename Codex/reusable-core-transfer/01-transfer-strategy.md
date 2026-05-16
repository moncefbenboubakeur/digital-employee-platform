# Transfer Strategy

## What We Are Transferring

The existing repo already proves several important product mechanics:

- A user can configure voice, avatar, language, assets, and output format.
- The system can run a multi-step media pipeline safely.
- Long-running local or remote engines can be wrapped behind adapters.
- Generated artifacts can be stored, reused, packaged, and inspected later.
- Logs and status make generation failures understandable.
- The UI can expose engine choices without forcing the user to understand every technical detail.

These are valuable for the new startup.

## What Changes In The New Startup

AlgeriaTechGen answers this:

```txt
Article -> Script -> Voice -> Avatar -> Rendered MP4 -> YouTube package
```

The new startup answers this:

```txt
Human question -> Knowledge lookup -> Safe answer -> Audio/avatar response -> Cache -> Analytics -> Optional premium upgrade
```

So the transfer should focus on reusable mechanisms:

- Provider adapters
- Job state
- Catalogs
- Artifact storage
- Logs
- Budget and fallback policy
- Cached answer reuse

It should not transfer the article workflow as the main platform workflow.

## Transfer Levels

### Direct Transfer

These can be copied conceptually with minimal change:

- Adapter/factory pattern
- Local command runner pattern
- Render job status pattern
- Storage helper pattern
- Catalog loader pattern
- Log file pattern
- Generated manifest idea

### Adapted Transfer

These need renaming and reshaping:

- `Project` becomes `Tenant`, `Location`, `KioskDevice`, `Answer`, `CachedMedia`
- `RenderJob` becomes several job types
- `VoicePreset` becomes a provider-independent `VoiceProfile`
- `AvatarMode` becomes an avatar policy and provider choice
- `generated/render/export` becomes `live-cache/premium-media/reports`

### Reference Only

These should be kept as examples, not transferred as core code:

- Decision Radar
- Article HTML extraction
- YouTube description builder
- Remotion templates for AlgeriaTech videos
- Local XTTS/Wav2Lip/SadTalker as production engines

## First Product Rule

The new startup must not block a live visitor while a human admin approves an answer.

The correct runtime behavior is:

```txt
Known question:
  serve approved cached answer immediately

New question:
  generate a live safe answer immediately
  store the question and answer candidate
  let admin review later for reuse, correction, or premium video generation
```

This separates live experience from governance.

## Cost Rule

Every answer should have a cost path:

- Cached text/audio/video: near-zero marginal cost
- Lite 2D avatar: very low cost
- Premium generated avatar: controlled cost
- Full live premium avatar: high-cost plan only

This maps directly to the four product levels already documented:

- Lite First
- Adaptive Hybrid
- Budgeted Premium
- Full Live Premium
