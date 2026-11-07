import { NextResponse } from 'next/server'
import { login } from '@/lib/auth'
import { errorResponse } from '../../sheets/errors'

export const dynamic = 'force-dynamic'

// Simple in-memory throttle: 10 failed attempts per username+address per 10 minutes.
const attempts = new Map<string, { n: number; until: number }>()

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const key = `${String(body?.username ?? '').toLowerCase()}|${req.headers.get('x-forwarded-for') ?? 'local'}`
  const a = attempts.get(key)
  if (a && a.n >= 10 && a.until > Date.now()) return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 })
  try {
    await login(body?.username, body?.password)
    attempts.delete(key)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const cur = attempts.get(key)
    attempts.set(key, { n: (cur && cur.until > Date.now() ? cur.n : 0) + 1, until: Date.now() + 10 * 60_000 })
    return errorResponse(e)
  }
}
