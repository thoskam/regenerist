'use client'

import { useState } from 'react'
import { Life, Stats } from '@/lib/types'
import { ARMOR, formatModifier, getHitDie } from '@/lib/calculations'
import { getSpellSlotInfo } from '@/lib/spellSlots'
import { HydratedCharacterData } from '@/lib/types/5etools'

import { completeRest, spendHitDie } from '@/lib/rest'
import { randomDie } from '@/lib/combat'
import { GameplayState, resolveDeathSave } from '@/lib/gameplay'

export default function GameplayTracker({ life, state, data, disabled, onSave }: {
  life: Life; state: GameplayState; data: HydratedCharacterData | null; disabled: boolean
  onSave: (patch: Record<string, unknown>) => Promise<unknown>
}) {
  const [restNotice, setRestNotice] = useState<string | null>(null)
  const [tempAmount, setTempAmount] = useState(1)
  const [concentration, setConcentration] = useState('')
  const modifier = Math.floor(((life.stats[data?.spellcastingAbility as keyof Stats] ?? 10) - 10) / 2)
  const info = getSpellSlotInfo(life.class, life.subclass, life.level, modifier)
  const update = (patch: GameplayState) => onSave({ gameplayState: patch })
  const rest = (long: boolean) => {
    if (long && life.currentHp === 0) return
    if (!confirm(`${long ? 'Long' : 'Short'} rest completed? ${long ? 'Restore HP and spell slots; clear temporary HP, concentration and death saves.' : info.pactMagic ? 'Restore pact magic slots.' : 'Use Spend hit die below to recover HP during this rest.'}`)) return
    void onSave(completeRest(life, state, long))
  }
  return <fieldset disabled={disabled} className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-4 disabled:opacity-60">
    <legend className="px-2 text-gold-400">Combat & resources</legend>
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm">Temporary HP: <strong>{state.tempHp || 0}</strong></span>
      <input aria-label="Temporary HP amount" type="number" min="0" value={tempAmount} onChange={e => setTempAmount(Math.max(0, Math.trunc(Number(e.target.value) || 0)))} className="w-16 rounded bg-slate-700 p-2" />
      <button className="rounded bg-slate-700 px-3 py-2 text-sm" onClick={() => update({ tempHp: Math.max(state.tempHp || 0, tempAmount) })}>Grant</button>
      <button className="text-sm text-slate-400" onClick={() => update({ tempHp: 0 })}>Clear</button>
    </div>
    <p className="text-xs text-slate-400">Temporary HP absorbs damage first and does not stack.</p>
    {life.currentHp === 0 && <div className="space-y-2">
      <button disabled={(state.deathSuccesses || 0) >= 3 || (state.deathFailures || 0) >= 3} className="rounded bg-slate-700 px-3 py-2 text-sm disabled:opacity-40" onClick={() => {
        const natural = randomDie(20)
        const result = resolveDeathSave(life.currentHp, state, natural)
        void onSave({ currentHp: result.currentHp, gameplayState: result.gameplayState }).then(saved => { if (saved !== false) setRestNotice(`Death save ${natural}: ${result.message}`) })
      }}>Roll death save</button>
      {(['deathSuccesses', 'deathFailures'] as const).map(key => <label key={key} className="flex items-center justify-between text-sm">
        {key === 'deathSuccesses' ? 'Death save successes' : 'Death save failures'}
        <select aria-label={key === 'deathSuccesses' ? 'Death save successes' : 'Death save failures'} value={state[key] || 0} onChange={e => update({ [key]: Number(e.target.value) })} className="rounded bg-slate-700 p-2">
          {[0, 1, 2, 3].map(n => <option key={n}>{n}</option>)}
        </select>
      </label>)}
      {(state.deathFailures || 0) >= 3 ? <p className="text-red-300">Three failures: dead. Resolve regeneration with your DM.</p> : (state.deathSuccesses || 0) >= 3 ? <p className="text-green-300">Stable at 0 HP.</p> : null}
    </div>}
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Equipment</h3>
      <label className="flex justify-between items-center text-sm">Armor
        <select value={state.armor || 'none'} onChange={e => update({ armor: e.target.value as keyof typeof ARMOR })} className="rounded bg-slate-700 p-2">
          {Object.keys(ARMOR).map(armor => <option key={armor} value={armor}>{armor}</option>)}
        </select>
      </label>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={!!state.shield} onChange={e => update({ shield: e.target.checked })} /> Shield (+2 AC)</label>
      <label className="flex justify-between items-center text-sm">Other AC bonus<input aria-label="Other armor class bonus" type="number" min="-10" max="20" value={state.acBonus || 0} onChange={e => update({ acBonus: Math.trunc(Number(e.target.value) || 0) })} className="w-16 rounded bg-slate-700 p-2" /></label>
      <p className="text-xs text-slate-400">Armor proficiency, Strength requirements and stealth penalties remain table checks.</p>
    </div>
    {data?.classInfo && <div>
      <h3 className="text-sm font-semibold mb-2">Saving throws</h3>
      <div className="grid grid-cols-3 gap-2">{Object.entries(life.stats).map(([ability, score]) => {
        const proficient = data.classInfo.savingThrows.some(save => save.toLowerCase() === ability || save.toLowerCase().startsWith(ability))
        const bonus = Math.floor((score - 10) / 2) + (proficient ? Math.ceil(life.level / 4) + 1 : 0)
        return <div key={ability} className={`rounded bg-slate-700 p-2 text-center text-sm ${proficient ? 'text-gold-400' : ''}`}>{ability.toUpperCase()} {formatModifier(bonus)}</div>
      })}</div>
    </div>}
    {data?.isSpellcaster && <p className="text-xs text-slate-400">Spell selection guidance: {info.cantripsKnown} class cantrips{info.spellsKnown !== null ? `, ${info.spellsKnown} spells known` : ''}{info.spellsPrepared !== null ? `, ${info.spellsPrepared} spells prepared` : ''}. Bonus spells and subclass exceptions may add to these totals.</p>}
    {info.slots.some(Boolean) && <div className="space-y-2">
      <h3 className="text-sm font-semibold">{info.pactMagic ? 'Pact magic slots' : 'Spell slots'}</h3>
      {info.slots.map((max, i) => max > 0 && <label key={i} className="flex items-center justify-between text-sm">
        Level {i + 1} · {max - Math.min(max, state.slotsUsed?.[i + 1] || 0)} / {max} remaining
        <select aria-label={`Level ${i + 1} slots spent`} value={Math.min(max, state.slotsUsed?.[i + 1] || 0)} onChange={e => update({ slotsUsed: { ...state.slotsUsed, [i + 1]: Number(e.target.value) } })} className="rounded bg-slate-700 p-2">
          {Array.from({ length: max + 1 }, (_, n) => <option key={n} value={n}>{n} spent</option>)}
        </select>
      </label>)}
      <p className="text-xs text-slate-400">Mark a slot spent when casting; cantrips do not use slots. {info.mysticArcanum.length > 0 && `Mystic Arcanum levels ${info.mysticArcanum.join(', ')} are separate once-per-long-rest uses; track these at the table.`}</p>
    </div>}
    {data?.isSpellcaster && <div className="space-y-2">
      <h3 className="text-sm font-semibold">Concentration: {state.concentration || 'None'}</h3>
      <div className="flex gap-2"><input aria-label="Concentration spell" placeholder="Spell name" value={concentration} onChange={e => setConcentration(e.target.value)} className="min-w-0 flex-1 rounded bg-slate-700 p-2 text-sm" />
        <button className="text-sm text-gold-400" disabled={!concentration.trim()} onClick={() => update({ concentration: concentration.trim() })}>Set</button>
        <button className="text-sm text-slate-400" onClick={() => update({ concentration: null })}>End</button></div>
    </div>}
    <div className="space-y-2">
      <p className="text-sm">Hit dice: {Math.max(0, life.level - (state.hitDiceUsed || 0))} / {life.level} d{getHitDie(life.class)} remaining</p>
      <button disabled={life.currentHp === 0 || (state.hitDiceUsed || 0) >= life.level} className="rounded bg-slate-700 px-3 py-2 text-sm disabled:opacity-40" onClick={() => {
        const roll = randomDie(getHitDie(life.class))
        const patch = spendHitDie(life, state, roll)
        void onSave(patch).then(saved => { if (saved !== false) setRestNotice(`Hit die rolled ${roll}; recovered ${patch.currentHp - life.currentHp} HP.`) })
      }}>Spend hit die during short rest</button>
      {restNotice && <p role="status" className="text-xs text-gold-200">{restNotice}</p>}
      <p className="text-xs text-slate-400">A long rest regains up to half your total hit dice (minimum one).</p>
    </div>
    <div className="flex gap-2"><button onClick={() => rest(false)} className="rounded bg-slate-700 px-3 py-2 text-sm">Short rest</button><button disabled={life.currentHp === 0} title={life.currentHp === 0 ? 'A long rest requires at least 1 HP at its start' : undefined} onClick={() => rest(true)} className="rounded bg-gold-600 px-3 py-2 text-sm disabled:opacity-40">Long rest</button></div>
  </fieldset>
}
