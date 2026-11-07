'use client'

import { useState } from 'react'
import { CONDITION_TEXT, CONDITION_NAMES } from '@/lib/sheet/conditions'
import type { SheetApi } from './useSheet'
import { Card, Label, cx } from './ui'

export function HitPointsCard({ api, damage, heal, temp }: { api: SheetApi; damage: (n: number) => void; heal: (n: number) => void; temp: (n: number) => void }) {
  const { sheet, state, setState, rollCheck } = api
  const [amt, setAmt] = useState('')
  const n = parseInt(amt, 10)
  const valid = Number.isFinite(n) && n > 0
  const pct = Math.max(0, Math.min(100, Math.round((sheet.hp.current / sheet.hp.max) * 100)))
  const color = pct > 50 ? 'var(--good)' : pct > 25 ? 'var(--accent)' : 'var(--bad)'
  const down = sheet.hp.current === 0
  const act = (f: (n: number) => void) => { if (valid) { f(n); setAmt('') } }
  const ds = state.deathSaves
  const setDs = (k: 'success' | 'fail', v: number) => setState(s => ({ ...s, deathSaves: { ...s.deathSaves, [k]: v } }))

  return (
    <div className="flex flex-[2.4_1_300px] flex-col gap-2 rounded-2xl border border-line bg-panel px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <Label>Hit Points</Label>
        <span className="text-xs text-muted">Temp <strong className="text-ink">{sheet.hp.temp || '—'}</strong></span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={cx('text-[32px] font-semibold leading-none', down && 'text-bad')}>{sheet.hp.current}</span>
        <span className="text-base text-muted">/ {sheet.hp.max}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded bg-raised"><div className="h-1.5 transition-[width]" style={{ width: `${pct}%`, background: color }} /></div>
      <form className="flex gap-1.5" onSubmit={e => { e.preventDefault(); act(damage) }}>
        <label htmlFor="hp-amount" className="sr-only">Amount</label>
        <input id="hp-amount" inputMode="numeric" placeholder="Amt" value={amt} onChange={e => setAmt(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
          className="min-h-[38px] w-16 rounded-[9px] border border-line bg-raised px-2.5 text-sm font-semibold text-ink placeholder:text-muted" />
        <button type="button" disabled={!valid} onClick={() => act(heal)} className="min-h-[38px] flex-1 rounded-[9px] border border-line bg-raised text-[13px] font-semibold text-good disabled:opacity-50">Heal</button>
        <button type="submit" disabled={!valid} className="min-h-[38px] flex-1 rounded-[9px] border border-line bg-raised text-[13px] font-semibold text-bad disabled:opacity-50">Damage</button>
        <button type="button" disabled={!valid} onClick={() => act(temp)} className="min-h-[38px] flex-1 rounded-[9px] border border-line bg-raised text-[13px] font-semibold disabled:opacity-50">Temp</button>
      </form>
      {down && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-raised p-2.5">
          <button type="button" onClick={() => {
            const r = rollCheck('Death saving throw', 0)
            setState(s => {
              if (r.natural === 20) return { ...s, hpRemoved: Math.max(0, s.hpRemoved - 1), deathSaves: { success: 0, fail: 0 } }
              if (r.natural === 1) return { ...s, deathSaves: { ...s.deathSaves, fail: Math.min(3, s.deathSaves.fail + 2) } }
              return r.total >= 10 ? { ...s, deathSaves: { ...s.deathSaves, success: Math.min(3, s.deathSaves.success + 1) } } : { ...s, deathSaves: { ...s.deathSaves, fail: Math.min(3, s.deathSaves.fail + 1) } }
            })
          }} className="min-h-[36px] rounded-[9px] border border-accent bg-accent-soft px-3 text-[13px] font-semibold">Roll death save</button>
          {(['success', 'fail'] as const).map(k => (
            <div key={k} className="flex items-center gap-1.5" role="group" aria-label={`Death save ${k === 'success' ? 'successes' : 'failures'}`}>
              <span className="text-xs text-muted">{k === 'success' ? 'Saves' : 'Fails'}</span>
              {[0, 1, 2].map(i => (
                <button key={i} type="button" aria-label={`${k} ${i + 1}`} aria-pressed={i < ds[k]} onClick={() => setDs(k, i < ds[k] ? i : i + 1)}
                  className={cx('h-5 w-5 rounded-full border-2', k === 'success' ? 'border-good' : 'border-bad', i < ds[k] && (k === 'success' ? 'bg-good' : 'bg-bad'))} />
              ))}
            </div>
          ))}
          {ds.success >= 3 && <span className="text-xs font-semibold text-good">Stable</span>}
          {ds.fail >= 3 && <span className="text-xs font-semibold text-bad">Dead</span>}
        </div>
      )}
    </div>
  )
}

export function ConditionsCard({ api }: { api: SheetApi }) {
  const { sheet, state, setState } = api
  const [open, setOpen] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  const toggle = (c: string) => setState(s => ({ ...s, conditions: s.conditions.includes(c) ? s.conditions.filter(x => x !== c) : [...s.conditions, c] }))
  const d = sheet.defenses
  const defenseText = [
    d.resistances.length ? `Resistant: ${d.resistances.join(', ')}` : '',
    d.immunities.length ? `Immune: ${d.immunities.join(', ')}` : '',
    d.vulnerabilities.length ? `Vulnerable: ${d.vulnerabilities.join(', ')}` : '',
    d.conditionImmunities.length ? `Can't be: ${d.conditionImmunities.join(', ')}` : '',
  ].filter(Boolean)
  return (
    <Card className="flex flex-col gap-3 px-4 py-3.5">
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-[1_1_160px] flex-col gap-1">
          <Label>Defenses</Label>
          {defenseText.length ? defenseText.map(t => <span key={t}>{t}</span>) : <span className="text-muted">None</span>}
        </div>
        <div className="flex flex-[2_1_220px] flex-col gap-1.5">
          <Label>Conditions</Label>
          <div className="flex flex-wrap items-center gap-1.5">
            {state.conditions.map(c => (
              <span key={c} className="flex items-center gap-1 rounded-full border border-accent bg-accent-soft py-0.5 pl-2.5 pr-1 text-[13px] font-semibold">
                <button type="button" onClick={() => setInfo(info === c ? null : c)} aria-expanded={info === c}>{c}</button>
                <button type="button" aria-label={`Remove ${c}`} onClick={() => toggle(c)} className="flex h-6 w-6 items-center justify-center rounded-full">×</button>
              </span>
            ))}
            {state.exhaustion > 0 && <span className="rounded-full border border-bad px-2.5 py-0.5 text-[13px] font-semibold text-bad">Exhaustion {state.exhaustion}</span>}
            <button type="button" aria-expanded={open} onClick={() => setOpen(o => !o)} className="min-h-[32px] rounded-lg border border-dashed border-line px-3 text-[13px] text-muted">{open ? 'Done' : '+ Conditions'}</button>
          </div>
        </div>
        <div className="flex flex-[1_1_120px] flex-col gap-1">
          <Label>Attunement</Label>
          <span><strong>{sheet.inventory.attuned}</strong> of {sheet.inventory.attuneMax} slots</span>
        </div>
      </div>
      {info && CONDITION_TEXT[info] && <p className="m-0 whitespace-pre-line rounded-xl bg-raised p-3 text-[13px] text-muted">{CONDITION_TEXT[info]}</p>}
      {open && (
        <div className="pop flex flex-col gap-3 rounded-xl bg-raised p-3">
          <div className="flex flex-wrap gap-1.5">
            {CONDITION_NAMES.map(c => (
              <button key={c} type="button" aria-pressed={state.conditions.includes(c)} onClick={() => toggle(c)}
                className={cx('min-h-[34px] rounded-full border px-3 text-[13px] font-semibold', state.conditions.includes(c) ? 'border-accent bg-accent text-on-accent' : 'border-line')}>{c}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-muted">Exhaustion</span>
            {[0, 1, 2, 3, 4, 5, 6].map(l => (
              <button key={l} type="button" aria-pressed={state.exhaustion === l} onClick={() => setState(s => ({ ...s, exhaustion: l }))}
                className={cx('h-8 w-8 rounded-lg border text-[13px] font-semibold', state.exhaustion === l ? 'border-accent bg-accent text-on-accent' : 'border-line')}>{l}</button>
            ))}
          </div>
          {state.exhaustion > 0 && CONDITION_TEXT[api.doc.edition === '2024' ? 'Exhaustion (2024)' : 'Exhaustion (2014)'] && (
            <p className="m-0 whitespace-pre-line text-[13px] text-muted">{CONDITION_TEXT[api.doc.edition === '2024' ? 'Exhaustion (2024)' : 'Exhaustion (2014)']}</p>
          )}
        </div>
      )}
    </Card>
  )
}
