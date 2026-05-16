import { PrismaClient } from '@prisma/client'
import {
  hashPassword,
  adminCredentialId,
} from '../lib/digital-receptionist/server/auth'

import {
  defaultVoiceSettings,
} from '../lib/digital-receptionist/voice-library'

import {
  demoActions,
  initialDemoAnswers,
  initialUnknownQuestions,
  pilotProfile,
} from '../lib/digital-receptionist/demo-data'

const prisma = new PrismaClient()

const tenantId = 'tenant-demo-apc'
const locationId = 'location-bab-ezzouar-civil-status'

function toJson(value: unknown) {
  return JSON.stringify(value)
}

async function main() {
  const { passwordHash, passwordSalt } = hashPassword(process.env.ADMIN_PASSWORD ?? 'pilot-admin')

  await prisma.adminCredential.upsert({
    where: { id: adminCredentialId },
    create: {
      id: adminCredentialId,
      passwordHash,
      passwordSalt,
    },
    update: {
      passwordHash,
      passwordSalt,
    },
  })

  await prisma.kioskDevice.deleteMany({ where: { locationId } })
  await prisma.auditLog.deleteMany({ where: { locationId } })
  await prisma.questionEvent.deleteMany({ where: { locationId } })
  await prisma.unknownQuestion.deleteMany({ where: { locationId } })
  await prisma.answer.deleteMany({ where: { locationId } })
  await prisma.visitorAction.deleteMany({ where: { locationId } })
  await prisma.counter.deleteMany({ where: { locationId } })
  await prisma.location.deleteMany({ where: { id: locationId } })
  await prisma.tenant.deleteMany({ where: { id: tenantId } })

  await prisma.tenant.create({
    data: {
      id: tenantId,
      name: pilotProfile.tenantName.fr,
      locations: {
        create: {
          id: locationId,
          tenantNameJson: toJson(pilotProfile.tenantName),
          locationNameJson: toJson(pilotProfile.locationName),
          welcomeTitleJson: toJson(pilotProfile.welcomeTitle),
          serviceSummaryJson: toJson(pilotProfile.serviceSummary),
          privacyNoteJson: toJson(pilotProfile.privacyNote),
          openingHoursJson: toJson(pilotProfile.openingHours),
          contactNumber: pilotProfile.contactNumber,
          defaultLanguage: pilotProfile.defaultLanguage,
          currentWaitJson: toJson(pilotProfile.currentWait),
          liveStatusJson: toJson(pilotProfile.liveStatus),
          voiceSettingsJson: toJson(defaultVoiceSettings),
        },
      },
    },
  })

  await prisma.counter.createMany({
    data: pilotProfile.counters.map((counter, index) => ({
      id: counter.id,
      locationId,
      labelJson: toJson(counter.label),
      statusJson: toJson(counter.status),
      sortOrder: index,
    })),
  })

  await prisma.visitorAction.createMany({
    data: demoActions.map((action) => ({
      id: action.id,
      locationId,
      type: action.type,
      labelJson: toJson(action.label),
      descriptionJson: toJson(action.description),
      value: action.value,
    })),
  })

  await prisma.answer.createMany({
    data: initialDemoAnswers.map((answer) => ({
      id: answer.id,
      locationId,
      canonicalQuestionJson: toJson(answer.canonicalQuestion),
      answerTextJson: toJson(answer.answerText),
      keywordsJson: toJson(answer.keywords),
      actionId: answer.actionId,
      usageCount: answer.usageCount,
      lastUpdated: answer.lastUpdated,
      category: answer.category,
      published: answer.published,
    })),
  })

  await prisma.unknownQuestion.createMany({
    data: initialUnknownQuestions.map((question) => ({
      id: question.id,
      locationId,
      question: question.question,
      language: question.language,
      fallbackResponseJson: toJson(question.fallbackResponse),
      count: question.count,
      confidence: question.confidence,
      status: question.status,
      createdAt: new Date(question.createdAt),
    })),
  })

  await prisma.auditLog.create({
    data: {
      id: `audit-seed-${Date.now()}`,
      locationId,
      actor: 'system',
      action: 'seed',
      entityType: 'location',
      entityId: locationId,
      summary: 'Seeded default APC Bab Ezzouar pilot data.',
    },
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
