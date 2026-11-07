// Legacy Regenerist API routes: when accounts are on, require a signed-in user.
import { NextResponse } from 'next/server'
import { getViewer } from './auth'

export async function legacyGuard(): Promise<NextResponse | null> {
  const v = await getViewer()
  return v.authEnabled && !v.user ? NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 }) : null
}
