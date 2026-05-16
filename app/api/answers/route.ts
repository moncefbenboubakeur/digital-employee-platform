import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/digital-receptionist/server/auth'
import {
  deleteAnswer,
  getAdminPayload,
  getKioskPayload,
  saveAnswer,
} from '@/lib/digital-receptionist/server/repository'

export async function GET(request: NextRequest) {
  const admin = request.nextUrl.searchParams.get('admin') === '1'

  if (admin) {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(await getAdminPayload())
  }

  return NextResponse.json(await getKioskPayload())
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as { answer?: unknown }
  return NextResponse.json(await saveAnswer(body.answer as never))
}

export async function PUT(request: NextRequest) {
  return POST(request)
}

export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const answerId = request.nextUrl.searchParams.get('id')

  if (!answerId) {
    return NextResponse.json({ error: 'Missing answer id' }, { status: 400 })
  }

  return NextResponse.json(await deleteAnswer(answerId))
}
