import { NextResponse } from 'next/server'
import { searchCatalog } from '@/lib/catalog/items'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q') ?? ''
  return NextResponse.json({ items: searchCatalog(q.slice(0, 80)) })
}
