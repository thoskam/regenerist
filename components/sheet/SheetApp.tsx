'use client'

import Link from 'next/link'
import { useRef, useState, type CSSProperties } from 'react'
import { ABILITY_NAMES, fmtMod } from '@/lib/sheet/compute'
import { applyDamage, applyHealing, longRest, setTempHp } from '@/lib/sheet/state'
import type { Ability, CharacterDoc, PlayState, ThemeName } from '@/lib/sheet/types'
import { ABILITIES } from '@/lib/sheet/types'
import { useSheet, type SheetApi } from './useSheet'
import { combineModes } from '@/lib/sheet/dice'
import { Card, DetailDrawer, Label, SectionTitle, Segmented, cx, type DetailContent } from './ui'
import { ActionsTab, FeaturesTab, LivesTab, NotesTab, SpellsTab } from './tabs'
import { InventoryTab } from './inventory'
import { RollTray } from './RollTray'
import { ConditionsCard, HitPointsCard, ShortRestDialog } from './vitals'

type Tab = 'abilities' | 'skills' | 'actions' | 'spells' | 'inventory' | 'features' | 'notes' | 'lives'
const TABS: Array<{ id: Tab; label: string; mobileOnly?: boolean }> = [
  { id: 'abilities', label: 'Abilities', mobileOnly: true },
  { id: 'skills', label: 'Skills', mobileOnly: true },
  { id: 'actions', label: 'Actions' },
  { id: 'spells', label: 'Spells' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'features', label: 'Features & Traits' },
  { id: 'notes', label: 'Notes' },
  { id: 'lives', label: 'Lives' },
]

export interface SheetProps {
  slug: string
  initial: { doc: CharacterDoc; state: PlayState; revision: number; hasAvatar: boolean; campaignId?: string | null }
  readOnly?: boolean
  campaigns?: Array<{ id: string; name: string }>
}

