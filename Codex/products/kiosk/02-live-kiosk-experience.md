# Live Kiosk Experience

## Visitor Journey

1. Visitor approaches the kiosk.
2. Idle screen shows that Arabic, French, and English are supported.
3. Visitor taps a language or starts speaking.
4. Kiosk captures the question.
5. System detects language and intent.
6. System searches the Approved Answer Library.
7. If a match is found, a saved avatar video plays instantly.
8. If no match is found, the system answers live or uses a safe fallback.
9. The visitor can ask another question, scan a QR code, or request human help.

## Example Flow

Question:

> Where do I go for passport renewal?

System behavior:

- Detect language.
- Search approved answers.
- Find official answer for passport renewal.
- Play cached video.
- Display floor/office details.
- Show QR code for appointment or document list.
- Offer button: "Repeat", "Show documents", "Ask another question".

## Interface Elements

- Large avatar/video area.
- Microphone button.
- Language selector.
- Subtitle area.
- Suggested question buttons.
- QR code panel.
- Human help button.
- Restart/clear session control.

## Important UX Rules

- The kiosk should never make the user wait for admin approval.
- The system should answer immediately when safe.
- If uncertain, ask a short clarifying question.
- If sensitive and not approved, route to a human or official document.
- The avatar should not talk all day. Use an idle screen or loop until a visitor starts.

## Languages

Initial:

- Arabic.
- French.
- English.

Later:

- Algerian Darja.
- Tamazight variants where commercially needed.

