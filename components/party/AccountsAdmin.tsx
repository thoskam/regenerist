'use client'

import { useEffect, useState } from 'react'

interface U { id: string; username: string; displayName: string; isAdmin: boolean }
const field = 'min-h-[42px] rounded-xl border border-line bg-raised px-3 text-sm text-ink'

export default function AccountsAdmin({ selfId }: { selfId: string }) {
  const [users, setUsers] = useState<U[]>([])
  const [f, setF] = useState({ username: '', displayName: '', password: '' })
  const [msg, setMsg] = useState<string | null>(null)
  const load = () => fetch('/api/auth/accounts').then(r => r.json()).then(d => setUsers(d.users ?? []))
  useEffect(() => { load() }, [])
  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null)
    const res = await fetch('/api/auth/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setMsg(d.error || 'Could not add account.'); return }
    setMsg(`Added ${f.username}. Share the username and password with them.`); setF({ username: '', displayName: '', password: '' }); load()
  }
  const reset = async (u: U) => {
    const password = window.prompt(`New password for ${u.displayName} (@${u.username}), at least 8 characters. They'll be signed out everywhere.`)
    if (!password) return
    setMsg(null)
    const res = await fetch('/api/auth/password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: u.id, password }) })
    const d = await res.json().catch(() => ({}))
    setMsg(res.ok ? `Password reset for ${u.username}. Share the new one with them.` : d.error || 'Could not reset the password.')
  }
  return (
    <div className="flex flex-col gap-4">
      <h2 className="m-0 text-base font-semibold">Accounts</h2>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {users.map(u => (
          <li key={u.id} className="flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2">
            <span className="min-w-0 flex-1"><strong>{u.displayName}</strong> <span className="text-muted">@{u.username}{u.isAdmin ? ' · admin' : ''}</span></span>
            {u.id !== selfId && <button type="button" onClick={() => reset(u)} className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold hover:border-accent">Reset password</button>}
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4">
        <h2 className="m-0 text-base font-semibold">Add a player</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2">
          <input aria-label="Username" placeholder="Username" required value={f.username} onChange={e => setF({ ...f, username: e.target.value.slice(0, 32) })} className={field} />
          <input aria-label="Display name" placeholder="Display name" value={f.displayName} onChange={e => setF({ ...f, displayName: e.target.value.slice(0, 40) })} className={field} />
          <input aria-label="Temporary password" placeholder="Temporary password (8+)" type="password" required minLength={8} value={f.password} onChange={e => setF({ ...f, password: e.target.value.slice(0, 200) })} className={field} />
        </div>
        <button type="submit" className="self-start min-h-[42px] rounded-xl bg-accent px-4 font-semibold text-on-accent">Add account</button>
        {msg && <p role="status" className="m-0 text-muted">{msg}</p>}
      </form>
    </div>
  )
}
