# Demo Script

This script defines the first customer-facing demo.

## Demo Scenario

Location:

```txt
Municipal service office / branch reception
```

Assistant:

```txt
Name: Amel
Languages: Arabic, French, English
Avatar mode: Lite 2D
Voice: simple TTS
```

## Opening

The kiosk shows:

```txt
Arabic | Français | English

How can I help you?

[Where do I go?]
[What documents do I need?]
[What services are available?]
[Opening hours]
[Scan QR code]
```

## Sample Approved Questions

### 1. Who are you?

Answer:

```txt
I am the digital receptionist for this office. I can help you find the right service, check required documents, and show QR codes for useful links.
```

### 2. What services are available?

Answer:

```txt
This office can help with certificate requests, document renewal information, appointment guidance, and general orientation. For personal file decisions, please speak with the information desk.
```

### 3. Where do I go for document renewal?

Answer:

```txt
For document renewal, please go to Counter 3. If the counter is busy, take a ticket from the queue machine near the entrance.
```

### 4. What documents do I need?

Answer:

```txt
For renewal, bring your current document, a valid ID, two photos, and the payment receipt if required. Scan the QR code to see the checklist.
```

QR action:

```txt
Document checklist
```

### 5. Can I speak Arabic?

Answer:

```txt
Yes. You can use Arabic, French, or English. Tap the language button at the top of the screen.
```

### 6. What are the opening hours?

Answer:

```txt
This office is open from 8:30 to 16:30, Sunday to Thursday. Hours may change during holidays.
```

### 7. I do not know which counter I need.

Answer:

```txt
Tell me what service you need, and I will try to guide you. If you are not sure, please go to the information desk near the entrance.
```

### 8. Can I scan a QR code?

Answer:

```txt
Yes. I can show QR codes for checklists, forms, contact pages, and service information.
```

## Unknown Question Demo

User asks:

```txt
Can I submit documents for my father?
```

Assistant response:

```txt
I am not fully sure for this specific case. Some services require the person to be present, and some allow a representative with authorization. Please ask the information desk before waiting in line.
```

System behavior:

```txt
Stores question as AnswerCandidate
Marks confidence medium/low
Shows in admin review queue
```

## Admin Demo

Admin sees:

```txt
Unknown question:
"Can I submit documents for my father?"

Suggested answer:
"Some services require the person to be present..."

Actions:
[Approve]
[Edit and approve]
[Reject]
[Mark out of scope]
```

Admin edits:

```txt
For document renewal, a family member may submit the file only with signed authorization and a copy of the applicant's ID. For final collection, the applicant may need to be present.
```

Then approves.

Next time, the kiosk answers instantly.

## Demo Success Moment

The demo should make the customer feel:

```txt
This could answer 70 percent of the questions our staff repeats every day.
```

That is more important than showing the most realistic avatar.
