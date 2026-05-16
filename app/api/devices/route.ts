import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/digital-receptionist/server/auth'
import { getAdminPayload, recordDeviceHeartbeat } from '@/lib/digital-receptionist/server/repository'

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json(await getAdminPayload())
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    deviceId?: string
    label?: string
  }

  if (!body.deviceId) {
    return NextResponse.json({ error: 'Missing device id' }, { status: 400 })
  }

  return NextResponse.json(
    await recordDeviceHeartbeat({
      deviceId: body.deviceId,
      label: body.label,
      userAgent: request.headers.get('user-agent') ?? undefined,
    })
  )
}
