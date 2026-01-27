import { NextResponse } from 'next/server'

// This route is deprecated - use /api/characters/[slug]/regenerate instead
export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/characters/[slug]/regenerate instead.' },
    { status: 410 }
  )
}
