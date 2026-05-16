# Digital Employee Platform

Clean prototype root for the new digital-employee startup.

This folder is intentionally separate from `AlgeriaTechGen`.

## Routes

- `/` demo switcher
- `/kiosk` visitor-facing digital receptionist
- `/admin` protected admin console for setup, FAQ, review, operations, analytics, settings, and import/export
- `/admin/login` simple local admin login

## Current Scope

- Lite First receptionist prototype
- SQLite/Prisma pilot backend
- protected admin writes
- shared kiosk/admin approved answer cache
- shared unknown-question queue
- kiosk device heartbeat
- admin activity/audit view
- pilot analytics dashboard
- local admin password change
- pilot JSON import/export
- Arabic/French/English demo content
- browser-rendered 2D avatar
- imported local voice library from AlgeriaTechGen with 98 Arabic/French/English presets
- cached approved-answer WAV generation through `VOICE_COMMAND`
- browser TTS fallback with replay, stop, mute, and language-aware voice selection

No LLM, STT, HeyGen, D-ID, paid TTS provider, or billing provider is required for this prototype.

## Local Pilot Backend

Copy `.env.example` to `.env` if needed. The default local admin password is:

```txt
pilot-admin
```

The current SQLite URL points at `/private/tmp/digital-employee-platform-dev.db` because Prisma's SQLite engine does not behave well with this external volume path containing spaces.

Voice assets live in `storage/voice-library/`. Generated kiosk answer audio is cached in `storage/answer-audio/`.

The current local `VOICE_COMMAND` uses the AlgeriaTechGen XTTS virtualenv. That is suitable for this local prototype, but the XTTS/CPML path should be replaced with a commercial-safe voice provider before a paid pilot.

## Commands

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
npm test
npm run lint
npm run build
```

## Strategy Docs

The copied planning workspace lives in:

```txt
Codex/
```
