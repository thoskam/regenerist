import { NextResponse } from 'next/server'
import { lightPack } from '@/lib/rules/build'
import { loadPack } from '@/lib/rules/pack'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ edition: string }> }) {
  const { edition } = await params
  if (edition !== '2014' && edition !== '2024') return NextResponse.json({ error: 'Unknown edition.' }, { status: 404 })
  try {
    return NextResponse.json(lightPack(loadPack(edition)), { headers: { 'Cache-Control': 'private, max-age=300' } })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 })
  }
}
