import { NextResponse } from 'next/server'
import { legacyGuard } from '@/lib/legacyGuard'
import { searchCatalog } from '@/lib/catalog/items'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const denied = await legacyGuard()
  if (denied) return denied
  const q = new URL(req.url).searchParams.get('q') ?? ''
  return NextResponse.json({ items: searchCatalog(q.slice(0, 80)) })
}
