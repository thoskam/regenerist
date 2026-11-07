'use client'

import Link from 'next/link'

export default function AccountMenu({ name, isAdmin, authEnabled }: { name: string | null; isAdmin: boolean; authEnabled: boolean }) {
  const signOut = async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login' }
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px]">
      <Link href="/party" className="rounded-xl border border-line bg-panel px-3 py-2 font-semibold">Parties</Link>
      {authEnabled ? (
        <>
          <Link href="/account" className="rounded-xl border border-line bg-panel px-3 py-2 font-semibold" title={isAdmin ? 'Your password and player accounts' : 'Change your password'}>{isAdmin ? 'Accounts' : 'Account'}</Link>
          <span className="text-muted">{name}</span>
          <button type="button" onClick={signOut} className="rounded-xl border border-line bg-panel px-3 py-2 font-semibold">Sign out</button>
        </>
      ) : <Link href="/login" className="rounded-xl border border-line bg-panel px-3 py-2 font-semibold" title="Optional: add accounts for your group">Set up accounts</Link>}
    </div>
  )
}
