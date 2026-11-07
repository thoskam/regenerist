'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { cx } from '@/components/sheet/ui'

interface Char { slug: string; name: string; classLabel: string; species: string; hasAvatar: boolean; hp: { current: number; max: number }; ac: number; passivePerception: number; conditions: string[]; concentration: string | null; exhaustion: number; theme: string }
interface Roll { id: string; characterName: string; label: string; total: number; detail: string; tag: string | null; createdAt: string }
interface Data { campaign: { id: string; name: string; inviteCode?: string }; role: 'dm' | 'player'; members: Array<{ name: string; role: string }>; characters: Char[] }

export default function PartyView({ id }: { id: string }) {
  const [data, setData] = useState<Data | null>(null)
  const [rolls, setRolls] = useState<Roll[]>([])
  const [live, setLive] = useState(false)
  const feedEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let stop = false
    const load = async () => {
      const r = await fetch(`/api/campaigns/${id}`)
      if (r.ok && !stop) setData(await r.json())
    }
    load()
    const t = setInterval(load, 5000)
    fetch(`/api/campaigns/${id}/rolls`).then(r => r.json()).then(d => !stop && setRolls(d.rolls ?? []))
    const es = new EventSource(`/api/campaigns/${id}/feed`)
    es.addEventListener('ready', () => setLive(true))
    es.addEventListener('rolls', e => { const add = JSON.parse((e as MessageEvent).data) as Roll[]; setRolls(r => [...r, ...add.filter(x => !r.some(y => y.id === x.id))].slice(-100)) })
    es.onerror = () => setLive(false)
    return () => { stop = true; clearInterval(t); es.close() }
  }, [id])
  useEffect(() => { feedEnd.current?.scrollIntoView({ block: 'nearest' }) }, [rolls.length])

  if (!data) return <main className="v2 min-h-screen p-6 font-ui text-muted" data-theme="ember">Loading party…</main>
  return (
    <main className="v2 v2-scene min-h-screen font-ui text-sm" data-theme="ember">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-3 py-6 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link href="/party" className="text-xs text-muted underline">All parties</Link>
            <h1 className="m-0 font-display text-4xl font-semibold">{data.campaign.name}</h1>
            <p className="m-0 text-muted">{data.members.map(m => `${m.name}${m.role === 'dm' ? ' (DM)' : ''}`).join(' · ') || 'No members yet'}</p>
          </div>
          {data.campaign.inviteCode && <div className="rounded-xl border border-accent bg-accent-soft px-4 py-2 text-[13px]">Invite code <strong className="font-mono text-base tracking-widest">{data.campaign.inviteCode}</strong></div>}
        </header>
        <div className="flex flex-wrap items-start gap-4">
          <section aria-label="Party" className="grid min-w-0 flex-[3_1_560px] grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
            {data.characters.length === 0 && <p className="m-0 rounded-2xl border border-dashed border-line p-6 text-muted">No characters yet. Open a sheet, then choose this party from its menu.</p>}
            {data.characters.map(c => {
              const pct = Math.round((c.hp.current / Math.max(1, c.hp.max)) * 100)
              return (
                <Link key={c.slug} href={`/c/${c.slug}`} data-theme={c.theme} className="v2 flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4 hover:border-accent">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-accent bg-accent-soft font-display font-semibold text-accent">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {c.hasAvatar ? <img src={`/api/sheets/${c.slug}/avatar`} alt="" className="h-full w-full object-cover" /> : c.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0"><span className="block truncate font-display text-lg font-semibold">{c.name}</span><span className="block truncate text-xs text-muted">{c.species} · {c.classLabel}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cx('text-xl font-semibold', c.hp.current === 0 && 'text-bad')}>{c.hp.current}</span><span className="text-muted">/ {c.hp.max} HP</span>
                    <span className="ml-auto rounded-lg bg-raised px-2 py-1 text-xs">AC <strong>{c.ac}</strong></span>
                    <span className="rounded-lg bg-raised px-2 py-1 text-xs">PP <strong>{c.passivePerception}</strong></span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded bg-raised"><div className="h-1.5" style={{ width: `${pct}%`, background: pct > 50 ? 'var(--good)' : pct > 25 ? 'var(--accent)' : 'var(--bad)' }} /></div>
                  {(c.conditions.length > 0 || c.concentration || c.exhaustion > 0) && (
                    <div className="flex flex-wrap gap-1 text-xs">
                      {c.concentration && <span className="rounded-full border border-good px-2 py-0.5">Concentrating: {c.concentration}</span>}
                      {c.conditions.map(x => <span key={x} className="rounded-full border border-accent px-2 py-0.5">{x}</span>)}
                      {c.exhaustion > 0 && <span className="rounded-full border border-bad px-2 py-0.5 text-bad">Exhaustion {c.exhaustion}</span>}
                    </div>
                  )}
                </Link>
              )
            })}
          </section>
          <aside aria-label="Party rolls" className="flex min-w-0 flex-[1_1_300px] flex-col gap-2 rounded-2xl border border-line bg-panel p-4 lg:sticky lg:top-4">
            <div className="flex items-center justify-between"><h2 className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Roll feed</h2><span className={cx('text-xs', live ? 'text-good' : 'text-muted')}>{live ? '● live' : 'connecting…'}</span></div>
            <div className="flex max-h-[70vh] flex-col gap-1.5 overflow-y-auto" aria-live="polite">
              {rolls.length === 0 && <p className="m-0 text-muted">Rolls from party members’ sheets appear here.</p>}
              {rolls.map(r => (
                <div key={r.id} className="rounded-xl bg-raised px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2"><span className="truncate text-[13px]"><strong>{r.characterName}</strong> · {r.label}</span>{r.tag !== 'REST' && r.tag !== 'CAST' && <strong className={cx('text-lg', r.tag === 'NAT 20' || r.tag === 'CRIT' ? 'text-good' : r.tag === 'NAT 1' ? 'text-bad' : 'text-accent')}>{r.total}</strong>}</div>
                  <div className="text-xs text-muted">{r.detail}{r.tag ? ` · ${r.tag}` : ''} · {new Date(r.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                </div>
              ))}
              <div ref={feedEnd} />
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
