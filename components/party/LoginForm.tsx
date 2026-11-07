'use client'

import { useState } from 'react'

const field = 'min-h-[44px] rounded-xl border border-line bg-raised px-3 text-sm text-ink'

export default function LoginForm({ firstAccount, next }: { firstAccount: boolean; next: string }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null)
    const res = await fetch(firstAccount ? '/api/auth/accounts' : '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password, displayName }) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(data.error || 'Could not sign in.'); return }
    window.location.href = next
  }
  return (
    <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-line bg-panel p-6">
      <div>
        <h1 className="m-0 font-display text-3xl font-semibold">{firstAccount ? 'Turn on accounts' : 'Sign in'}</h1>
        <p className="m-0 mt-1 text-muted">{firstAccount ? 'This first account becomes the admin and owns every existing character. After this, everyone signs in.' : 'Welcome back.'}</p>
      </div>
      {firstAccount && <label className="flex flex-col gap-1.5 font-semibold">Display name<input value={displayName} onChange={e => setDisplayName(e.target.value.slice(0, 40))} className={field} /></label>}
      <label className="flex flex-col gap-1.5 font-semibold">Username<input autoComplete="username" required value={username} onChange={e => setUsername(e.target.value.slice(0, 32))} className={field} /></label>
      <label className="flex flex-col gap-1.5 font-semibold">Password<input type="password" autoComplete={firstAccount ? 'new-password' : 'current-password'} required minLength={firstAccount ? 8 : undefined} value={password} onChange={e => setPassword(e.target.value.slice(0, 200))} className={field} /></label>
      {error && <p role="alert" className="m-0 text-bad">{error}</p>}
      <button type="submit" disabled={busy} className="min-h-[44px] rounded-xl bg-accent font-semibold text-on-accent disabled:opacity-60">{busy ? 'Working…' : firstAccount ? 'Create admin account' : 'Sign in'}</button>
    </form>
  )
}
