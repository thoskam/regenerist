'use client'

import { useMemo, useState } from 'react'
import { ABILITY_NAMES, fmtMod, ordinal, type ActionRow, type AttackRow, type Resource } from '@/lib/sheet/compute'
import type { Activation, CharacterDoc, Item, Notes } from '@/lib/sheet/types'
import type { SheetApi } from './useSheet'
import { Label, Pips, RichText, SectionTitle, cx, rarityColor, type DetailContent } from './ui'

type OnDetail = (d: DetailContent) => void

function ResourcePips({ api, r }: { api: SheetApi; r?: Resource }) {
  if (!r) return null
  return <Pips max={r.max} used={r.used} label={r.name} onChange={used => api.setState(s => ({ ...s, used: { ...s.used, [r.key]: used } }))} />
}

const RESET_LABEL: Record<string, string> = { short: 'short rest', long: 'long rest', dawn: 'dawn', dusk: 'dusk', consumable: 'consumable', other: 'special' }

/* ───────────────────────── Actions ───────────────────────── */

type Filter = 'all' | 'attack' | Activation | 'limited'
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' }, { id: 'attack', label: 'Attack' }, { id: 'action', label: 'Action' }, { id: 'bonus', label: 'Bonus action' },
  { id: 'reaction', label: 'Reaction' }, { id: 'special', label: 'Other' }, { id: 'limited', label: 'Limited use' },
]
const GROUPS: Array<{ id: Activation; title: string }> = [
  { id: 'action', title: 'Actions' }, { id: 'bonus', title: 'Bonus Actions' }, { id: 'reaction', title: 'Reactions' }, { id: 'special', title: 'Other' },
]

export function ActionsTab({ api, onDetail }: { api: SheetApi; onDetail: OnDetail }) {
  const { sheet, doc } = api
  const [filter, setFilter] = useState<Filter>('all')
  const showAttacks = filter === 'all' || filter === 'attack' || filter === 'action' || (filter === 'limited' && sheet.attacks.some(a => a.resource))
  const attacks = filter === 'limited' ? sheet.attacks.filter(a => a.resource) : sheet.attacks
  const keep = (a: ActionRow) => filter === 'all' || a.activation === filter || (filter === 'limited' && !!a.resource)
  const itemById = useMemo(() => new Map(doc.inventory.map(i => [i.id, i])), [doc.inventory])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter actions">
        {FILTERS.map(f => (
          <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
            className={cx('min-h-[32px] rounded-full border px-3 text-xs font-semibold', filter === f.id ? 'border-accent bg-accent text-on-accent' : 'border-line text-ink')}>{f.label}</button>
        ))}
      </div>

      {showAttacks && attacks.length > 0 && (
        <div className="flex flex-col">
          <div className="hidden grid-cols-[2.2fr_0.8fr_0.7fr_1fr_2.2fr] gap-2.5 px-1 pb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted md:grid">
            <span>Attack</span><span>Range</span><span>Hit</span><span>Damage</span><span>Notes</span>
          </div>
          {attacks.map(a => <AttackLine key={a.id} api={api} a={a} item={a.itemId ? itemById.get(a.itemId) : undefined} onDetail={onDetail} />)}
        </div>
      )}

      {GROUPS.map(g => {
        const rows = sheet.actions.filter(a => a.activation === g.id && keep(a))
        if (!rows.length) return null
        return (
          <div key={g.id} className="flex flex-col gap-2">
            <SectionTitle accent>{g.title}</SectionTitle>
            {rows.map(a => (
              <div key={a.id} className="flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-xl bg-raised px-3 py-2.5">
                <button type="button" className="flex min-w-0 flex-[1_1_260px] flex-col gap-0.5 text-left" onClick={() => onDetail({ title: a.name, subtitle: a.meta, html: a.description })}>
                  <span className="text-sm font-semibold">{a.name} <span className="text-xs font-medium text-muted">· {a.meta}{a.resource ? ` · ${a.resource.max}/${RESET_LABEL[a.resource.reset]}` : ''}</span></span>
                  {a.snippet && <span className="line-clamp-2 text-[13px] text-muted">{a.snippet}</span>}
                </button>
                <div className="flex items-center gap-2">
                  <ResourcePips api={api} r={a.resource} />
                  {a.dice && <button type="button" onClick={() => api.rollDamage({ label: a.name, dice: a.dice! })} className="min-h-[36px] rounded-[9px] border border-accent bg-accent-soft px-3 text-[13px] font-semibold">Roll {a.dice}</button>}
                </div>
              </div>
            ))}
          </div>
        )
      })}

      {filter === 'all' && (
        <div className="flex flex-col gap-1">
          <SectionTitle accent>Actions in Combat</SectionTitle>
          <span className="text-[13px] text-muted">{sheet.combatActions.join(', ')}</span>
        </div>
      )}
    </div>
  )
}

