import { NextResponse } from 'next/server'
import { listSheets } from '@/lib/sheet/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ characters: await listSheets() })
}
