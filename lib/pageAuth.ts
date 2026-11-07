import { redirect } from 'next/navigation'
import { getViewer, type Viewer } from './auth'

/** Server pages: send signed-out visitors to /login when accounts are on. */
export async function requirePageViewer(next: string): Promise<Viewer> {
  const v = await getViewer()
  if (v.authEnabled && !v.user) redirect(`/login?next=${encodeURIComponent(next)}`)
  return v
}