function AttackLine({ api, a, item, onDetail }: { api: SheetApi; a: AttackRow; item?: Item; onDetail: OnDetail }) {
  const unconditional = a.extraDamage.filter(x => !x.note)
  const conditional = a.extraDamage.filter(x => x.note)
  const crit = api.critKey === a.id
  const rollHit = () => api.rollCheck(`${a.name} — to hit`, a.toHit, { critKey: a.id })
  const rollDmg = () => api.rollDamage({ label: `${a.name} — damage`, dice: a.damage, type: a.damageType, extras: unconditional.map(x => ({ dice: x.dice, type: x.type })), critKey: a.id })
  const detail = () => onDetail({
    title: a.name, subtitle: [a.subtitle, item?.rarity && item.rarity !== 'common' && item.rarity !== 'unknown' ? item.rarity : ''].filter(Boolean).join(' · '),
    html: item?.description || undefined, text: item?.description ? undefined : a.notes.join(', '),
  })
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-2.5 gap-y-1.5 border-t border-line px-1 py-2.5 md:grid-cols-[2.2fr_0.8fr_0.7fr_1fr_2.2fr]">
      <button type="button" onClick={detail} className="col-span-3 flex min-w-0 flex-col gap-0.5 text-left md:col-span-1">
        <span className="text-sm font-semibold" style={{ color: rarityColor(a.rarity) }}>{a.name}</span>
        <span className="text-xs text-muted">{a.subtitle}{!a.proficient && ' · not proficient'}</span>
      </button>
      <div className="flex flex-col">
        <span className="text-sm font-semibold">{a.range}</span>
        <span className="text-[11px] text-muted">{a.rangeNote}</span>
      </div>
      <button type="button" onClick={rollHit} aria-label={`Roll to hit with ${a.name}, ${fmtMod(a.toHit)}`} className="min-h-[40px] min-w-[52px] rounded-[9px] border border-line bg-raised text-base font-semibold hover:border-accent">{fmtMod(a.toHit)}</button>
      <button type="button" onClick={rollDmg} aria-label={`Roll damage for ${a.name}, ${a.damage} ${a.damageType}`}
        className={cx('flex min-h-[40px] min-w-[80px] flex-col items-center justify-center rounded-[9px] border bg-raised px-2 text-sm font-semibold leading-tight hover:border-accent', crit ? 'border-good' : 'border-line')}>
        <span>{a.damage}</span>
        <span className="text-[10px] font-medium text-muted">{crit ? 'crit!' : a.damageType}</span>
      </button>
      <div className="col-span-3 flex flex-wrap items-center gap-1.5 text-xs text-muted md:col-span-1">
        {a.mastery && <span className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent">Mastery: {a.mastery}</span>}
        {conditional.map(x => (
          <button key={x.dice + x.type} type="button" title={x.note} onClick={() => api.rollDamage({ label: `${a.name} — ${x.type}`, dice: x.dice, type: x.type })} className="rounded-full border border-accent px-2 py-0.5 font-semibold text-ink">+{x.dice} {x.type}</button>
        ))}
        <span>{a.notes.filter(n => !conditional.some(x => n === `+${x.dice} ${x.type}`)).join(', ')}</span>
        <ResourcePips api={api} r={a.resource} />
      </div>
    </div>
  )
}

/* ───────────────────────── Spells ───────────────────────── */

