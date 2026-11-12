import { NextResponse } from 'next/server'
import { AuthError, authEnabled, createAccount, getViewer, startSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { errorResponse } from '../../sheets/errors'

export const dynamic = 'force-dynamic'

/** Admins: list accounts. */
export async function GET() {
  try {
    const v = await getViewer()
    if (!v.user?.isAdmin) throw new AuthError('Admins only.', 403)
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, username: true, displayName: true, isAdmin: true, createdAt: true } })
    const counts = await prisma.playerCharacter.groupBy({ by: ['ownerId'], _count: { _all: true } })
    const owned = new Map(counts.map(c => [c.ownerId, c._count._all]))
    return NextResponse.json({ users: users.map(u => ({ ...u, characters: owned.get(u.id) ?? 0 })) })
  } catch (e) {
    return errorResponse(e)
  }
}

/** First account (turns on sign-in and signs you in), or an admin adding a player. */
export async function POST(req: Request) {
  try {
    const first = !(await authEnabled())
    const v = await getViewer()
    const body = await req.json().catch(() => ({}))
    const { id } = await createAccount({ username: body?.username, password: body?.password, displayName: body?.displayName }, v)
    if (first) await startSession(id)
    return NextResponse.json({ ok: true, first }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
