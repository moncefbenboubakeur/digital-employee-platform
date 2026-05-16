import { NextResponse } from 'next/server'
import {
  adminCookieName,
  signAdminSession,
  verifyAdminPassword,
} from '@/lib/digital-receptionist/server/auth'

export async function POST(request: Request) {
  const body = (await request.json()) as { password?: string }

  if (!body.password || !(await verifyAdminPassword(body.password))) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(adminCookieName, signAdminSession(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 12,
    path: '/',
  })

  return response
}