export function SpellsTab({ api, onDetail }: { api: SheetApi; onDetail: OnDetail }) {
  const { sheet } = api
  if (!sheet.spellcasting.length && !sheet.spellSlots.length) return <p className="m-0 text-muted">No spells.</p>
  const setSlot = (key: string, used: number) => api.setState(s => ({ ...s, slotsUsed: { ...s.slotsUsed, [key]: used } }))
  return (
    <div className="flex flex-col gap-5">
      {(sheet.spellSlots.length > 0 || sheet.pactSlots) && (
        <div className="flex flex-col gap-2">
          <SectionTitle accent>Spell Slots</SectionTitle>
          <div className="flex flex-wrap gap-3">
            {sheet.spellSlots.map(s => (
              <div key={s.level} className="flex flex-col gap-1.5 rounded-xl bg-raised px-3 py-2">
                <Label>{ordinal(s.level)}</Label>
                <Pips max={s.max} used={s.used} label={`${ordinal(s.level)}-level slots`} onChange={u => setSlot(String(s.level), u)} />
              </div>
            ))}
            {sheet.pactSlots && (
              <div className="flex flex-col gap-1.5 rounded-xl bg-raised px-3 py-2">
                <Label>Pact · {ordinal(sheet.pactSlots.level)}</Label>
                <Pips max={sheet.pactSlots.max} used={sheet.pactSlots.used} label="Pact slots" onChange={u => setSlot('pact', u)} />
              </div>
            )}
          </div>
        </div>
      )}
      {sheet.spellcasting.map(block => {
        const byLevel = new Map<number, typeof block.spells>()
        for (const s of block.spells) { const l = s.level; byLevel.set(l, [...(byLevel.get(l) || []), s]) }
        return (
          <div key={block.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h3 className="m-0 font-display text-xl font-semibold">{block.label}</h3>
              {block.ability && (
                <div className="flex gap-2">
                  <div className="rounded-xl bg-raised px-3 py-1.5"><Label>Ability</Label><div className="text-base font-semibold">{ABILITY_NAMES[block.ability]}</div></div>
                  <div className="rounded-xl bg-raised px-3 py-1.5"><Label>Save DC</Label><div className="text-base font-semibold">{block.dc}</div></div>
                  <button type="button" onClick={() => api.rollCheck(`${block.label} — spell attack`, block.attack ?? 0)} className="rounded-xl bg-raised px-3 py-1.5 text-left hover:outline hover:outline-1 hover:outline-accent"><Label>Attack</Label><div className="text-base font-semibold">{fmtMod(block.attack ?? 0)}</div></button>
                </div>
              )}
            </div>
            {[...byLevel].sort((a, b) => a[0] - b[0]).map(([lvl, spells]) => (
              <div key={lvl} className="flex flex-col gap-1.5">
                <SectionTitle accent>{lvl === 0 ? 'Cantrips' : `${ordinal(lvl)} level`}</SectionTitle>
                {spells.map(s => {
                  const dice = s.castDice ?? s.dice
                  return (
                    <div key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl bg-raised px-3 py-2.5">
                      <button type="button" className="flex min-w-0 flex-[1_1_220px] flex-col text-left" onClick={() => onDetail({ title: s.name, subtitle: `${s.level ? `${ordinal(s.level)}-level ${s.school}` : `${s.school} cantrip`}${s.castAtLevel && s.castAtLevel !== s.level ? ` · cast at ${ordinal(s.castAtLevel)} level` : ''}`, html: s.description, footer: <span className="text-xs text-muted">{[s.castingTime, s.range, s.components, s.duration].filter(Boolean).join(' · ')}</span> })}>
                        <span className="text-sm font-semibold">{s.name}
                          {s.concentration && <span className="ml-1.5 rounded bg-accent-soft px-1 text-[10px] font-bold text-accent" title="Concentration">C</span>}
                          {s.ritual && <span className="ml-1 rounded bg-accent-soft px-1 text-[10px] font-bold text-accent" title="Ritual">R</span>}
                        </span>
                        <span className="text-xs text-muted">{[s.castingTime, s.range, s.duration].filter(Boolean).join(' · ')}{s.castAtLevel && s.castAtLevel !== s.level ? ` · ${ordinal(s.castAtLevel)} level` : ''}</span>
                      </button>
                      {s.save && block.dc && <span className="text-xs font-semibold">{s.save.toUpperCase()} DC {block.dc}</span>}
                      {s.attack && block.attack != null && <button type="button" onClick={() => api.rollCheck(`${s.name} — spell attack`, block.attack!)} className="min-h-[34px] rounded-[9px] border border-line bg-panel px-2.5 text-[13px] font-semibold">{fmtMod(block.attack)}</button>}
                      {dice && <button type="button" onClick={() => api.rollDamage({ label: s.name, dice, type: s.damageType ?? undefined, healing: s.damageType === 'healing' })} className="min-h-[34px] rounded-[9px] border border-accent bg-accent-soft px-2.5 text-[13px] font-semibold">{dice}{s.damageType ? ` ${s.damageType}` : ''}</button>}
                      <ResourcePips api={api} r={s.resource} />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

/* ───────────────────────── Inventory ───────────────────────── */

export function InventoryTab({ api, onDetail }: { api: SheetApi; onDetail: OnDetail }) {
  const { doc, sheet } = api
  const resources = new Map(sheet.resources.map(r => [r.key, r]))
  const top = doc.inventory.filter(i => !i.containerId || !doc.inventory.some(c => c.id === i.containerId))
  const containers = doc.inventory.filter(i => doc.inventory.some(x => x.containerId === i.id))
  const coins = [['PP', doc.currency.pp], ['GP', doc.currency.gp], ['EP', doc.currency.ep], ['SP', doc.currency.sp], ['CP', doc.currency.cp]] as const
  const totalGp = doc.currency.pp * 10 + doc.currency.gp + doc.currency.ep / 2 + doc.currency.sp / 10 + doc.currency.cp / 100
  const over = sheet.inventory.weight > sheet.inventory.capacity
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(88px,1fr))] gap-2">
        {coins.map(([k, v]) => (
          <div key={k} className="flex flex-col rounded-xl bg-raised px-2.5 py-2"><Label>{k}</Label><span className="text-lg font-semibold">{v.toLocaleString()}</span></div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted">
        <span>Carrying <strong className={over ? 'text-bad' : 'text-ink'}>{sheet.inventory.weight} lb</strong> of {sheet.inventory.capacity} lb</span>
        <span>Attuned <strong className="text-ink">{sheet.inventory.attuned} / {sheet.inventory.attuneMax}</strong></span>
        <span>Wealth ≈ <strong className="text-ink">{Math.floor(totalGp).toLocaleString()} gp</strong></span>
        {doc.preferences.ignoreCoinWeight && <span>Coin weight ignored</span>}
      </div>
      <ItemTable title="Equipment" items={top} resources={resources} api={api} onDetail={onDetail} />
      {containers.map(c => (
        <ItemTable key={c.id} title={`${c.custom?.name || c.name}${c.contentsWeightMultiplier === 0 ? ' · contents weightless' : ''}`}
          items={doc.inventory.filter(i => i.containerId === c.id)} resources={resources} api={api} onDetail={onDetail} />
      ))}
    </div>
  )
}

const itemTypeLabel = (i: Item) => {
  const type = i.type === 'Other Gear' ? 'Gear' : i.type
  return (i.weapon || i.armor) && i.subtype && i.subtype !== type ? `${type} · ${i.subtype}` : type
}

const weightOf = (i: Item) => (i.weight * i.quantity) / (i.bundleSize || 1)

function ItemTable({ title, items, resources, api, onDetail }: { title: string; items: Item[]; resources: Map<string, Resource>; api: SheetApi; onDetail: OnDetail }) {
  if (!items.length) return null
  const sorted = [...items].sort((a, b) => Number(b.equipped) - Number(a.equipped) || a.name.localeCompare(b.name))
  return (
    <div className="flex flex-col">
      <SectionTitle accent>{title}</SectionTitle>
      <div className="mt-2 hidden grid-cols-[40px_2.4fr_1.4fr_0.6fr_0.7fr_1fr] gap-2 px-1 pb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted md:grid">
        <span>Eq.</span><span>Item</span><span>Type</span><span>Qty</span><span>Weight</span><span>Attune</span>
      </div>
      {sorted.map(i => {
        const r = i.uses ? resources.get(i.uses.key) : undefined
        const name = i.custom?.name || i.name
        return (
          <div key={i.id} className="grid grid-cols-[28px_1fr_auto] items-center gap-x-2 gap-y-1 border-t border-line px-1 py-2 text-[13px] md:grid-cols-[40px_2.4fr_1.4fr_0.6fr_0.7fr_1fr]">
            <span aria-label={i.equipped ? 'Equipped' : 'Not equipped'} className={cx('h-4 w-4 rounded border-2 border-accent', i.equipped && 'bg-accent')} />
            <button type="button" className="min-w-0 text-left font-semibold" style={{ color: rarityColor(i.rarity) }}
              onClick={() => onDetail({ title: name, subtitle: [i.custom?.name ? i.name : '', i.subtype || i.type, i.rarity !== 'unknown' && i.rarity !== 'common' ? i.rarity : '', i.canAttune ? `requires attunement${i.attunementDescription ? ` ${i.attunementDescription}` : ''}` : ''].filter(Boolean).join(' · '), html: i.description || undefined, text: i.description ? undefined : (i.custom?.notes ?? []).join('\n') || 'No description.' })}>
              {name}{i.quantity > 1 && <span className="font-normal text-muted"> ×{i.quantity}</span>}
            </button>
            <span className="text-muted md:hidden">{weightOf(i) ? `${+weightOf(i).toFixed(2)} lb` : ''}</span>
            <span className="hidden text-muted md:block">{itemTypeLabel(i)}</span>
            <span className="hidden md:block">{i.quantity}</span>
            <span className="hidden md:block">{weightOf(i) ? `${+weightOf(i).toFixed(2)} lb` : '—'}</span>
            <span className={cx('col-span-3 flex items-center gap-2 md:col-span-1', i.attuned ? 'text-accent' : 'text-muted')}>
              {i.attuned ? 'Attuned' : i.canAttune ? 'Not attuned' : <span className="hidden md:inline">—</span>}
              {r && <Pips max={r.max} used={r.used} label={name} onChange={used => api.setState(s => ({ ...s, used: { ...s.used, [r.key]: used } }))} />}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ───────────────────────── Features ───────────────────────── */

const KIND_ORDER = ['class', 'subclass', 'species', 'background', 'feat', 'item', 'custom']

export function FeaturesTab({ api }: { api: SheetApi; onDetail: OnDetail }) {
  const { doc, sheet } = api
  const resources = new Map(sheet.resources.map(r => [r.key, r]))
  const groups = new Map<string, CharacterDoc['features']>()
  for (const f of [...doc.features].sort((a, b) => KIND_ORDER.indexOf(a.source.kind) - KIND_ORDER.indexOf(b.source.kind) || (a.level ?? 0) - (b.level ?? 0))) {
    const key = f.source.kind === 'background' ? `Background · ${f.source.label}` : f.source.kind === 'feat' ? 'Feats' : f.source.label
    groups.set(key, [...(groups.get(key) || []), f])
  }
  return (
    <div className="flex flex-col gap-5">
      {[...groups].map(([title, features]) => (
        <div key={title} className="flex flex-col gap-2">
          <SectionTitle accent>{title}</SectionTitle>
          {features.map(f => {
            const r = f.uses ? resources.get(f.uses.key) : undefined
            return (
              <details key={f.id} className="group rounded-xl bg-raised px-3 py-2.5">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="flex min-w-0 flex-[1_1_240px] flex-col">
                    <span className="text-sm font-semibold">{f.name}{f.level ? <span className="text-xs font-medium text-muted"> · level {f.level}</span> : null}</span>
                    {f.snippet && <span className="text-[13px] text-muted group-open:hidden">{f.snippet}</span>}
                  </span>
                  {r && <Pips max={r.max} used={r.used} label={f.name} onChange={used => api.setState(s => ({ ...s, used: { ...s.used, [r.key]: used } }))} />}
                  <svg className="shrink-0 text-muted transition-transform group-open:rotate-180" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                </summary>
                <RichText html={f.description} className="mt-2 text-ink" />
              </details>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/* ───────────────────────── Notes ───────────────────────── */

const NOTE_FIELDS: Array<{ key: keyof Notes; label: string }> = [
  { key: 'personality', label: 'Personality traits' }, { key: 'ideals', label: 'Ideals' }, { key: 'bonds', label: 'Bonds' }, { key: 'flaws', label: 'Flaws' },
  { key: 'appearance', label: 'Appearance' }, { key: 'backstory', label: 'Backstory' }, { key: 'allies', label: 'Allies' }, { key: 'organizations', label: 'Organizations' },
  { key: 'enemies', label: 'Enemies' }, { key: 'possessions', label: 'Personal possessions' }, { key: 'holdings', label: 'Other holdings' }, { key: 'other', label: 'Other notes' },
]

export function NotesTab({ api }: { api: SheetApi }) {
  const { doc } = api
  const [draft, setDraft] = useState<Notes>(doc.notes)
  const id = doc.identity
  const facts = [['Gender', id.gender], ['Age', id.age], ['Height', id.height], ['Weight', id.weight], ['Eyes', id.eyes], ['Hair', id.hair], ['Skin', id.skin], ['Alignment', id.alignment], ['Faith', id.faith], ['Size', id.size]].filter(([, v]) => v)
  const commit = () => { if (JSON.stringify(draft) !== JSON.stringify(doc.notes)) api.saveNotes(draft) }
  return (
    <div className="flex flex-col gap-4">
      {facts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {facts.map(([k, v]) => <div key={k} className="rounded-xl bg-raised px-3 py-1.5"><Label>{k}</Label><div className="text-sm capitalize">{v}</div></div>)}
        </div>
      )}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
        {NOTE_FIELDS.map(f => (
          <label key={f.key} className="flex flex-col gap-1.5 rounded-xl bg-raised p-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent">{f.label}</span>
            <textarea value={draft[f.key] ?? ''} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))} onBlur={commit} rows={4}
              className="min-h-[96px] resize-y rounded-lg border border-line bg-panel p-2 text-[13px] leading-relaxed text-ink" />
          </label>
        ))}
      </div>
    </div>
  )
}
