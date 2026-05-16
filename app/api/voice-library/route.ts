import { NextResponse } from 'next/server'
import { loadVoiceCatalog } from '@/lib/digital-receptionist/server/voice-library'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(await loadVoiceCatalog())
}
