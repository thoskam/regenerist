import { NextResponse } from 'next/server'
import { regeneristGuard } from '@/lib/regeneristAccess'

// This route is deprecated - use /api/characters/[slug]/regenerate instead
export async function POST() {
  const denied = await regeneristGuard()
  if (denied) return denied
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/characters/[slug]/regenerate instead.' },
    { status: 410 }
  )
}
