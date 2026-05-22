# Kiosk Matcher Test Set — bypass-and-match through LAPI

A curated set of paraphrased visitor questions that:
1. **Bypass the local keyword matcher** in [`lib/digital-receptionist/prototype-logic.ts`](../lib/digital-receptionist/prototype-logic.ts) (so the kiosk *has* to call out to LAPI), and
2. **Match the expected approved answer** with high or medium confidence through the LAPI semantic matcher (currently routed to `codex-cli` per [`~/.llmbridge/projects/dep-match.yaml`](../../../../Users/moncefbenboubakeur/.llmbridge/projects/dep-match.yaml)).

Use these to exercise the live matcher path end-to-end in the kiosk UI without writing test code.

## Prerequisites

1. LAPI daemon running on `127.0.0.1:9999` (see [`lapi-setup.md`](./lapi-setup.md))
2. DEP `.env` has `DR_LLM_MATCH=1` set
3. DEP dev server up: `npm run dev` → http://localhost:3010/kiosk

## Question set

Source of truth: [`scripts/kiosk-bypass-questions.json`](../scripts/kiosk-bypass-questions.json). All 20 entries verified `bypass=20/20` (keyword matcher misses) AND `match=20/20` (LAPI returns the expected answer id with high/medium confidence) as of 2026-05-22.

### French (set kiosk language to FR)

| Expected answer | Question |
|---|---|
| `opening-hours` | À partir de quelle heure puis-je passer cette semaine ? |
| `birth-certificate` | Quel justificatif prouve que je suis bien né dans cette commune ? |
| `required-documents` | Qu'est-ce qu'il faut apporter avec moi le jour de ma visite ? |
| `family-record` | Comment obtenir le récapitulatif qui liste tous les membres de mon foyer ? |
| `residence-certificate` | Comment prouver que j'habite bien à cette adresse ? |
| `contact-office` | Comment puis-je vous joindre en dehors de ma visite ? |
| `information-desk` | Dans quelle partie du hall puis-je trouver l'employé qui répond aux visiteurs ? |
| `incomplete-file` | J'ai oublié un justificatif à la maison, est-ce que je dois rentrer ? |
| `elderly-help` | Ma grand-mère a du mal à marcher, pouvez-vous faire quelque chose pour elle ? |
| `which-counter` | Je suis perdu, à qui dois-je m'adresser en premier ? |

### English (set kiosk language to EN)

| Expected answer | Question |
|---|---|
| `opening-hours` | Until what moment can I stop by this week? |
| `birth-certificate` | How do I prove I was born in this town? |
| `required-documents` | What should I bring along on the day of my visit? |
| `family-record` | How do I get the sheet that lists everyone in my household? |
| `residence-certificate` | How do I prove that I live at this address? |
| `contact-office` | How can I reach you outside my visit? |
| `information-desk` | In which part of the hall can I find the staff member who handles visitor questions? |
| `incomplete-file` | I left something needed at home, should I head back? |
| `elderly-help` | My grandmother walks slowly, can someone speed things up for her? |
| `which-counter` | I am lost, who should I talk to first? |

## How to confirm a call really went through LAPI

The kiosk first runs the question through the local keyword matcher. Only on a miss does it POST `/api/llm-match` → `findLlmMatch()` → LAPI. Signals that a LAPI call happened:

- **First question after kiosk load:** 5-9s spinner (cold `codex` spawn).
- **Subsequent questions:** 2-3s (warm subprocess in the LAPI daemon).
- **Daemon log line per call:** `tail -f /tmp/lapi-v241-daemon.log` (or wherever you redirected the daemon stdout).
- **Audit log line per call:** `tail -f ~/.llmbridge/llmbridge.log` (project name, latency, ok/error).

If you see sub-300ms response time, the question got caught by the keyword matcher locally — LAPI was never called.

## Helper scripts

- [`scripts/verify-kiosk-bypass.ts`](../scripts/verify-kiosk-bypass.ts) — offline check. For each question, runs the local `matchQuestion()` and reports leaks (questions the keyword matcher would catch).
  ```
  npx tsx scripts/verify-kiosk-bypass.ts
  ```
- [`scripts/verify-kiosk-lapi.ts`](../scripts/verify-kiosk-lapi.ts) — end-to-end check. POSTs each question to a running kiosk dev server (port 3010) and prints whether LAPI returned the expected answer id, with per-call latency.
  ```
  npx tsx scripts/verify-kiosk-lapi.ts
  ```

Run `verify-kiosk-bypass.ts` after editing the question file, then `verify-kiosk-lapi.ts` after any LAPI routing or model change.

## Adding new questions

1. Edit [`scripts/kiosk-bypass-questions.json`](../scripts/kiosk-bypass-questions.json):
   ```json
   { "id": "<answer-id-from-demo-data.ts>", "lang": "fr|en|ar", "q": "<paraphrased question>" }
   ```
2. Run the bypass verifier — must show `Bypasses keyword matcher: N/N` with no leaks.
   - If a question leaks, look at the `caught by "<id>"` hint and drop the trigger word (often `document`, `paper`, `where`, `naissance`, `extrait`).
3. Run the LAPI verifier — must show `LAPI matched correctly: N/N`.
   - If a question mismatches but the suggested match is semantically reasonable, the paraphrase is ambiguous — rewrite to disambiguate from the wrong answer.
