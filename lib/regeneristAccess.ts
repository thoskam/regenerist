// Regenerist (regeneration, past lives, quirks, the legacy /regenerist app) is private to the accounts
// named in REGENERIST_USERS (comma-separated usernames; default "tom"). Everyone else never sees it:
// its pages and APIs 404, and `regenerist` is stripped from character documents sent to them.
import { NextResponse } from 'next/server'
import { notFound } from 'next/navigation'
import { getViewer, type Viewer } from './auth'

const allowed = () => (process.env.REGENERIST_USERS ?? 'tom').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

export function canUseRegenerist(v: Viewer): boolean {
  if (!v.authEnabled) return true // open single-user mode: it's your own install
  return !!v.user && allowed().includes(v.user.username)
}

/** Legacy Regenerist API routes: 404 for everyone not allowed (and 401 when signed out). */
export async function regeneristGuard(): Promise<NextResponse | null> {
  const v = await getViewer()
  if (v.authEnabled && !v.user) return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  return canUseRegenerist(v) ? null : NextResponse.json({ error: 'Not found.' }, { status: 404 })
}

/** Server pages and layouts: 404 unless allowed. */
export async function requireRegeneristPage(): Promise<void> {
  if (!canUseRegenerist(await getViewer())) notFound()
}

/** Remove Regenerist data from a character doc (or a response holding one under `doc`) for viewers who can't see it. */
export function hideRegenerist<T>(value: T, v: Viewer): T {
  if (canUseRegenerist(v) || !value || typeof value !== 'object') return value
  const strip = (d: unknown) => {
    if (!d || typeof d !== 'object' || !('regenerist' in d)) return d
    const { regenerist: _omit, ...rest } = d as Record<string, unknown>
    return rest
  }
  const out = strip(value) as Record<string, unknown>
  return ('doc' in out ? { ...out, doc: strip(out.doc) } : out) as T
}
