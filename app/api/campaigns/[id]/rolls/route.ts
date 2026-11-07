import { NextResponse } from 'next/server'
import { requireViewer } from '@/lib/auth'
import { postRoll, recentRolls, requireMember } from '@/lib/campaigns'
import { errorResponse } from '../../../sheets/errors'

export const dynamic = 'force-dynamic'
type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const v = await requireViewer()
    const { id } = await params
    await requireMember(v, id)
    return NextResponse.json({ rolls: await recentRolls(id) })
  } catch (e) { return errorResponse(e) }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const v = await requireViewer()
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    return NextResponse.json({ roll: await postRoll(v, id, body ?? {}) }, { status: 201 })
  } catch (e) { return errorResponse(e) }
}
