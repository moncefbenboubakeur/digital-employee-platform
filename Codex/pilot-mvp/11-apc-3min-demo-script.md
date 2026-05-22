# APC Pilot — 3-Minute Demo Script

Audience: APC director, mairie chief of staff, or municipal IT lead.
Goal: in under 3 minutes, show that a citizen can self-serve common APC questions in their preferred language, that staff stay in control of what gets answered, and that the kiosk learns from real visitor questions.

Setup before the demo
- Pilot scenario applied: **APC Civil Status Desk** (default).
- Open two browser windows side-by-side:
  - Window A: kiosk at `http://localhost:3010/kiosk`.
  - Window B: admin at `http://localhost:3010/admin` (already authenticated).
- Make sure speakers are on; the kiosk uses the saved xtts voice for FR/AR.
- Kiosk should be on the **welcome screen** (not mid-conversation).

---

## 0:00 — 0:20 · Opening (the room)

Say:
> "This is a digital receptionist for a municipal office. Today it's configured for an APC civil-status desk in Bab Ezzouar — birth certificates, fiches familiales, residence certificates. Everything you'll see runs from the office's own data, no chat-GPT in the loop."

Point at the **welcome screen** (Window A): tenant name, "Touch to start", three big language tiles in Arabic / French / English.

## 0:20 — 0:50 · Citizen flow — Arabic visitor, common question

Tap the **العربية** tile on the kiosk.
Tap the quick-question "كيف أستخرج شهادة الميلاد رقم 12 (S12) ؟".

What the room sees:
- The answer appears in Arabic, read aloud in Amel's voice.
- A **giant cyan card** below the answer: "اتجه إلى → الشباك 3 — الحالة المدنية".
- The QR / document checklist area shows the S12 + ID + photos list.

Say:
> "One tap, one routing decision. The visitor never reads a 40-line FAQ. The card is large enough to read from across the room — that's deliberate, because in an APC people are standing 2 metres back trying to figure out which counter."

## 0:50 — 1:20 · French visitor — typed question

Tap **Français**. In the input bar, type:
> "Quels documents pour un certificat de résidence ?"

Press **Demander**.

What the room sees:
- Answer in French, spoken in the saved French voice.
- "Allez au → Guichet 3 — État civil" hero card.
- Description mentions ID + recent SONELGAZ bill + possible neighbour witnesses.

Say:
> "Same pipeline, same voice quality, different language. The cache holds the approved answer and the audio — so a real APC running this on cheap hardware doesn't pay an AI call per question."

## 1:20 — 1:50 · Unknown question (the magic moment)

Type in French:
> "Combien coûte un acte de naissance ?"

(or any question not covered by the seeded answers).

What the room sees:
- The avatar goes into "fallback" state.
- The answer panel shows the fallback line: *"Je n'ai pas encore une réponse validée…"* with the amber **Nouvelle question** badge.
- Spoken in the saved French voice — still feels like the same assistant.

Say:
> "It didn't make something up. The visitor is told honestly that the question is new and saved for review."

## 1:50 — 2:30 · Admin approves it live

Switch to Window B (admin). Show the **Unknown questions** queue — the question just appeared at the top.

Click **Approve**. Type a short answer in French (e.g. "L'extrait d'acte de naissance est gratuit. Apportez votre pièce d'identité."). Save.

What the room sees:
- The new question moves to the **published answers** list.
- The cache invalidates and the new answer is now matched.

Say:
> "The director just trained the kiosk in 20 seconds. Nothing was sent outside. Tomorrow when another citizen asks the same question, the answer is there."

## 2:30 — 2:50 · Citizen flow round-trip

Switch back to Window A (kiosk). Re-ask the same French question:
> "Combien coûte un acte de naissance ?"

What the room sees:
- This time the green **Réponse validée** badge appears.
- The freshly approved answer is read aloud.

Say:
> "Same kiosk, two minutes later, fully answered. That feedback loop is the whole product."

## 2:50 — 3:00 · Close

Say:
> "Three languages, one French voice, one Arabic voice, runs from a local cache, no AI call on the visitor path. The next step is plugging this into one real APC for two weeks and measuring how many counter-routing questions staff stop answering by hand. That's the pilot."

---

## Recovery & gotchas

- **Voice doesn't play on first tap**: some browsers block audio until a user gesture — tap the **Mute / Unmute** button in the answer panel once.
- **Welcome screen comes back during the demo**: idle timer is 90 s. Speak through it; pressing anything resets it.
- **Admin window logged out**: re-auth with the single demo password before starting the demo.
- **Unknown question doesn't appear in admin**: refresh the admin page; the prototype store syncs via API but not via websocket.
- **Arabic layout looks wrong**: confirm `<main dir="rtl">` is taking effect — the language switcher should be on the right of the header.
