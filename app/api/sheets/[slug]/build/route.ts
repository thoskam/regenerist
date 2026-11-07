import { NextResponse } from 'next/server'
import { guardCharacter } from '@/lib/sheet/access'
import { updateBuild } from '@/lib/sheet/store'
import { errorResponse } from '../../errors'

export const dynamic = 'force-dynamic'

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    await guardCharacter(slug, 'write')
    const body = await req.json().catch(() => null)
    return NextResponse.json(await updateBuild(slug, body?.build))
  } catch (e) {
    return errorResponse(e)
  }
}
