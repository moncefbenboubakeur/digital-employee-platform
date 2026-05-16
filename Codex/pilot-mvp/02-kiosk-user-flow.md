# Kiosk User Flow

## First Screen

The kiosk opens directly into the assistant experience.

It should show:

- simple avatar area
- language selector: Arabic, French, English
- quick question buttons
- input box
- microphone button if voice input is enabled
- QR area when an answer includes a link or form

No landing page. No marketing text. The kiosk must feel like a tool.

## Main Flow

```txt
Visitor chooses language
  -> visitor taps common question or types question
  -> system normalizes question
  -> system searches approved answer cache
  -> if found: answer immediately
  -> if not found: generate safe answer from approved knowledge
  -> speak answer
  -> show subtitles
  -> show QR/direction/action if available
  -> log event
```

## Known Question Flow

Example:

Visitor asks:

```txt
What documents do I need to renew my card?
```

System:

```txt
Finds approved answer
  -> displays answer text
  -> plays cached or generated audio
  -> animates lite avatar
  -> shows QR code for document checklist
  -> logs cache hit
```

The visitor should get the answer in under 2 seconds if audio is already cached.

## New Question Flow

Example:

Visitor asks:

```txt
Can I submit the file on behalf of my father?
```

System:

```txt
No exact approved answer
  -> searches approved knowledge
  -> generates cautious answer
  -> says what it knows
  -> says when staff confirmation is needed
  -> stores question + answer candidate
  -> admin reviews later
```

Important: the visitor does not wait for admin approval.

## Unknown Or Unsafe Flow

If confidence is low or the question is outside scope:

```txt
I am not sure about this answer. Please go to the information desk or scan this QR code to contact support.
```

The kiosk should be honest instead of pretending.

## Language Flow

The user can change language at any time.

When language changes:

- UI language changes
- answer language changes
- voice profile changes
- cached answer lookup prefers the selected language

If no answer exists in selected language:

- use generated translation only if policy allows
- otherwise show "This answer is currently available in French/Arabic" and offer switch

## Avatar Behavior

MVP avatar behavior:

- idle breathing/blinking
- mouth movement from audio amplitude or simple visemes
- listening state
- thinking state
- speaking state
- fallback static state

No premium live avatar is required in the first MVP.

## Fallback Chain

```txt
cached premium video
  -> cached audio + lite avatar
  -> generated audio + lite avatar
  -> text + subtitles
  -> QR/human escalation
```

The kiosk should always be useful even when one provider fails.
