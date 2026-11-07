import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requirePageViewer } from '@/lib/pageAuth'
import AccountsAdmin from '@/components/party/AccountsAdmin'
import ChangePassword from '@/components/party/ChangePassword'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const v = await requirePageViewer('/account')
  if (!v.authEnabled) redirect('/login')
  if (!v.user) redirect('/login?next=%2Faccount')
  return (
    <main className="v2 min-h-screen font-ui text-sm" data-theme="ember">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8">
        <Link href="/" className="text-xs text-muted underline">All characters</Link>
        <h1 className="m-0 font-display text-3xl font-semibold">Account</h1>
        <p className="m-0 text-muted">Signed in as <strong className="text-ink">{v.user.displayName}</strong> (@{v.user.username}){v.user.isAdmin ? ' · admin' : ''}</p>
        <ChangePassword />
        {v.user.isAdmin && <AccountsAdmin selfId={v.user.id} />}
      </div>
    </main>
  )
}
