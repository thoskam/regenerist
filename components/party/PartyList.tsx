'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const field = 'min-h-[44px] min-w-0 flex-1 rounded-xl border border-line bg-raised px-3 text-sm text-ink'

export default function PartyList({ campaigns, canJoin }: { campaigns: Array<{ id: string; name: string }>; canJoin: boolean }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const post = async (url: string, body: unknown) => {
    setError(null)
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setError(d.error || 'Something went wrong.'); return }
    router.push(`/party/${d.campaign.id}`)
  }
  return (
    <div className="flex flex-col gap-4">
      {campaigns.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {campaigns.map(c => <li key={c.id}><Link href={`/party/${c.id}`} className="flex rounded-2xl border border-line bg-panel px-4 py-3 font-display text-lg font-semibold hover:border-accent">{c.name}</Link></li>)}
        </ul>
      )}
      <form onSubmit={e => { e.preventDefault(); post('/api/campaigns', { name }) }} className="flex flex-wrap gap-2 rounded-2xl border border-line bg-panel p-4">
        <label htmlFor="party-name" className="w-full font-semibold">Start a party (you’ll be the DM)</label>
        <input id="party-name" required value={name} onChange={e => setName(e.target.value.slice(0, 60))} placeholder="Curse of the Crimson Tide" className={field} />
        <button type="submit" className="min-h-[44px] rounded-xl bg-accent px-4 font-semibold text-on-accent">Create</button>
      </form>
      {canJoin && (
        <form onSubmit={e => { e.preventDefault(); post('/api/campaigns/join', { code }) }} className="flex flex-wrap gap-2 rounded-2xl border border-line bg-panel p-4">
          <label htmlFor="party-code" className="w-full font-semibold">Join with an invite code</label>
          <input id="party-code" required value={code} onChange={e => setCode(e.target.value.toUpperCase().slice(0, 12))} placeholder="ABCD2345" className={field} />
          <button type="submit" className="min-h-[44px] rounded-xl border border-accent px-4 font-semibold">Join</button>
        </form>
      )}
      {error && <p role="alert" className="m-0 text-bad">{error}</p>}
    </div>
  )
}
