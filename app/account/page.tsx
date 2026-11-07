import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requirePageViewer } from '@/lib/pageAuth'
import AccountsAdmin from '@/components/party/AccountsAdmin'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const v = await requirePageViewer('/account')
  if (!v.authEnabled) redirect('/login')
  if (!v.user?.isAdmin) redirect('/')
  return (
    <main className="v2 min-h-screen font-ui text-sm" data-theme="ember">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8">
        <Link href="/" className="text-xs text-muted underline">All characters</Link>
        <h1 className="m-0 font-display text-3xl font-semibold">Accounts</h1>
        <AccountsAdmin />
      </div>
    </main>
  )
}
