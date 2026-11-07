import { NextResponse } from 'next/server'
import { requireViewer } from '@/lib/auth'
import { createFromBuild } from '@/lib/sheet/store'
import { errorResponse } from '../errors'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const viewer = await requireViewer()
    const body = await req.json().catch(() => null)
    return NextResponse.json(await createFromBuild(body?.build, viewer.user?.id ?? null), { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
