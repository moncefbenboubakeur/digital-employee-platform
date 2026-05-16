import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/digital-receptionist/server/auth'
import { getKioskPayload, saveProfile } from '@/lib/digital-receptionist/server/repository'

export async function GET() {
  return NextResponse.json(await getKioskPayload())
}

export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as { profile?: unknown }
  return NextResponse.json(await saveProfile(body.profile as never))
}
