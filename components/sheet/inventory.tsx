'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Resource } from '@/lib/sheet/compute'
import type { Currency, Item } from '@/lib/sheet/types'
import type { SheetApi } from './useSheet'
import { Label, Pips, SectionTitle, cx, rarityColor, type DetailContent } from './ui'

type OnDetail = (d: DetailContent) => void
const newId = () => `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
const weightOf = (i: Item) => (i.weight * i.quantity) / (i.bundleSize || 1)
const itemTypeLabel = (i: Item) => {
  const type = i.type === 'Other Gear' ? 'Gear' : i.type
  return (i.weapon || i.armor) && i.subtype && i.subtype !== type ? `${type} · ${i.subtype}` : type
}

export function InventoryTab({ api, onDetail }: { api: SheetApi; onDetail: OnDetail }) {
  const { doc, sheet, docError, setDocError } = api
  const [adding, setAdding] = useState(false)
  const resources = new Map(sheet.resources.map(r => [r.key, r]))
  const ids = new Set(doc.inventory.map(i => i.id))
  const top = doc.inventory.filter(i => !i.containerId || !ids.has(i.containerId))
  const containers = doc.inventory.filter(i => i.isContainer || doc.inventory.some(x => x.containerId === i.id))
  const over = sheet.inventory.weight > sheet.inventory.capacity
  const overAttuned = sheet.inventory.attuned > sheet.inventory.attuneMax

  return (
    <div className="flex flex-col gap-4">
      <CurrencyEditor api={api} />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted">
        <span>Carrying <strong className={over ? 'text-bad' : 'text-ink'}>{sheet.inventory.weight} lb</strong> of {sheet.inventory.capacity} lb</span>
        <span>Attuned <strong className={overAttuned ? 'text-bad' : 'text-ink'}>{sheet.inventory.attuned} / {sheet.inventory.attuneMax}</strong></span>
        {doc.preferences.ignoreCoinWeight && <span>Coin weight ignored</span>}
        <button type="button" onClick={() => setAdding(a => !a)} aria-expanded={adding} className="ml-auto min-h-[38px] rounded-xl bg-accent px-4 text-[13px] font-semibold text-on-accent">{adding ? 'Close' : '+ Add item'}</button>
      </div>
      {docError && <div role="alert" className="flex items-center justify-between gap-2 rounded-xl border border-bad px-3 py-2 text-[13px] text-bad">{docError}<button type="button" className="underline" onClick={() => setDocError(null)}>Dismiss</button></div>}
      {adding && <AddItemPanel api={api} containers={containers} onDone={() => setAdding(false)} />}
      <ItemTable title="Equipment" items={top} containers={containers} resources={resources} api={api} onDetail={onDetail} />
      {containers.map(c => (
        <ItemTable key={c.id} title={`${c.custom?.name || c.name}${c.contentsWeightMultiplier === 0 ? ' · contents weightless' : ''}`}
          items={doc.inventory.filter(i => i.containerId === c.id)} containers={containers} resources={resources} api={api} onDetail={onDetail} />
      ))}
    </div>
  )
}

const COINS: Array<{ k: keyof Currency; label: string }> = [{ k: 'pp', label: 'PP' }, { k: 'gp', label: 'GP' }, { k: 'ep', label: 'EP' }, { k: 'sp', label: 'SP' }, { k: 'cp', label: 'CP' }]

function CurrencyEditor({ api }: { api: SheetApi }) {
  const { doc } = api
  const [open, setOpen] = useState(false)
  const [delta, setDelta] = useState<Record<string, string>>({})
  const totalGp = doc.currency.pp * 10 + doc.currency.gp + doc.currency.ep / 2 + doc.currency.sp / 10 + doc.currency.cp / 100
  const apply = async (sign: 1 | -1) => {
    const d: Partial<Currency> = {}
    for (const { k } of COINS) { const n = parseInt(delta[k] || '', 10); if (n > 0) d[k] = sign * n }
    if (!Object.keys(d).length) return
    if (await api.editDoc({ op: 'currency.adjust', delta: d })) { setDelta({}); setOpen(false) }
  }
  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-2 text-left">
        {COINS.map(({ k, label }) => (
          <span key={k} className="flex flex-col rounded-xl bg-raised px-2.5 py-2 hover:outline hover:outline-1 hover:outline-accent"><Label>{label}</Label><span className="text-lg font-semibold">{doc.currency[k].toLocaleString()}</span></span>
        ))}
      </button>
      <span className="text-xs text-muted">≈ {Math.floor(totalGp).toLocaleString()} gp total · click coins to add or spend</span>
      {open && (
        <div className="pop flex flex-wrap items-end gap-2 rounded-xl bg-raised p-3">
          {COINS.map(({ k, label }) => (
            <label key={k} className="flex w-20 flex-col gap-1 text-xs text-muted">{label}
              <input inputMode="numeric" value={delta[k] ?? ''} onChange={e => setDelta(d => ({ ...d, [k]: e.target.value.replace(/[^0-9]/g, '').slice(0, 9) }))}
                className="min-h-[38px] rounded-lg border border-line bg-panel px-2 text-sm font-semibold text-ink" />
            </label>
          ))}
          <button type="button" onClick={() => apply(1)} className="min-h-[38px] rounded-lg border border-line bg-panel px-3 text-[13px] font-semibold text-good">Add</button>
          <button type="button" onClick={() => apply(-1)} className="min-h-[38px] rounded-lg border border-line bg-panel px-3 text-[13px] font-semibold text-bad">Spend</button>
        </div>
      )}
    </div>
  )
}

function ItemTable({ title, items, containers, resources, api, onDetail }: { title: string; items: Item[]; containers: Item[]; resources: Map<string, Resource>; api: SheetApi; onDetail: OnDetail }) {
  const [editing, setEditing] = useState<string | null>(null)
  if (!items.length) return null
  const sorted = [...items].sort((a, b) => Number(b.equipped) - Number(a.equipped) || a.name.localeCompare(b.name))
  return (
    <div className="flex flex-col">
      <SectionTitle accent>{title}</SectionTitle>
      <div className="mt-2 hidden grid-cols-[44px_2.4fr_1.3fr_1fr_0.7fr_1.1fr_40px] gap-2 px-1 pb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted md:grid">
        <span>Eq.</span><span>Item</span><span>Type</span><span>Qty</span><span>Weight</span><span>Attune</span><span />
      </div>
      {sorted.map(i => {
        const r = i.uses ? resources.get(i.uses.key) : undefined
        const name = i.custom?.name || i.name
        return (
          <div key={i.id} className="border-t border-line">
            <div className="grid grid-cols-[36px_1fr_auto_36px] items-center gap-x-2 gap-y-1 px-1 py-2 text-[13px] md:grid-cols-[44px_2.4fr_1.3fr_1fr_0.7fr_1.1fr_40px]">
              {(
                <button type="button" aria-pressed={i.equipped} aria-label={`${i.equipped ? 'Unequip' : 'Equip'} ${name}`} onClick={() => api.editDoc({ op: 'item.update', id: i.id, equipped: !i.equipped })}
                  className="flex h-9 w-9 items-center justify-center"><span className={cx('h-[18px] w-[18px] rounded border-2 border-accent', i.equipped && 'bg-accent')} /></button>
              )}
              <button type="button" className="min-w-0 text-left font-semibold" style={{ color: rarityColor(i.rarity) }}
                onClick={() => onDetail({ title: name, subtitle: [i.custom?.name ? i.name : '', itemTypeLabel(i), i.rarity !== 'unknown' && i.rarity !== 'common' ? i.rarity : '', i.canAttune ? `requires attunement${i.attunementDescription ? ` ${i.attunementDescription}` : ''}` : '', i.homebrew ? 'homebrew' : ''].filter(Boolean).join(' · '), html: i.description || undefined, text: i.description ? undefined : (i.custom?.notes ?? []).join('\n') || 'No description.' })}>
                {name}{i.quantity > 1 && <span className="font-normal text-muted md:hidden"> ×{i.quantity}</span>}
              </button>
              <span className="text-muted md:hidden">{weightOf(i) ? `${+weightOf(i).toFixed(2)} lb` : ''}</span>
              <span className="hidden text-muted md:block">{itemTypeLabel(i)}</span>
              <span className="hidden items-center gap-1 md:flex">
                <button type="button" aria-label={`One fewer ${name}`} disabled={i.quantity <= 0} onClick={() => api.editDoc({ op: 'item.update', id: i.id, quantity: i.quantity - 1 })} className="h-7 w-7 rounded-md border border-line disabled:opacity-40">−</button>
                <span className="min-w-[2.5rem] text-center">{i.quantity}</span>
                <button type="button" aria-label={`One more ${name}`} onClick={() => api.editDoc({ op: 'item.update', id: i.id, quantity: i.quantity + 1 })} className="h-7 w-7 rounded-md border border-line">+</button>
              </span>
              <span className="hidden md:block">{weightOf(i) ? `${+weightOf(i).toFixed(2)} lb` : '—'}</span>
              <span className="col-span-2 flex flex-wrap items-center gap-2 pl-11 md:col-span-1 md:pl-0">
                {i.canAttune ? (
                  <button type="button" aria-pressed={i.attuned} onClick={() => api.editDoc({ op: 'item.update', id: i.id, attuned: !i.attuned })}
                    className={cx('min-h-[30px] rounded-full border px-2.5 text-xs font-semibold', i.attuned ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted')}>{i.attuned ? 'Attuned' : 'Attune'}</button>
                ) : <span className="hidden text-muted md:inline">—</span>}
                {r && <Pips max={r.max} used={r.used} label={name} onChange={used => api.setState(s => ({ ...s, used: { ...s.used, [r.key]: used } }))} />}
              </span>
              <button type="button" aria-label={`Edit ${name}`} aria-expanded={editing === i.id} onClick={() => setEditing(e => (e === i.id ? null : i.id))} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:text-ink">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
              </button>
            </div>
            {editing === i.id && <ItemEditor api={api} item={i} containers={containers.filter(c => c.id !== i.id)} onClose={() => setEditing(null)} />}
          </div>
        )
      })}
    </div>
  )
}

function ItemEditor({ api, item, containers, onClose }: { api: SheetApi; item: Item; containers: Item[]; onClose: () => void }) {
  const [name, setName] = useState(item.custom?.name ?? '')
  const [notes, setNotes] = useState((item.custom?.notes ?? []).join('\n'))
  const [hit, setHit] = useState(String(item.custom?.hitBonus ?? ''))
  const [dmg, setDmg] = useState(String(item.custom?.damageBonus ?? ''))
  const [qty, setQty] = useState(String(item.quantity))
  const save = async () => {
    const ok = await api.editDoc({
      op: 'item.update', id: item.id, quantity: Math.max(0, parseInt(qty, 10) || 0),
      custom: { name: name || null, notes: notes || null, hitBonus: item.weapon ? parseInt(hit, 10) || null : undefined, damageBonus: item.weapon ? parseInt(dmg, 10) || null : undefined },
    })
    if (ok) onClose()
  }
  const field = 'min-h-[38px] rounded-lg border border-line bg-panel px-2.5 text-[13px] text-ink'
  return (
    <div className="pop mb-2 flex flex-col gap-3 rounded-xl bg-raised p-3">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted">Display name<input value={name} placeholder={item.name} onChange={e => setName(e.target.value.slice(0, 80))} className={field} /></label>
        <label className="flex flex-col gap-1 text-xs text-muted">Quantity<input inputMode="numeric" value={qty} onChange={e => setQty(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} className={field} /></label>
        {item.weapon && <label className="flex flex-col gap-1 text-xs text-muted">Extra to hit<input inputMode="numeric" value={hit} onChange={e => setHit(e.target.value.replace(/[^0-9-]/g, '').slice(0, 3))} className={field} /></label>}
        {item.weapon && <label className="flex flex-col gap-1 text-xs text-muted">Extra damage<input inputMode="numeric" value={dmg} onChange={e => setDmg(e.target.value.replace(/[^0-9-]/g, '').slice(0, 3))} className={field} /></label>}
        <label className="flex flex-col gap-1 text-xs text-muted">Location
          <select value={item.containerId ?? ''} onChange={e => api.editDoc({ op: 'item.update', id: item.id, containerId: e.target.value || null })} className={field}>
            <option value="">Equipment (carried)</option>
            {containers.filter(c => c.isContainer).map(c => <option key={c.id} value={c.id}>{c.custom?.name || c.name}</option>)}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs text-muted">Notes<textarea value={notes} onChange={e => setNotes(e.target.value.slice(0, 2000))} rows={2} className={cx(field, 'py-2')} /></label>
      {item.weapon && (
        <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={!item.custom?.hideFromAttacks} onChange={e => api.editDoc({ op: 'item.update', id: item.id, custom: { hideFromAttacks: !e.target.checked } })} className="h-4 w-4 accent-[var(--accent)]" /> Show in attacks when equipped</label>
      )}
      <div className="flex flex-wrap justify-between gap-2">
        <button type="button" onClick={async () => { if (window.confirm(`Remove ${item.custom?.name || item.name}?`)) await api.editDoc({ op: 'item.remove', id: item.id }) }} className="min-h-[38px] rounded-lg border border-bad px-3 text-[13px] font-semibold text-bad">Remove</button>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="min-h-[38px] rounded-lg border border-line px-3 text-[13px] font-semibold">Cancel</button>
          <button type="button" onClick={save} className="min-h-[38px] rounded-lg bg-accent px-4 text-[13px] font-semibold text-on-accent">Save</button>
        </div>
      </div>
    </div>
  )
}

interface CatalogHit { key: string; name: string; source: string; type: string; rarity: Item['rarity']; weight: number; attunement: boolean; magic: boolean }

function AddItemPanel({ api, containers, onDone }: { api: SheetApi; containers: Item[]; onDone: () => void }) {
  const [mode, setMode] = useState<'catalog' | 'custom'>('catalog')
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<CatalogHit[]>([])
  const [loading, setLoading] = useState(false)
  const [bonus, setBonus] = useState<Record<string, number>>({})
  const [added, setAdded] = useState<string | null>(null)
  useEffect(() => {
    if (mode !== 'catalog') return
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/catalog/items?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        if (res.ok) setHits((await res.json()).items)
      } catch { /* aborted */ } finally { setLoading(false) }
    }, 200)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [q, mode])
  const add = async (h: CatalogHit) => {
    if (await api.editDoc({ op: 'item.add', catalogKey: h.key, id: newId(), quantity: 1, magicBonus: bonus[h.key] || 0 })) setAdded(h.name)
  }
  return (
    <div className="pop flex flex-col gap-3 rounded-xl border border-line bg-raised p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Add from" className="flex gap-1">
          {(['catalog', 'custom'] as const).map(m => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={cx('min-h-[34px] rounded-full border px-3 text-xs font-semibold', mode === m ? 'border-accent bg-accent text-on-accent' : 'border-line')}>{m === 'catalog' ? 'Item list' : 'Custom / homebrew'}</button>
          ))}
        </div>
        {added && <span className="text-xs text-good" role="status">Added {added}.</span>}
      </div>
      {mode === 'catalog' ? (
        <>
          <label className="sr-only" htmlFor="item-search">Search items</label>
          <input id="item-search" autoFocus value={q} onChange={e => setQ(e.target.value.slice(0, 80))} placeholder="Search 1,800+ items (2014 PHB, DMG, and supplements)"
            className="min-h-[42px] rounded-xl border border-line bg-panel px-3 text-sm text-ink placeholder:text-muted" />
          <div className="flex max-h-[360px] flex-col overflow-y-auto">
            {loading && !hits.length && <span className="p-2 text-xs text-muted">Searching…</span>}
            {hits.map(h => (
              <div key={h.key} className="flex flex-wrap items-center gap-2 border-t border-line px-1 py-2 text-[13px]">
                <span className="min-w-0 flex-[1_1_200px]"><strong style={{ color: rarityColor(h.rarity) }}>{h.name}</strong> <span className="text-xs text-muted">· {h.type} · {h.source}{h.attunement ? ' · attunement' : ''}{h.weight ? ` · ${h.weight} lb` : ''}</span></span>
                {!h.magic && /Weapon|Armor|Shield/.test(h.type) && (
                  <select aria-label={`Magic bonus for ${h.name}`} value={bonus[h.key] || 0} onChange={e => setBonus(b => ({ ...b, [h.key]: Number(e.target.value) }))} className="min-h-[32px] rounded-lg border border-line bg-panel px-2 text-xs text-ink">
                    <option value={0}>Mundane</option><option value={1}>+1</option><option value={2}>+2</option><option value={3}>+3</option>
                  </select>
                )}
                <button type="button" onClick={() => add(h)} className="min-h-[32px] rounded-lg bg-accent px-3 text-xs font-semibold text-on-accent">Add</button>
              </div>
            ))}
            {!loading && q && !hits.length && <span className="p-2 text-xs text-muted">No matches. Try the Custom / homebrew tab.</span>}
          </div>
        </>
      ) : <CustomItemForm api={api} containers={containers} onDone={onDone} />}
    </div>
  )
}

const DAMAGE_TYPES = ['bludgeoning', 'piercing', 'slashing', 'acid', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'poison', 'psychic', 'radiant', 'thunder']
const WEAPON_PROPS = ['Finesse', 'Light', 'Heavy', 'Reach', 'Thrown', 'Two-Handed', 'Versatile', 'Ammunition', 'Loading']

function CustomItemForm({ api, onDone }: { api: SheetApi; containers: Item[]; onDone: () => void }) {
  const [f, setF] = useState({
    name: '', kind: 'gear' as 'gear' | 'weapon' | 'armor' | 'wondrous', rarity: 'common' as Item['rarity'], weight: '', quantity: '1', canAttune: false, description: '',
    damage: '1d8', damageType: 'slashing', category: 'martial' as 'simple' | 'martial', ranged: false, range: '', longRange: '', props: [] as string[], magicBonus: '0',
    armorType: 'light' as 'light' | 'medium' | 'heavy' | 'shield', baseAc: '11', acBonus: '0', saveBonus: '0', charges: '', reset: 'dawn',
  })
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(x => ({ ...x, [k]: v }))
  const [error, setError] = useState<string | null>(null)
  const preview = useMemo(() => f.name.trim(), [f.name])
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const id = newId()
    const effects = [] as Array<{ type: string; subType: string; value: number; requiresAttunement: boolean }>
    if (Number(f.acBonus)) effects.push({ type: 'bonus', subType: 'armor-class', value: Number(f.acBonus), requiresAttunement: f.canAttune })
    if (Number(f.saveBonus)) effects.push({ type: 'bonus', subType: 'saving-throws', value: Number(f.saveBonus), requiresAttunement: f.canAttune })
    const item = {
      id, name: f.name.trim(), homebrew: true, rarity: f.rarity, weight: Number(f.weight) || 0, quantity: Number(f.quantity) || 1, canAttune: f.canAttune,
      description: f.description.trim() ? f.description.trim().split(/\n{2,}/).map(p => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`).join('') : '',
      type: f.kind === 'weapon' ? 'Weapon' : f.kind === 'armor' ? (f.armorType === 'shield' ? 'Shield' : 'Armor') : f.kind === 'wondrous' ? 'Wondrous item' : 'Gear',
      magic: f.rarity !== 'common' || Number(f.magicBonus) > 0, magicBonus: f.kind === 'weapon' ? Number(f.magicBonus) || undefined : undefined,
      weapon: f.kind === 'weapon' ? { base: f.name, category: f.category, kind: f.ranged ? 'ranged' : 'melee', damage: f.damage, damageType: f.damageType, range: Number(f.range) || 5, longRange: Number(f.longRange) || Number(f.range) || 5, properties: f.props } : undefined,
      armor: f.kind === 'armor' ? { type: f.armorType, baseAc: Number(f.baseAc) || 0 } : undefined,
      effects, uses: Number(f.charges) > 0 ? { max: Number(f.charges), reset: f.reset } : undefined,
    }
    const ok = await api.editDoc({ op: 'item.insert', item: item as unknown as Item })
    if (ok) onDone(); else setError('Check the fields and try again.')
  }
  const field = 'min-h-[38px] rounded-lg border border-line bg-panel px-2.5 text-[13px] text-ink'
  const lbl = 'flex flex-col gap-1 text-xs text-muted'
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">
        <label className={lbl}>Name<input required value={f.name} onChange={e => set('name', e.target.value.slice(0, 80))} className={field} /></label>
        <label className={lbl}>Kind
          <select value={f.kind} onChange={e => set('kind', e.target.value as typeof f.kind)} className={field}><option value="gear">Gear</option><option value="weapon">Weapon</option><option value="armor">Armor / shield</option><option value="wondrous">Wondrous item</option></select>
        </label>
        <label className={lbl}>Rarity
          <select value={f.rarity} onChange={e => set('rarity', e.target.value as Item['rarity'])} className={field}>{['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'].map(r => <option key={r} value={r}>{r}</option>)}</select>
        </label>
        <label className={lbl}>Weight (lb)<input inputMode="decimal" value={f.weight} onChange={e => set('weight', e.target.value.replace(/[^0-9.]/g, '').slice(0, 7))} className={field} /></label>
        <label className={lbl}>Quantity<input inputMode="numeric" value={f.quantity} onChange={e => set('quantity', e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} className={field} /></label>
      </div>
      {f.kind === 'weapon' && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2">
          <label className={lbl}>Damage dice<input value={f.damage} onChange={e => set('damage', e.target.value.replace(/[^0-9d+-]/gi, '').slice(0, 12))} className={field} /></label>
          <label className={lbl}>Damage type<select value={f.damageType} onChange={e => set('damageType', e.target.value)} className={field}>{DAMAGE_TYPES.map(d => <option key={d}>{d}</option>)}</select></label>
          <label className={lbl}>Category<select value={f.category} onChange={e => set('category', e.target.value as 'simple' | 'martial')} className={field}><option value="simple">Simple</option><option value="martial">Martial</option></select></label>
          <label className={lbl}>Magic bonus<select value={f.magicBonus} onChange={e => set('magicBonus', e.target.value)} className={field}>{['0', '1', '2', '3'].map(b => <option key={b} value={b}>{b === '0' ? 'None' : `+${b}`}</option>)}</select></label>
          <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={f.ranged} onChange={e => set('ranged', e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />Ranged</label>
          {(f.ranged || f.props.includes('Thrown')) && <>
            <label className={lbl}>Range (ft)<input inputMode="numeric" value={f.range} onChange={e => set('range', e.target.value.replace(/[^0-9]/g, '').slice(0, 4))} className={field} /></label>
            <label className={lbl}>Long range (ft)<input inputMode="numeric" value={f.longRange} onChange={e => set('longRange', e.target.value.replace(/[^0-9]/g, '').slice(0, 4))} className={field} /></label>
          </>}
          <fieldset className="col-span-full flex flex-wrap gap-1.5"><legend className="mb-1 text-xs text-muted">Properties</legend>
            {WEAPON_PROPS.map(p => (
              <button key={p} type="button" aria-pressed={f.props.includes(p)} onClick={() => set('props', f.props.includes(p) ? f.props.filter(x => x !== p) : [...f.props, p])}
                className={cx('min-h-[30px] rounded-full border px-2.5 text-xs font-semibold', f.props.includes(p) ? 'border-accent bg-accent text-on-accent' : 'border-line')}>{p}</button>
            ))}
          </fieldset>
        </div>
      )}
      {f.kind === 'armor' && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2">
          <label className={lbl}>Type<select value={f.armorType} onChange={e => set('armorType', e.target.value as typeof f.armorType)} className={field}><option value="light">Light</option><option value="medium">Medium</option><option value="heavy">Heavy</option><option value="shield">Shield</option></select></label>
          <label className={lbl}>{f.armorType === 'shield' ? 'AC bonus' : 'Base AC'}<input inputMode="numeric" value={f.baseAc} onChange={e => set('baseAc', e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} className={field} /></label>
        </div>
      )}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2">
        <label className={lbl}>Extra AC<input inputMode="numeric" value={f.acBonus} onChange={e => set('acBonus', e.target.value.replace(/[^0-9-]/g, '').slice(0, 3))} className={field} /></label>
        <label className={lbl}>Save bonus<input inputMode="numeric" value={f.saveBonus} onChange={e => set('saveBonus', e.target.value.replace(/[^0-9-]/g, '').slice(0, 3))} className={field} /></label>
        <label className={lbl}>Charges<input inputMode="numeric" value={f.charges} onChange={e => set('charges', e.target.value.replace(/[^0-9]/g, '').slice(0, 3))} className={field} /></label>
        <label className={lbl}>Recharge<select value={f.reset} onChange={e => set('reset', e.target.value)} className={field}><option value="dawn">Dawn</option><option value="long">Long rest</option><option value="short">Short rest</option><option value="consumable">Never (consumable)</option></select></label>
        <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={f.canAttune} onChange={e => set('canAttune', e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />Requires attunement</label>
      </div>
      <label className={lbl}>Description<textarea value={f.description} onChange={e => set('description', e.target.value.slice(0, 8000))} rows={4} className={cx(field, 'py-2')} /></label>
      {error && <p role="alert" className="m-0 text-[13px] text-bad">{error}</p>}
      <div className="flex justify-end"><button type="submit" disabled={!preview} className="min-h-[40px] rounded-lg bg-accent px-4 text-[13px] font-semibold text-on-accent disabled:opacity-50">Add {preview || 'item'}</button></div>
    </form>
  )
}
