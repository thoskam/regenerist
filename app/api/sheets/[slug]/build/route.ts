import { NextResponse } from 'next/server'
import { updateBuild } from '@/lib/sheet/store'
import { errorResponse } from '../../errors'

export const dynamic = 'force-dynamic'

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const body = await req.json().catch(() => null)
    return NextResponse.json(await updateBuild((await params).slug, body?.build))
  } catch (e) {
    return errorResponse(e)
  }
}
