'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cx } from '@/components/sheet/ui'

type Ab = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
const ABILITIES: Ab[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
interface Char {
  slug: string; name: string; classLabel: string; species: string; level: number; hasAvatar: boolean; theme: string; playerName: string | null
  hp: { current: number; max: number }; tempHp: number; ac: number; initiative: number; speed: number; passivePerception: number; pb: number
  abilities: Record<Ab, { mod: number; save: number; saveProf: boolean }>
  spellDc: number | null; spellAttack: number | null
  slots: Array<{ level: number; max: number; used: number; pact?: boolean }>
  conditions: string[]; concentration: string | null; exhaustion: number; deathSaves: { successes: number; failures: number } | null
}
interface Roll { id: string; characterName: string; characterSlug: string | null; playerName: string | null; label: string; total: number; detail: string; tag: string | null; createdAt: string }
interface Data {
  campaign: { id: string; name: string; inviteCode?: string }; role: 'dm' | 'player'; members: Array<{ name: string; role: string }>
  characters: Char[]; available: Array<{ slug: string; name: string; classLabel: string; level: number }>
}

const sign = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`)
const ord = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`

/**
 * Roll detail like "d20 [14, 7] + 5 · Lucky": dice results in monospace so the breakdown is easy to scan.
 * With advantage or disadvantage the dropped d20 is struck through.
 */
function Detail({ text, tag }: { text: string; tag: string | null }) {
  const parts = text.split(/(\[[^\]]*\])/)
  const keep = tag === 'ADVANTAGE' ? Math.max : tag === 'DISADVANTAGE' ? Math.min : null
  return <>{parts.map((p, i) => {
    if (!p.startsWith('[')) return <span key={i}>{p}</span>
    const nums = p.slice(1, -1).split(',').map(x => x.trim())
    const d20 = i > 0 && parts[i - 1].endsWith('d20 ')
    if (!keep || !d20 || nums.length < 2) return <span key={i} className="rounded bg-panel px-1 font-mono text-ink">{nums.join(', ')}</span>
    const kept = keep(...nums.map(Number)); let used = false
    return (
      <span key={i} className="rounded bg-panel px-1 font-mono text-ink">
        {nums.map((n, j) => { const k = !used && Number(n) === kept; if (k) used = true; return <span key={j}>{j > 0 && ', '}<span className={k ? 'font-bold' : 'text-muted line-through'}>{n}</span></span> })}
      </span>
    )
  })}</>
}

function Stat({ label, value, title }: { label: string; value: string | number; title?: string }) {
  return <span title={title} className="flex flex-col items-center rounded-lg bg-raised px-2 py-1 leading-tight"><span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</span><strong className="text-sm">{value}</strong></span>
}

