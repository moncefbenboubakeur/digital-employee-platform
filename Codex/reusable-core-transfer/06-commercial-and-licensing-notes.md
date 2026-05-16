# Commercial And Licensing Notes

This file exists because the current AlgeriaTechGen repo contains strong prototype engines, but not all of them are clean commercial foundations.

## Existing Local Engines

### Coqui XTTS

Current role in AlgeriaTechGen:

- local TTS
- voice cloning from reference audio
- voice preset library

Commercial caution:

- The setup script explicitly references CPML and non-commercial usage.
- Treat as prototype and internal experimentation unless commercial rights are confirmed.

Startup recommendation:

- Do not depend on XTTS for paid kiosk production unless licensing is resolved.
- Use commercially licensed TTS providers for customer deployments.
- Keep the adapter pattern so providers can be swapped later.

### Wav2Lip

Current role in AlgeriaTechGen:

- lip-sync from portrait image plus audio

Commercial caution:

- Setup script references research/non-commercial license.

Startup recommendation:

- Use only for experiments, demos, and internal comparison.
- Do not make it the commercial kiosk avatar engine.

### SadTalker

Current role in AlgeriaTechGen:

- higher-motion portrait avatar generation

Commercial caution:

- Setup script references research/non-commercial license.
- Slow on CPU and not suitable for live kiosk response.

Startup recommendation:

- Use as a quality benchmark only.
- Prefer provider APIs or a custom licensed lightweight avatar stack.

## Premium Avatar APIs

Possible providers:

- HeyGen
- D-ID
- Synthesia or Colossyan for batch content, depending API access
- Other regionally appropriate providers

Commercial requirements:

- confirm API terms
- confirm kiosk/public-display rights
- confirm data retention policy
- confirm voice/avatar cloning rights
- confirm whether generated videos can be cached and replayed
- confirm Arabic/French support and regional Arabic variants

## Lite Avatar Stack

Best commercial path for low-cost plans:

- own the 2D/vector/avatar UI
- use browser rendering
- use TTS audio and subtitles
- use simple viseme or amplitude-based mouth movement
- avoid restricted ML weights

This gives the startup an owned fallback that cannot be killed by provider cost or policy changes.

## Data And Privacy

Kiosk deployments may happen in:

- government offices
- banks
- energy companies
- telecom branches
- hospitals or clinics
- malls

So the platform should assume:

- questions may contain personal data
- logs need retention rules
- customers may need local data hosting
- admin approvals need audit trails
- answers need source provenance
- public kiosk abuse is normal and must be rate-limited

## Product Risk Rule

Never build the startup so that one provider is required for the product to work.

The platform should survive:

- HeyGen outage
- TTS provider outage
- LLM provider outage
- budget exhausted
- bad network
- unknown question

Fallback chain:

```txt
premium avatar -> lite avatar -> audio/subtitles -> text/QR -> human escalation
```

This is the core reliability principle for real-world kiosks.
