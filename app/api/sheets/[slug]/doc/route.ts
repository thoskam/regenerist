import { NextResponse } from 'next/server'
import { guardCharacter } from '@/lib/sheet/access'
import { editDoc } from '@/lib/sheet/store'
import { errorResponse } from '../../errors'
import { hideRegenerist } from '@/lib/regeneristAccess'

export const dynamic = 'force-dynamic'
type Ctx = { params: Promise<{ slug: string }> }

/** Body: a DocOp (lib/sheet/docOps.ts) or { op: 'item.add', catalogKey, id, quantity?, magicBonus? }. */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const { slug } = await params
    const v = await guardCharacter(slug, 'write')
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 })
    return NextResponse.json(hideRegenerist({ doc: await editDoc(slug, body) }, v))
  } catch (e) {
    return errorResponse(e)
  }
}
