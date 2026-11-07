import { NextResponse } from 'next/server'
import { legacyGuard } from '@/lib/legacyGuard'

// This route is deprecated - use /api/characters/[slug]/lives instead
export async function GET() {
  const denied = await legacyGuard()
  if (denied) return denied
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/characters/[slug]/lives instead.' },
    { status: 410 }
  )
}

export async function POST() {
  const denied = await legacyGuard()
  if (denied) return denied
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/characters/[slug]/regenerate instead.' },
    { status: 410 }
  )
}
