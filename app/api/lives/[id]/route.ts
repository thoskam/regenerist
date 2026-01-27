import { NextResponse } from 'next/server'

// This route is deprecated - use /api/characters/[slug]/lives/[lifeId] instead
export async function GET() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/characters/[slug]/lives/[lifeId] instead.' },
    { status: 410 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/characters/[slug]/lives/[lifeId] instead.' },
    { status: 410 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/characters/[slug]/lives/[lifeId] instead.' },
    { status: 410 }
  )
}
