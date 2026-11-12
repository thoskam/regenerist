'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface U { id: string; username: string; displayName: string; isAdmin: boolean; characters?: number }
const field = 'min-h-[42px] rounded-xl border border-line bg-raised px-3 text-sm text-ink'

export default function AccountsAdmin({ selfId }: { selfId: string }) {
  const [users, setUsers] = useState<U[]>([])
  const [f, setF] = useState({ username: '', displayName: '', password: '' })
  const [msg, setMsg] = useState<string | null>(null)
  const [edit, setEdit] = useState<{ id: string; username: string; displayName: string } | null>(null)
  const router = useRouter()
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
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!edit) return
    setMsg(null)
    const res = await fetch(`/api/auth/accounts/${edit.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: edit.username, displayName: edit.displayName }) })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setMsg(d.error || 'Could not save the account.'); return }
    setMsg(`Saved. They now sign in as ${d.user.username}.`); setEdit(null); load()
    if (edit.id === selfId) router.refresh()
  }
  const remove = async (u: U) => {
    const n = u.characters ?? 0
    const chars = n ? ` Their ${n === 1 ? 'character' : `${n} characters`} and any parties they DM will move to you.` : ''
    if (!window.confirm(`Delete ${u.displayName} (@${u.username})? They'll be signed out and can't sign in again.${chars} This can't be undone.`)) return
    setMsg(null)
    const res = await fetch(`/api/auth/accounts/${u.id}`, { method: 'DELETE' })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setMsg(d.error || 'Could not delete the account.'); return }
    setMsg(`Deleted ${d.username}.${d.characters ? ` ${d.characters === 1 ? 'Their character is' : `${d.characters} characters are`} now yours.` : ''}`); load()
  }
  const btn = 'rounded-lg border border-line px-2.5 py-1 text-xs font-semibold hover:border-accent'
  return (
    <div className="flex flex-col gap-4">
      <h2 className="m-0 text-base font-semibold">Accounts</h2>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {users.map(u => (
          <li key={u.id} className="rounded-xl border border-line bg-panel px-3 py-2">
            {edit?.id === u.id ? (
              <form onSubmit={save} className="flex flex-wrap items-center gap-2">
                <input aria-label="Username" required value={edit.username} onChange={e => setEdit({ ...edit, username: e.target.value.slice(0, 32) })} className={`${field} min-w-0 flex-1 basis-36`} />
                <input aria-label="Display name" required value={edit.displayName} onChange={e => setEdit({ ...edit, displayName: e.target.value.slice(0, 40) })} className={`${field} min-w-0 flex-1 basis-36`} />
                <button type="submit" className="min-h-[42px] rounded-xl bg-accent px-3 text-sm font-semibold text-on-accent">Save</button>
                <button type="button" onClick={() => setEdit(null)} className="min-h-[42px] rounded-xl border border-line px-3 text-sm font-semibold">Cancel</button>
              </form>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1"><strong>{u.displayName}</strong> <span className="text-muted">@{u.username}{u.isAdmin ? ' · admin' : ''}{u.characters ? ` · ${u.characters} character${u.characters === 1 ? '' : 's'}` : ''}</span></span>
                <button type="button" onClick={() => { setMsg(null); setEdit({ id: u.id, username: u.username, displayName: u.displayName }) }} className={btn}>Edit</button>
                {u.id !== selfId && <button type="button" onClick={() => reset(u)} className={btn}>Reset password</button>}
                {u.id !== selfId && <button type="button" onClick={() => remove(u)} className={`${btn} text-bad hover:border-bad`}>Delete</button>}
              </div>
            )}
          </li>
        ))}
      </ul>
      {msg && <p role="status" className="m-0 text-muted">{msg}</p>}
      <form onSubmit={add} className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4">
        <h2 className="m-0 text-base font-semibold">Add a player</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2">
          <input aria-label="Username" placeholder="Username" required value={f.username} onChange={e => setF({ ...f, username: e.target.value.slice(0, 32) })} className={field} />
          <input aria-label="Display name" placeholder="Display name" value={f.displayName} onChange={e => setF({ ...f, displayName: e.target.value.slice(0, 40) })} className={field} />
          <input aria-label="Temporary password" placeholder="Temporary password (8+)" type="password" required minLength={8} value={f.password} onChange={e => setF({ ...f, password: e.target.value.slice(0, 200) })} className={field} />
        </div>
        <button type="submit" className="self-start min-h-[42px] rounded-xl bg-accent px-4 font-semibold text-on-accent">Add account</button>
      </form>
    </div>
  )
}
