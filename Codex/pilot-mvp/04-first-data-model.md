# First Data Model

This is a product-level data model, not a final database schema.

## Tenant

Customer organization.

Fields:

- id
- name
- industry
- defaultLanguages
- plan
- createdAt

## Location

Physical place where the assistant is deployed.

Fields:

- id
- tenantId
- name
- address
- timezone
- defaultLanguage
- openingHours
- createdAt

## KioskDevice

Installed kiosk or browser device.

Fields:

- id
- tenantId
- locationId
- deviceName
- deviceType
- status
- lastSeenAt
- assignedPersonaId

## Persona

Assistant identity and behavior.

Fields:

- id
- tenantId
- name
- tone
- supportedLanguages
- avatarProfileId
- voiceProfileIds
- allowedTopics
- escalationMessage

## KnowledgeSource

Structured information or uploaded content.

Fields:

- id
- tenantId
- locationId
- type
- title
- body
- language
- sourceFilePath
- status
- createdAt
- updatedAt

Types:

- service
- faq
- document_requirement
- direction
- contact
- policy
- free_text

## Answer

Approved reusable answer.

Fields:

- id
- tenantId
- locationId
- canonicalQuestion
- answerText
- language
- status
- confidenceThreshold
- sourceIds
- qrActionId
- effectiveFrom
- effectiveTo
- createdAt
- updatedAt

Statuses:

- draft
- approved
- archived
- rejected

## AnswerCandidate

Generated answer waiting for admin review.

Fields:

- id
- tenantId
- locationId
- questionEventId
- rawQuestion
- normalizedQuestion
- generatedAnswer
- language
- confidence
- sourceIds
- status
- adminNotes
- createdAt

Statuses:

- pending_review
- approved
- edited_and_approved
- rejected
- merged
- out_of_scope

## CachedMedia

Generated media attached to an answer.

Fields:

- id
- tenantId
- answerId
- mediaType
- language
- provider
- filePath
- durationSeconds
- costEstimate
- generationJobId
- createdAt

Media types:

- audio
- lite_animation
- premium_video
- subtitles

## QuestionEvent

A live visitor interaction.

Fields:

- id
- tenantId
- locationId
- kioskDeviceId
- rawQuestion
- normalizedQuestion
- inputMode
- language
- cacheHit
- matchedAnswerId
- generatedCandidateId
- responseMode
- confidence
- latencyMs
- estimatedCost
- escalated
- createdAt

Input modes:

- button
- typed
- voice

Response modes:

- cached_text
- cached_audio_lite_avatar
- generated_audio_lite_avatar
- premium_cached_video
- premium_live
- fallback_text
- human_escalation

## BudgetPolicy

Controls cost behavior.

Fields:

- id
- tenantId
- locationId
- avatarPolicy
- dailyBudgetUsd
- hourlyBudgetUsd
- premiumDailyLimit
- unknownQuestionLimitPerHour
- fallbackMode
- createdAt
- updatedAt

Avatar policies:

- lite_first
- adaptive_hybrid
- budgeted_premium
- full_live_premium

## CostLedger

Tracks provider usage.

Fields:

- id
- tenantId
- locationId
- questionEventId
- provider
- operation
- units
- estimatedCostUsd
- actualCostUsd
- createdAt

Operations:

- stt
- llm
- tts
- lite_avatar
- premium_video
- premium_live_avatar

## QRAction

Reusable QR/link action.

Fields:

- id
- tenantId
- locationId
- label
- url
- language
- description
- createdAt

## First Schema Priority

Build these first:

1. Tenant
2. Location
3. KioskDevice
4. KnowledgeSource
5. Answer
6. AnswerCandidate
7. CachedMedia
8. QuestionEvent
9. BudgetPolicy

Everything else can follow after the pilot starts teaching us.
