import { NextResponse } from 'next/server'
import { regeneristGuard } from '@/lib/regeneristAccess'

// This route is deprecated - use /api/characters/[slug]/lives instead
export async function GET() {
  const denied = await regeneristGuard()
  if (denied) return denied
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/characters/[slug]/lives instead.' },
    { status: 410 }
  )
}

export async function POST() {
  const denied = await regeneristGuard()
  if (denied) return denied
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/characters/[slug]/regenerate instead.' },
    { status: 410 }
  )
}
