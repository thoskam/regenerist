import { NextResponse } from 'next/server'
import { requireViewer } from '@/lib/auth'
import { listSheets } from '@/lib/sheet/store'
import { errorResponse } from './errors'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json({ characters: await listSheets(await requireViewer()) })
  } catch (e) {
    return errorResponse(e)
  }
}
