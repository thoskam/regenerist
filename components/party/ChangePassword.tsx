'use client'

import { useState } from 'react'

const field = 'min-h-[42px] rounded-xl border border-line bg-raised px-3 text-sm text-ink'

export default function ChangePassword() {
  const [f, setF] = useState({ current: '', password: '', confirm: '' })
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null)
    if (f.password !== f.confirm) { setMsg({ ok: false, text: 'The new passwords don’t match.' }); return }
    setBusy(true)
    const res = await fetch('/api/auth/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current: f.current, password: f.password }) })
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setMsg({ ok: false, text: d.error || 'Could not change your password.' }); return }
    setF({ current: '', password: '', confirm: '' })
    setMsg({ ok: true, text: 'Password changed. Your other devices are signed out.' })
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4">
      <h2 className="m-0 text-base font-semibold">Change password</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2">
        <input aria-label="Current password" placeholder="Current password" type="password" autoComplete="current-password" required value={f.current} onChange={e => setF({ ...f, current: e.target.value.slice(0, 200) })} className={field} />
        <input aria-label="New password" placeholder="New password (8+)" type="password" autoComplete="new-password" required minLength={8} value={f.password} onChange={e => setF({ ...f, password: e.target.value.slice(0, 200) })} className={field} />
        <input aria-label="Confirm new password" placeholder="Confirm new password" type="password" autoComplete="new-password" required minLength={8} value={f.confirm} onChange={e => setF({ ...f, confirm: e.target.value.slice(0, 200) })} className={field} />
      </div>
      <button type="submit" disabled={busy} className="self-start min-h-[42px] rounded-xl bg-accent px-4 font-semibold text-on-accent disabled:opacity-60">{busy ? 'Saving…' : 'Change password'}</button>
      {msg && <p role="status" className={msg.ok ? 'm-0 text-good' : 'm-0 text-bad'}>{msg.text}</p>}
    </form>
  )
}
