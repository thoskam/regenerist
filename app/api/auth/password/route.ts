import { NextResponse } from 'next/server'
import { AuthError, changePassword, getViewer, resetPassword } from '@/lib/auth'
import { errorResponse } from '../../sheets/errors'

export const dynamic = 'force-dynamic'

// Same throttle as login: 10 wrong current passwords per account per 10 minutes.
const attempts = new Map<string, { n: number; until: number }>()

/** Change your own password: { current, password }. */
export async function POST(req: Request) {
  const v = await getViewer()
  if (!v.user) return errorResponse(new AuthError('Sign in to continue.', 401))
  const key = v.user.id
  const a = attempts.get(key)
  if (a && a.n >= 10 && a.until > Date.now()) return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 })
  const body = await req.json().catch(() => ({}))
  try {
    await changePassword(v, body?.current, body?.password)
    attempts.delete(key)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof AuthError && e.status === 403) {
      const cur = attempts.get(key)
      attempts.set(key, { n: (cur && cur.until > Date.now() ? cur.n : 0) + 1, until: Date.now() + 10 * 60_000 })
    }
    return errorResponse(e)
  }
}

/** Admins: reset another account's password: { userId, password }. */
export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const username = await resetPassword(await getViewer(), body?.userId, body?.password)
    return NextResponse.json({ ok: true, username })
  } catch (e) {
    return errorResponse(e)
  }
}
