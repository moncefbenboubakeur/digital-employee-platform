import { NextRequest, NextResponse } from 'next/server'
import { adminCookieName, getAdminSessionInfo } from '@/lib/digital-receptionist/server/auth'

export async function GET(request: NextRequest) {
  const session = getAdminSessionInfo(request.cookies.get(adminCookieName)?.value)

  return NextResponse.json({
    authenticated: Boolean(session?.valid),
    issuedAt: session?.issuedAt,
    expiresAt: session?.expiresAt,
  })
}