export default function SheetApp({ slug, initial, readOnly, campaigns = [] }: SheetProps) {
  const api = useSheet(slug, initial, { readOnly })
  const { doc, sheet } = api
  const [tab, setTab] = useState<Tab>('actions')
  const [detail, setDetail] = useState<DetailContent | null>(null)
  const style = doc.theme?.accent ? ({ '--accent': doc.theme.accent } as CSSProperties) : undefined

  return (
    <div className="v2 min-h-screen font-ui text-sm" data-theme={doc.theme?.name ?? 'ember'} style={style}>
      <div className="mx-auto flex max-w-[1392px] flex-col gap-4 px-3 pb-36 pt-3 sm:px-6 sm:pt-6">
        {readOnly && <div role="status" className="rounded-xl border border-line bg-panel px-4 py-2.5 text-[13px] text-muted">View only — this is another player’s character. You can roll, but changes aren’t saved.</div>}
        <Header api={api} slug={slug} hasAvatar={initial.hasAvatar} campaigns={campaigns} />
        <VitalsRow api={api} onDetail={setDetail} />

        <div className="flex flex-wrap items-start gap-4">
          <div className="hidden min-w-0 flex-[1_1_260px] flex-col gap-4 lg:flex">
            <AbilitiesColumn api={api} />
          </div>
          <div className="hidden min-w-0 flex-[1_1_290px] lg:flex">
            <SkillsCard api={api} />
          </div>
          <div className="flex min-w-0 flex-[3_1_560px] flex-col gap-4">
            <ConditionsCard api={api} />
            <Card className="flex flex-col">
              <TabBar tab={tab} setTab={setTab} showLives={!!doc.regenerist?.enabled} />
              <div className="flex flex-col gap-4 p-4">
                {tab === 'abilities' && <AbilitiesColumn api={api} flat />}
                {tab === 'skills' && <SkillsCard api={api} flat />}
                {tab === 'actions' && <ActionsTab api={api} onDetail={setDetail} />}
                {tab === 'spells' && <SpellsTab api={api} onDetail={setDetail} />}
                {tab === 'inventory' && <InventoryTab api={api} onDetail={setDetail} />}
                {tab === 'features' && <FeaturesTab api={api} onDetail={setDetail} />}
                {tab === 'notes' && <NotesTab api={api} />}
                {tab === 'lives' && <LivesTab api={api} />}
              </div>
            </Card>
          </div>
        </div>
      </div>
      <RollTray api={api} />
      <DetailDrawer detail={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

function TabBar({ tab, setTab, showLives }: { tab: Tab; setTab: (t: Tab) => void; showLives: boolean }) {
  return (
    <nav aria-label="Sheet sections" className="flex gap-1 overflow-x-auto border-b border-line px-3 pt-2">
      {TABS.filter(t => t.id !== 'lives' || showLives).map(t => (
        <button
          key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}
          className={cx('min-h-[44px] shrink-0 border-b-[3px] px-3 text-sm font-semibold', t.mobileOnly && 'lg:hidden', tab === t.id ? 'border-accent text-ink' : 'border-transparent text-muted')}
        >{t.label}</button>
      ))}
    </nav>
  )
}

function Header({ api, slug, hasAvatar, campaigns }: { api: SheetApi; slug: string; hasAvatar: boolean; campaigns: Array<{ id: string; name: string }> }) {
  const { doc, sheet, state, setState, mode, setMode, push, status } = api
  const [avatarVersion, setAvatarVersion] = useState(hasAvatar ? 1 : 0)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [menu, setMenu] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [regenPhase, setRegenPhase] = useState<'idle' | 'charging' | 'flash'>('idle')
  const doRegenerate = async () => {
    if (!window.confirm(`Regenerate ${doc.name}? This life ends: a new species, class, and level are rolled, and HP and resources reset.`)) return
    setRegenPhase('charging')
    const started = Date.now()
    const ok = await api.regenerate()
    await new Promise(r => setTimeout(r, Math.max(0, 1200 - (Date.now() - started))))
    setRegenPhase(ok ? 'flash' : 'idle')
    if (ok) setTimeout(() => setRegenPhase('idle'), 1100)
  }
  const fileRef = useRef<HTMLInputElement>(null)
  const [resting, setResting] = useState(false)
  const initials = doc.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const xp = sheet.xp
  const pct = xp.nextLevel ? Math.max(0, Math.min(100, ((xp.current - xp.levelStart) / (xp.nextLevel - xp.levelStart)) * 100)) : 100

  const upload = async (file: File) => {
    setAvatarError(null)
    if (file.size > 2 * 1024 * 1024) { setAvatarError('Use an image under 2 MB.'); return }
    const res = await fetch(`/api/sheets/${slug}/avatar`, { method: 'PUT', body: file })
    if (!res.ok) { setAvatarError((await res.json().catch(() => ({}))).error || 'Upload failed.'); return }
    setAvatarVersion(Date.now())
  }
  const removeAvatar = async () => {
    await fetch(`/api/sheets/${slug}/avatar`, { method: 'DELETE' })
    setAvatarVersion(0)
  }
  const restoreImport = async () => {
    if (!window.confirm('Go back to the D&D Beyond version from before you converted? Level-ups, build edits, and inventory changes made since then are lost.')) return
    const res = await fetch(`/api/sheets/${slug}/restore-import`, { method: 'POST' })
    if (res.ok) window.location.reload()
    else window.alert((await res.json().catch(() => ({}))).error || 'Could not restore.')
  }
  const resync = async () => {
    if (!doc.import) return
    setSyncing(true)
    const res = await fetch('/api/sheets/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: doc.import.url }) })
    setSyncing(false)
    if (res.ok) window.location.reload()
    else setAvatarError((await res.json().catch(() => ({}))).error || 'Sync failed.')
  }

  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-2xl border border-line bg-panel px-4 py-4 sm:px-5">
      <div className="flex min-w-0 flex-[1_1_380px] items-center gap-4">
        <div className="group relative shrink-0">
          <button
            type="button" disabled={api.readOnly} onClick={() => fileRef.current?.click()} aria-label={avatarVersion ? 'Change portrait' : 'Upload portrait'}
            className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-accent bg-accent-soft font-display text-[26px] font-semibold text-accent"
          >
            {avatarVersion ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/sheets/${slug}/avatar?v=${avatarVersion}`} alt="" className="h-full w-full object-cover" />
            ) : initials}
          </button>
          <span className="pointer-events-none absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-raised text-muted" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
          </span>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="m-0 font-display text-[26px] font-semibold leading-tight sm:text-[30px]">{doc.name}</h1>
          <div className="text-muted">{[doc.identity.species, sheet.classLabel, doc.identity.background].filter(Boolean).join(' · ')}</div>
          <div className="flex items-center gap-2.5 text-xs text-muted">
            <div className="h-1.5 w-32 overflow-hidden rounded bg-raised sm:w-40"><div className="h-1.5 bg-accent" style={{ width: `${pct}%` }} /></div>
            <span>{xp.current.toLocaleString()} XP{xp.nextLevel ? ` · ${(xp.nextLevel - xp.current).toLocaleString()} to level ${sheet.level + 1}` : ''}</span>
          </div>
          {avatarError && <div role="alert" className="text-xs text-bad">{avatarError}</div>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="rounded-full border border-line px-2.5 py-1.5 text-xs text-muted">Rules: {doc.rulesLabel}{doc.regenerist?.enabled ? ` · life ${doc.regenerist.lifeNumber}` : ''}</span>
        {doc.regenerist?.enabled && !api.readOnly && (
          <button type="button" onClick={doRegenerate} disabled={regenPhase !== 'idle'} className={cx('min-h-[44px] rounded-xl border border-accent bg-accent-soft px-4 text-[13px] font-semibold', regenPhase === 'charging' && 'regen-charging')}>
            {regenPhase === 'charging' ? 'Regenerating…' : 'Regenerate'}
          </button>
        )}
        {regenPhase === 'flash' && <div aria-hidden="true" className="regen-flash pointer-events-none fixed inset-0 z-50" />}
        <Segmented label="Roll mode" value={mode} onChange={setMode} options={[{ value: 'normal', label: 'Normal' }, { value: 'advantage', label: 'Advantage' }, { value: 'disadvantage', label: 'Disadvantage' }]} />
        <button type="button" onClick={() => setResting(true)} className="min-h-[44px] rounded-xl border border-line bg-raised px-4 text-[13px] font-semibold">Short rest</button>
        <button type="button" onClick={() => { setState(s => longRest(doc, s)); push({ label: 'Long rest', total: 0, detail: 'HP, spell slots, and limited uses restored.', tag: 'REST' }) }} className="min-h-[44px] rounded-xl border border-line bg-raised px-4 text-[13px] font-semibold">Long rest</button>
        <div className="relative">
          <button type="button" aria-expanded={menu} aria-label="Sheet menu" onClick={() => setMenu(m => !m)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-raised">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          {menu && (
            <div className="pop absolute right-0 top-12 z-30 flex w-64 flex-col gap-3 rounded-2xl border border-line bg-panel p-4 shadow-tray">
              <ThemePicker api={api} />
              {!api.readOnly && (
                <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Party
                  <select value={api.campaignId ?? ''} onChange={e => api.joinCampaign(e.target.value || null)} className="min-h-[40px] rounded-xl border border-line bg-raised px-2 text-[13px] normal-case tracking-normal text-ink">
                    <option value="">Not in a party</option>
                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {api.campaignId && <Link href={`/party/${api.campaignId}`} className="normal-case tracking-normal text-accent underline">Open party view</Link>}
                </label>
              )}
              {doc.build && !api.readOnly && (
                <label className="flex min-h-[40px] items-center gap-2 rounded-xl border border-line bg-raised px-3 text-[13px] font-semibold">
                  <input type="checkbox" checked={!!doc.regenerist?.enabled} onChange={e => api.setRegenerist(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
                  Regenerist mode
                </label>
              )}
              {doc.import && !api.readOnly && (
                <button type="button" disabled={syncing} onClick={resync} className="min-h-[40px] rounded-xl border border-line bg-raised px-3 text-left text-[13px] font-semibold disabled:opacity-60">
                  {syncing ? 'Syncing…' : 'Re-sync from D&D Beyond'}
                </button>
              )}
              {doc.import && !api.readOnly && <Link href={`/c/${slug}/build`} className="min-h-[40px] rounded-xl bg-accent px-3 py-2.5 text-[13px] font-semibold text-on-accent">Edit here instead of D&amp;D Beyond</Link>}
              {doc.convertedFrom && !api.readOnly && <button type="button" onClick={restoreImport} className="min-h-[40px] rounded-xl border border-line bg-raised px-3 text-left text-[13px] font-semibold">Restore D&amp;D Beyond version</button>}
              {doc.build && !api.readOnly && <Link href={`/c/${slug}/build?levelup=1`} className="min-h-[40px] rounded-xl bg-accent px-3 py-2.5 text-[13px] font-semibold text-on-accent">Level up</Link>}
              {doc.build && !api.readOnly && <Link href={`/c/${slug}/build`} className="min-h-[40px] rounded-xl border border-line bg-raised px-3 py-2.5 text-[13px] font-semibold">Edit build</Link>}
              {avatarVersion ? <button type="button" onClick={removeAvatar} className="min-h-[40px] rounded-xl border border-line bg-raised px-3 text-left text-[13px] font-semibold">Remove portrait</button> : null}
              <Link href="/" className="min-h-[40px] rounded-xl border border-line bg-raised px-3 py-2.5 text-[13px] font-semibold">All characters</Link>
              <div className="text-xs text-muted">{status === 'saved' ? 'All changes saved' : status === 'saving' ? 'Saving…' : status === 'conflict' ? 'Changed elsewhere — reload' : 'Not saved — retrying'}</div>
            </div>
          )}
        </div>
      </div>
      {(status === 'conflict' || status === 'error') && (
        <div role="alert" className="w-full rounded-xl border border-bad px-3 py-2 text-[13px] text-bad">
          {status === 'conflict' ? <>This character was changed in another window. <button type="button" className="underline" onClick={() => window.location.reload()}>Reload</button> to continue.</> : 'Couldn’t save your last change. Retrying…'}
        </div>
      )}
      <ShortRestDialog api={api} open={resting} onClose={() => setResting(false)} />
      <span className="sr-only" aria-live="polite">{status === 'saving' ? 'Saving' : ''}</span>
      {state.inspiration && <span className="sr-only">Heroic Inspiration available</span>}
    </header>
  )
}

const THEME_SWATCHES: Array<{ name: ThemeName; label: string; bg: string; accent: string }> = [
  { name: 'ember', label: 'Ember', bg: '#13110e', accent: '#f0913f' },
  { name: 'arcane', label: 'Arcane', bg: '#0d1120', accent: '#a3b5ff' },
  { name: 'parchment', label: 'Parchment', bg: '#ebe3d2', accent: '#9e2b25' },
]
const ACCENTS = ['#f0913f', '#e05d5d', '#d4a72c', '#5fb878', '#4fb3bf', '#a3b5ff', '#c28bf5', '#9e2b25']

function ThemePicker({ api }: { api: SheetApi }) {
  const current = api.doc.theme?.name ?? 'ember'
  const accent = api.doc.theme?.accent ?? null
  return (
    <div className="flex flex-col gap-2">
      <Label>Theme</Label>
      <div className="grid grid-cols-3 gap-2">
        {THEME_SWATCHES.map(t => (
          <button key={t.name} type="button" aria-pressed={current === t.name} onClick={() => api.saveTheme(t.name, accent)}
            className={cx('flex flex-col items-center gap-1 rounded-xl border p-2 text-xs font-semibold', current === t.name ? 'border-accent' : 'border-line')}>
            <span className="flex h-7 w-full items-center justify-center rounded-lg" style={{ background: t.bg }}><span className="h-3 w-3 rounded-full" style={{ background: t.accent }} /></span>
            {t.label}
          </button>
        ))}
      </div>
      <Label>Accent</Label>
      <div className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={!accent} onClick={() => api.saveTheme(current, null)} className={cx('h-7 rounded-full border px-2 text-xs font-semibold', !accent ? 'border-accent' : 'border-line')}>Default</button>
        {ACCENTS.map(c => (
          <button key={c} type="button" aria-label={`Accent ${c}`} aria-pressed={accent === c} onClick={() => api.saveTheme(current, c)}
            className={cx('h-7 w-7 rounded-full border-2', accent === c ? 'border-ink' : 'border-transparent')} style={{ background: c }} />
        ))}
      </div>
    </div>
  )
}

function StatTile({ label, children, onClick, highlight, ariaLabel, title }: { label: string; children: React.ReactNode; onClick?: () => void; highlight?: boolean; ariaLabel?: string; title?: string }) {
  const cls = cx('flex flex-[1_1_88px] flex-col items-center justify-center gap-0.5 rounded-2xl border px-1.5 py-3 text-ink', highlight ? 'border-accent bg-accent-soft' : 'border-line bg-panel', onClick && 'cursor-pointer hover:border-accent')
  const inner = <><Label>{label}</Label>{children}</>
  return onClick ? <button type="button" className={cls} onClick={onClick} aria-label={ariaLabel} title={title}>{inner}</button> : <div className={cls} title={title}>{inner}</div>
}

function VitalsRow({ api, onDetail }: { api: SheetApi; onDetail: (d: DetailContent) => void }) {
  const { sheet, state, setState, rollCheck } = api
  const walk = sheet.speeds[0]
  return (
    <section className="flex flex-wrap gap-4" aria-label="Abilities and vitals">
      <div className="grid flex-[1_1_560px] grid-cols-3 content-start items-start gap-2.5 self-start sm:grid-cols-6">
        {ABILITIES.map((a: Ability) => (
          <button key={a} type="button" onClick={() => rollCheck(`${ABILITY_NAMES[a]} check`, sheet.abilities[a].mod)} aria-label={`Roll ${ABILITY_NAMES[a]} check`}
            className="flex flex-col items-center gap-0.5 rounded-2xl border border-line bg-panel px-1.5 pb-2.5 pt-3 hover:border-accent">
            <Label>{ABILITY_NAMES[a]}</Label>
            <span className="text-[30px] font-semibold leading-tight">{fmtMod(sheet.abilities[a].mod)}</span>
            <span className="rounded-full bg-raised px-2.5 py-px text-[13px] font-semibold text-muted">{sheet.abilities[a].score}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-[1_1_640px] flex-wrap gap-2.5">
        <StatTile label="Proficiency"><span className="text-[30px] font-semibold leading-tight">{fmtMod(sheet.pb)}</span></StatTile>
        <StatTile label={walk.kind} title={sheet.speeds.map(s => `${s.kind} ${s.value} ft`).join(', ')}>
          <span className="text-[30px] font-semibold leading-tight">{walk.value}<span className="text-sm text-muted"> ft</span></span>
          {sheet.speeds.length > 1 && <span className="text-[11px] text-muted">{sheet.speeds.slice(1).map(s => `${s.kind} ${s.value}`).join(' · ')}</span>}
        </StatTile>
        <StatTile label="Initiative" onClick={() => rollCheck('Initiative', sheet.initiative)} ariaLabel="Roll initiative"><span className="text-[30px] font-semibold leading-tight">{fmtMod(sheet.initiative)}</span></StatTile>
        <StatTile label="Armor Class" highlight onClick={() => onDetail({ title: `Armor Class ${sheet.ac.value}`, text: sheet.ac.breakdown.join('\n') })} ariaLabel={`Armor class ${sheet.ac.value}, show breakdown`}>
          <span className="text-[30px] font-semibold leading-tight">{sheet.ac.value}</span>
        </StatTile>
        <StatTile label="Heroic Insp." highlight={state.inspiration} onClick={() => setState(s => ({ ...s, inspiration: !s.inspiration }))} ariaLabel={state.inspiration ? 'Use Heroic Inspiration' : 'Gain Heroic Inspiration'}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill={state.inspiration ? 'var(--accent)' : 'none'} stroke={state.inspiration ? 'var(--accent)' : 'var(--muted)'} strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z" /></svg>
        </StatTile>
        <HitPointsCard api={api} damage={n => setState(s => applyDamage(api.doc, s, n))} heal={n => setState(s => applyHealing(s, n))} temp={n => setState(s => setTempHp(s, n))} />
      </div>
    </section>
  )
}

function Box({ flat, children }: { flat?: boolean; children: React.ReactNode }) {
  return flat ? <div className="flex flex-col gap-3 border-b border-line pb-4 last:border-0">{children}</div> : <Card className="flex flex-col gap-3 p-4">{children}</Card>
}

function AbilitiesColumn({ api, flat }: { api: SheetApi; flat?: boolean }) {
  const { sheet, rollCheck } = api
  return (
    <>
      <Box flat={flat}>
        <SectionTitle>Saving Throws</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {ABILITIES.map(a => {
            const s = sheet.abilities[a]
            return (
              <button key={a} type="button" onClick={() => rollCheck(`${ABILITY_NAMES[a]} save`, s.save)} aria-label={`Roll ${ABILITY_NAMES[a]} saving throw`}
                className="flex min-h-[44px] items-center gap-2 rounded-xl border border-line bg-raised px-2.5 hover:border-accent">
                <span aria-hidden="true" className={cx('h-2.5 w-2.5 rounded-full border-2', s.saveProf ? 'border-accent bg-accent' : 'border-muted')} />
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">{a}</span>
                <span className="ml-auto text-[17px] font-semibold">{fmtMod(s.save)}</span>
              </button>
            )
          })}
        </div>
        {sheet.savingThrowNotes.map(n => <div key={n} className="text-xs text-muted">{n}</div>)}
      </Box>
      <Box flat={flat}>
        <SectionTitle>Senses</SectionTitle>
        {([['Passive Perception', sheet.passives.perception], ['Passive Investigation', sheet.passives.investigation], ['Passive Insight', sheet.passives.insight]] as const).map(([label, v]) => (
          <div key={label} className="flex items-center gap-3">
            <span className="min-w-[40px] rounded-lg bg-raised py-1 text-center text-[17px] font-semibold">{v}</span>
            <span className="text-[13px]">{label}</span>
          </div>
        ))}
        {sheet.senses.length > 0 && <div className="text-[13px] text-muted">{sheet.senses.join(' · ')}</div>}
      </Box>
      <Box flat={flat}>
        <SectionTitle>Proficiencies &amp; Training</SectionTitle>
        {([['Armor', sheet.proficiencies.armor], ['Weapons', sheet.proficiencies.weapons], ['Tools', sheet.proficiencies.tools], ['Languages', sheet.proficiencies.languages]] as const).map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-accent">{k}</span>
            <span className="text-[13px]">{v.length ? v.join(', ') : '—'}</span>
          </div>
        ))}
      </Box>
    </>
  )
}

function SkillsCard({ api, flat }: { api: SheetApi; flat?: boolean }) {
  const { sheet, rollCheck } = api
  return (
    <div className={cx('flex w-full flex-col gap-1', !flat && 'rounded-2xl border border-line bg-panel p-4')}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <SectionTitle>Skills</SectionTitle>
        <span className="text-[11px] text-muted">● proficient · ◉ expertise · ◐ half</span>
      </div>
      {sheet.skills.map((s, i) => (
        <button key={s.key} type="button" onClick={() => rollCheck(s.name, s.bonus, { forceMode: combineModes(api.mode, s.advantage, s.disadvantage), reliable: s.prof === 'proficient' || s.prof === 'expertise' })}
          aria-label={`Roll ${s.name}`} className={cx('flex min-h-[40px] items-center gap-2.5 rounded-[9px] px-2 text-left hover:outline hover:outline-1 hover:outline-accent', i % 2 === 0 && 'bg-raised')}>
          <span aria-hidden="true" className={cx('h-3 w-3 shrink-0 rounded-full border-2',
            s.prof === 'none' ? 'border-muted' : 'border-accent',
            s.prof === 'proficient' || s.prof === 'expertise' ? 'bg-accent' : '',
            s.prof === 'expertise' && 'ring-2 ring-accent ring-offset-2 ring-offset-[var(--panel)]',
          )} style={s.prof === 'half' ? { background: 'linear-gradient(90deg, var(--accent) 50%, transparent 50%)' } : undefined} />
          <span className="w-[30px] text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">{s.ability}</span>
          <span className="flex-1 text-sm">{s.name}{s.advantage && <span className="ml-1.5 rounded bg-accent-soft px-1 text-[10px] font-bold text-accent" title="Advantage">ADV</span>}{s.disadvantage && <span className="ml-1.5 rounded bg-raised px-1 text-[10px] font-bold text-bad" title="Disadvantage">DIS</span>}</span>
          <span className="min-w-[44px] rounded-lg border border-line py-[3px] text-center text-[15px] font-semibold">{fmtMod(s.bonus)}</span>
        </button>
      ))}
    </div>
  )
}
