import { NextResponse } from 'next/server'
import { requireViewer } from '@/lib/auth'
import { importFromDdb } from '@/lib/sheet/store'
import { errorResponse } from '../errors'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const viewer = await requireViewer()
    const body = await req.json().catch(() => ({}))
    const result = await importFromDdb(String(body?.url ?? ''), viewer)
    return NextResponse.json(result, { status: result.created ? 201 : 200 })
  } catch (e) {
    return errorResponse(e)
  }
}
