import { NextResponse } from 'next/server'

// This route is deprecated - use /api/characters/[slug]/lives instead
export async function DELETE() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use DELETE /api/characters/[slug]/lives instead.' },
    { status: 410 }
  )
}