function CharacterCard({ c }: { c: Char }) {
  const pct = Math.round((c.hp.current / Math.max(1, c.hp.max)) * 100)
  const down = c.hp.current === 0
  return (
    <Link href={`/c/${c.slug}`} data-theme={c.theme} className="v2 flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4 hover:border-accent">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-accent bg-accent-soft font-display font-semibold text-accent">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {c.hasAvatar ? <img src={`/api/sheets/${c.slug}/avatar`} alt="" className="h-full w-full object-cover" /> : c.name.slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-lg font-semibold">{c.name}</span>
          <span className="block truncate text-xs text-muted" title={`Level ${c.level} ${c.species} · ${c.classLabel}`}>Level {c.level} {c.species} · {c.classLabel}</span>
          {c.playerName && <span className="block truncate text-xs text-muted">Played by {c.playerName}</span>}
        </span>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className={cx('text-2xl font-semibold', down && 'text-bad')}>{c.hp.current}</span>
        <span className="text-muted">/ {c.hp.max} HP</span>
        {c.tempHp > 0 && <span className="rounded-full border border-good px-2 py-0.5 text-xs text-good">+{c.tempHp} temp</span>}
      </div>
      <div className="-mt-1.5 h-1.5 overflow-hidden rounded bg-raised"><div className="h-1.5" style={{ width: `${pct}%`, background: pct > 50 ? 'var(--good)' : pct > 25 ? 'var(--accent)' : 'var(--bad)' }} /></div>
      {c.deathSaves && (
        <div className="flex items-center gap-2 text-xs"><strong className="text-bad">Down</strong>
          <span>Saves {'●'.repeat(c.deathSaves.successes)}{'○'.repeat(Math.max(0, 3 - c.deathSaves.successes))}</span>
          <span className="text-bad">Fails {'●'.repeat(c.deathSaves.failures)}{'○'.repeat(Math.max(0, 3 - c.deathSaves.failures))}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        <Stat label="AC" value={c.ac} />
        <Stat label="Init" value={sign(c.initiative)} />
        <Stat label="Speed" value={`${c.speed} ft`} />
        <Stat label="PP" value={c.passivePerception} title="Passive Perception" />
        {c.spellDc != null && <Stat label="Spell DC" value={c.spellDc} title={c.spellAttack != null ? `Spell attack ${sign(c.spellAttack)}` : undefined} />}
      </div>

      <div className="grid grid-cols-6 gap-1 text-center" aria-label="Ability modifiers and saving throws">
        {ABILITIES.map(k => {
          const a = c.abilities[k]
          return (
            <span key={k} className="rounded-lg bg-raised px-0.5 py-1 leading-tight" title={`${k.toUpperCase()} check ${sign(a.mod)}, save ${sign(a.save)}${a.saveProf ? ' (proficient)' : ''}`}>
              <span className="block text-[10px] font-semibold uppercase text-muted">{k}</span>
              <strong className="block text-sm">{sign(a.mod)}</strong>
              <span className={cx('block text-[10px]', a.saveProf ? 'font-semibold text-accent' : 'text-muted')}>save {sign(a.save)}</span>
            </span>
          )
        })}
      </div>

      {c.slots.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="Spell slots remaining">
          {c.slots.map(s => (
            <span key={`${s.pact ? 'p' : ''}${s.level}`} className="whitespace-nowrap"><span className="text-muted">{s.pact ? `Pact ${ord(s.level)}` : ord(s.level)}</span> <span className="tracking-[0.1em] text-accent">{'●'.repeat(Math.max(0, s.max - s.used))}<span className="text-muted">{'○'.repeat(Math.min(s.max, s.used))}</span></span></span>
          ))}
        </div>
      )}

      {(c.conditions.length > 0 || c.concentration || c.exhaustion > 0) && (
        <div className="flex flex-wrap gap-1 text-xs">
          {c.concentration && <span className="rounded-full border border-good px-2 py-0.5">Concentrating: {c.concentration}</span>}
          {c.conditions.map(x => <span key={x} className="rounded-full border border-accent px-2 py-0.5">{x}</span>)}
          {c.exhaustion > 0 && <span className="rounded-full border border-bad px-2 py-0.5 text-bad">Exhaustion {c.exhaustion}</span>}
        </div>
      )}
    </Link>
  )
}

function RollRow({ r, fresh }: { r: Roll; fresh: boolean }) {
  const noTotal = r.tag === 'REST' || r.tag === 'CAST'
  const tagClass = r.tag === 'NAT 20' || r.tag === 'CRIT' ? 'border-good text-good' : r.tag === 'NAT 1' ? 'border-bad text-bad' : 'border-line text-muted'
  return (
    <div className={cx('rounded-xl bg-raised px-3 py-2', fresh && 'pop')}>
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-[13px]"><strong>{r.characterName}</strong>{r.playerName && <span className="text-muted"> · {r.playerName}</span>}</span>
          <span className="block text-[13px]">{r.label}</span>
        </span>
        {!noTotal && <strong className={cx('text-2xl leading-none', r.tag === 'NAT 20' || r.tag === 'CRIT' ? 'text-good' : r.tag === 'NAT 1' ? 'text-bad' : 'text-accent')}>{r.total}</strong>}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        <span><Detail text={r.detail} tag={r.tag} /></span>
        {r.tag && r.tag !== 'ROLL' && <span className={cx('rounded-full border px-1.5 py-px text-[10px] font-semibold tracking-wide', tagClass)}>{r.tag}</span>}
        <span className="ml-auto">{new Date(r.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
      </div>
    </div>
  )
}

function AddCharacter({ id, available, onAdded }: { id: string; available: Data['available']; onAdded: () => void }) {
  const [slug, setSlug] = useState('')
  const [error, setError] = useState<string | null>(null)
  if (available.length === 0) return null
  const add = async (e: React.FormEvent) => {
    e.preventDefault(); if (!slug) return
    setError(null)
    const res = await fetch(`/api/sheets/${slug}/campaign`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: id }) })
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error || 'Could not add that character.'); return }
    setSlug(''); onAdded()
  }
  return (
    <form onSubmit={add} className="flex flex-wrap items-center gap-2">
      <label htmlFor="add-char" className="sr-only">Add one of your characters</label>
      <select id="add-char" value={slug} onChange={e => setSlug(e.target.value)} className="min-h-[42px] rounded-xl border border-line bg-raised px-2 text-[13px] text-ink">
        <option value="">Add one of your characters…</option>
        {available.map(c => <option key={c.slug} value={c.slug}>{c.name} (level {c.level} {c.classLabel})</option>)}
      </select>
      <button type="submit" disabled={!slug} className="min-h-[42px] rounded-xl bg-accent px-4 text-[13px] font-semibold text-on-accent disabled:opacity-50">Add to party</button>
      {error && <span role="alert" className="text-xs text-bad">{error}</span>}
    </form>
  )
}

