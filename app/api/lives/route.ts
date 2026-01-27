import { NextResponse } from 'next/server'

// This route is deprecated - use /api/characters/[slug]/lives instead
export async function GET() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/characters/[slug]/lives instead.' },
    { status: 410 }
  )
}

export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/characters/[slug]/regenerate instead.' },
    { status: 410 }
  )
}
