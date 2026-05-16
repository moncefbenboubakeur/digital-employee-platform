# Safety And Governance

## Principle

The product must be useful, but it must not invent official answers in sensitive contexts.

## Risk Levels

### Low Risk

Examples:

- Store directory.
- Opening hours.
- Event schedule.
- General company information.
- QR code for brochure.

Behavior:

- Cached answer preferred.
- Live answer allowed if source data is available.

### Medium Risk

Examples:

- Appointment instructions.
- Service eligibility.
- Required documents.
- Pricing.
- HR process.

Behavior:

- Prefer approved answers.
- Live answer must cite internal source or show fallback.

### High Risk

Examples:

- Legal advice.
- Medical advice.
- Banking decisions.
- Government procedure interpretation.
- Security instructions.
- Payments or account access.

Behavior:

- Use approved answers only.
- If no approved answer exists, route to human or official source.

## Guardrails

- Every answer should have a source or approval status.
- Unknown sensitive questions should not be answered freely.
- Session logs should avoid storing unnecessary personal data.
- Voice recordings should be optional and privacy-controlled.
- Admin actions should be auditable.
- Expiring answers should be reviewed before reuse.

## Safe Fallback Examples

```text
I do not have an approved answer for this question yet. Please speak with the reception desk or scan this QR code for the official information.
```

```text
For this service, I can only show approved information. Please choose one of the options on screen or ask a staff member for help.
```

## Human Handoff

Handoff options:

- Notify reception.
- Show desk number.
- Generate queue ticket.
- Display QR code.
- Start WhatsApp or web chat.
- Print or display a support code.