export default function PartyView({ id }: { id: string }) {
  const [data, setData] = useState<Data | null>(null)
  const [rolls, setRolls] = useState<Roll[]>([])
  const [live, setLive] = useState(false)
  const [filter, setFilter] = useState('')
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set())
  const feedEnd = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const r = await fetch(`/api/campaigns/${id}`)
    if (r.ok) setData(await r.json())
  }, [id])

  useEffect(() => {
    let stop = false
    load()
    const t = setInterval(() => { if (!stop) load() }, 5000)
    fetch(`/api/campaigns/${id}/rolls`).then(r => r.json()).then(d => !stop && setRolls(d.rolls ?? []))
    const es = new EventSource(`/api/campaigns/${id}/feed`)
    es.addEventListener('ready', () => setLive(true))
    es.addEventListener('rolls', e => {
      const add = JSON.parse((e as MessageEvent).data) as Roll[]
      setRolls(r => [...r, ...add.filter(x => !r.some(y => y.id === x.id))].slice(-200))
      setFreshIds(new Set(add.map(x => x.id)))
      load() // a roll usually means HP or slots changed
    })
    es.onerror = () => setLive(false)
    return () => { stop = true; clearInterval(t); es.close() }
  }, [id, load])

  const shown = filter ? rolls.filter(r => r.characterSlug === filter) : rolls
  useEffect(() => { feedEnd.current?.scrollIntoView({ block: 'nearest' }) }, [shown.length])

  if (!data) return <main className="v2 min-h-screen p-6 font-ui text-muted" data-theme="ember">Loading party…</main>
  return (
    <main className="v2 v2-scene min-h-screen font-ui text-sm" data-theme="ember">
      <div className="mx-auto flex max-w-[1392px] flex-col gap-4 px-3 py-6 sm:px-6">
        <header className="glass flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-line p-4">
          <div className="min-w-0">
            <Link href="/party" className="text-xs text-muted underline">All parties</Link>
            <h1 className="m-0 font-display text-4xl font-semibold">{data.campaign.name}</h1>
            <p className="m-0 text-muted">{data.members.map(m => `${m.name}${m.role === 'dm' ? ' (DM)' : ''}`).join(' · ') || 'No members yet'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <AddCharacter id={id} available={data.available} onAdded={load} />
            {data.campaign.inviteCode && <div className="rounded-xl border border-accent bg-accent-soft px-4 py-2 text-[13px]">Invite code <strong className="font-mono text-base tracking-widest">{data.campaign.inviteCode}</strong></div>}
          </div>
        </header>
        <div className="flex flex-wrap items-start gap-4">
          <section aria-label="Party" className="grid min-w-0 flex-[3_1_600px] grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-3">
            {data.characters.length === 0 && <p className="m-0 rounded-2xl border border-dashed border-line bg-panel p-6 text-muted">No characters yet. Add one of yours above, or choose this party from a sheet’s menu.</p>}
            {data.characters.map(c => <CharacterCard key={c.slug} c={c} />)}
          </section>
          <aside aria-label="Party rolls" className="flex min-w-0 flex-[1_1_320px] flex-col gap-2 rounded-2xl border border-line bg-panel p-4 lg:sticky lg:top-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Roll feed</h2>
              <span className={cx('text-xs', live ? 'text-good' : 'text-muted')}>{live ? '● live' : 'connecting…'}</span>
            </div>
            {data.characters.length > 1 && (
              <select aria-label="Show rolls from" value={filter} onChange={e => setFilter(e.target.value)} className="min-h-[36px] rounded-lg border border-line bg-raised px-2 text-[13px] text-ink">
                <option value="">Everyone</option>
                {data.characters.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            )}
            <div className="flex max-h-[75vh] flex-col gap-1.5 overflow-y-auto" aria-live="polite">
              {shown.length === 0 && <p className="m-0 text-muted">Every roll made on a party member’s sheet shows up here, with the dice and modifiers.</p>}
              {shown.map(r => <RollRow key={r.id} r={r} fresh={freshIds.has(r.id)} />)}
              <div ref={feedEnd} />
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
