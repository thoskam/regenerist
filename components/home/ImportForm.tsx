'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ImportForm() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/sheets/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Import failed.')
      router.push(`/c/${data.slug}`)
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4 sm:p-5">
      <label htmlFor="ddb-url" className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Import from D&amp;D Beyond</label>
      <div className="flex flex-wrap gap-2">
        <input id="ddb-url" value={url} onChange={e => setUrl(e.target.value)} required placeholder="https://www.dndbeyond.com/characters/12345678"
          className="min-h-[44px] min-w-0 flex-[1_1_320px] rounded-xl border border-line bg-raised px-3 text-sm text-ink placeholder:text-muted" />
        <button type="submit" disabled={busy} className="min-h-[44px] rounded-xl bg-accent px-5 text-sm font-semibold text-on-accent disabled:opacity-60">{busy ? 'Importing…' : 'Import'}</button>
      </div>
      <p className="m-0 text-xs text-muted">The character’s privacy must be set to Public on D&amp;D Beyond. Importing again later re-syncs the build and keeps your HP and used resources.</p>
      {error && <p role="alert" className="m-0 text-[13px] text-bad">{error}</p>}
    </form>
  )
}
