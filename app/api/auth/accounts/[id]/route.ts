import { NextResponse } from 'next/server'
import { deleteAccount, getViewer, updateAccount } from '@/lib/auth'
import { errorResponse } from '../../../sheets/errors'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

/** Admins: rename an account: { username?, displayName? }. */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const user = await updateAccount(await getViewer(), id, { username: body?.username, displayName: body?.displayName })
    return NextResponse.json({ ok: true, user })
  } catch (e) {
    return errorResponse(e)
  }
}

/** Admins: delete an account; its characters and DM'd parties move to the admin. */
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params
    const result = await deleteAccount(await getViewer(), id)
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return errorResponse(e)
  }
}
