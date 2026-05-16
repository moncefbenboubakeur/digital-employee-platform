import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { prisma } from './db'

export const adminCookieName = 'digital_receptionist_admin'
export const adminCredentialId = 'admin'
export const adminSessionMaxAgeMs = 1000 * 60 * 60 * 12

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? 'change-this-before-a-real-pilot'
}

export function expectedAdminPassword() {
  return process.env.ADMIN_PASSWORD ?? 'pilot-admin'
}

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  const passwordHash = crypto
    .pbkdf2Sync(password, salt, 120_000, 32, 'sha256')
    .toString('hex')

  return { passwordHash, passwordSalt: salt }
}

export function verifyPasswordHash(password: string, passwordHash: string, passwordSalt: string) {
  const candidate = hashPassword(password, passwordSalt).passwordHash

  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(passwordHash))
}

export async function verifyAdminPassword(password: string) {
  const credential = await prisma.adminCredential.findUnique({
    where: { id: adminCredentialId },
  })

  if (!credential) {
    return password === expectedAdminPassword()
  }

  return verifyPasswordHash(password, credential.passwordHash, credential.passwordSalt)
}

export async function setAdminPassword(password: string) {
  const { passwordHash, passwordSalt } = hashPassword(password)

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
}

export function signAdminSession() {
  const issuedAt = Date.now().toString()
  const signature = crypto
    .createHmac('sha256', sessionSecret())
    .update(`admin:${issuedAt}`)
    .digest('hex')

  return `${issuedAt}.${signature}`
}

export function isValidAdminSession(value: string | undefined) {
  return Boolean(getAdminSessionInfo(value)?.valid)
}

export function getAdminSessionInfo(value: string | undefined) {
  if (!value) {
    return undefined
  }

  const [issuedAt, signature] = value.split('.')

  if (!issuedAt || !signature) {
    return undefined
  }

  const issuedAtNumber = Number(issuedAt)

  if (!Number.isFinite(issuedAtNumber) || Date.now() - issuedAtNumber > adminSessionMaxAgeMs) {
    return undefined
  }

  const expected = crypto
    .createHmac('sha256', sessionSecret())
    .update(`admin:${issuedAt}`)
    .digest('hex')

  const valid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))

  if (!valid) {
    return undefined
  }

  return {
    valid,
    issuedAt: new Date(issuedAtNumber).toISOString(),
    expiresAt: new Date(issuedAtNumber + adminSessionMaxAgeMs).toISOString(),
  }
}

export async function hasAdminCookie() {
  const cookieStore = await cookies()
  return isValidAdminSession(cookieStore.get(adminCookieName)?.value)
}

export function isAdminRequest(request: NextRequest) {
  return isValidAdminSession(request.cookies.get(adminCookieName)?.value)
}
