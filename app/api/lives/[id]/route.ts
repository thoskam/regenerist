import { NextResponse } from 'next/server'
import { regeneristGuard } from '@/lib/regeneristAccess'

// This route is deprecated - use /api/characters/[slug]/lives/[lifeId] instead
export async function GET() {
  const denied = await regeneristGuard()
  if (denied) return denied
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/characters/[slug]/lives/[lifeId] instead.' },
    { status: 410 }
  )
}

export async function PUT() {
  const denied = await regeneristGuard()
  if (denied) return denied
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/characters/[slug]/lives/[lifeId] instead.' },
    { status: 410 }
  )
}

export async function DELETE() {
  const denied = await regeneristGuard()
  if (denied) return denied
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/characters/[slug]/lives/[lifeId] instead.' },
    { status: 410 }
  )
}
