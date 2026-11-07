import { NextResponse } from 'next/server'
import { legacyGuard } from '@/lib/legacyGuard'

// This route is deprecated - use /api/characters/[slug]/lives/[lifeId] instead
export async function GET() {
  const denied = await legacyGuard()
  if (denied) return denied
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/characters/[slug]/lives/[lifeId] instead.' },
    { status: 410 }
  )
}

export async function PUT() {
  const denied = await legacyGuard()
  if (denied) return denied
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/characters/[slug]/lives/[lifeId] instead.' },
    { status: 410 }
  )
}

export async function DELETE() {
  const denied = await legacyGuard()
  if (denied) return denied
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/characters/[slug]/lives/[lifeId] instead.' },
    { status: 410 }
  )
}
