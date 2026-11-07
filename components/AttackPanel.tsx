'use client'

import { useState } from 'react'
import { calculateWeaponAttack, getWeapon, WEAPONS, isWeaponProficient, rollAttack, rollDamage } from '@/lib/combat'
import { formatModifier } from '@/lib/calculations'
import type { GameplayState } from '@/lib/gameplay'
import type { Life } from '@/lib/types'
import type { HydratedCharacterData } from '@/lib/types/5etools'

const PROPERTY_NAMES: Record<string, string> = { F: 'Finesse', L: 'Light', T: 'Thrown', V: 'Versatile', '2H': 'Two-handed', H: 'Heavy', R: 'Reach', A: 'Ammunition', LD: 'Loading', S: 'Special' }
const DAMAGE_NAMES: Record<string, string> = { B: 'bludgeoning', P: 'piercing', S: 'slashing' }

export default function AttackPanel({ life, state, data, disabled, onSave }: {
  life: Life; state: GameplayState; data: HydratedCharacterData | null; disabled: boolean
  onSave: (patch: Record<string, unknown>) => Promise<unknown>
}) {
  const [mode, setMode] = useState<'normal' | 'advantage' | 'disadvantage'>('normal')
  const [rolls, setRolls] = useState<string[]>([])
  const weapon = getWeapon(state.weapon)
  const result = calculateWeaponAttack({ stats: life.stats, level: life.level, className: life.class, weapon, state,
    proficiencies: data?.classInfo.weaponProficiencies,
    featureNames: [...(data?.classInfo.features || []), ...(data?.subclassInfo?.features || [])].map(f => f.name),
  })
  const save = (patch: Partial<GameplayState>) => onSave({ gameplayState: patch })
  const record = (text: string) => setRolls(prev => [text, ...prev].slice(0, 6))
  const attack = () => {
    const roll = rollAttack(result.attackBonus, mode)
    record(`${weapon.name} attack: ${roll.rolls.join(' / ')} ${formatModifier(result.attackBonus)} = ${roll.total}${roll.critical ? ' — natural 20, critical hit' : roll.miss ? ' — natural 1, miss' : ''}`)
  }
  const damage = (critical: boolean) => {
    const roll = rollDamage(result.damageDice, result.damageBonus, critical)
    record(`${weapon.name}${critical ? ' critical' : ''} damage: ${roll.rolls.length ? `[${roll.rolls.join(', ')}]` : result.damageDice} ${formatModifier(result.damageBonus)} = ${roll.total} ${DAMAGE_NAMES[weapon.dmgType || ''] || ''}`)
  }
  return <fieldset disabled={disabled} className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-4 disabled:opacity-60">
    <legend className="px-2 text-gold-400">Weapon attacks</legend>
    <label className="flex flex-wrap items-center justify-between gap-2 text-sm">Equipped weapon
      <select disabled={!data} value={weapon.name} onChange={e => { setRolls([]); void save({ weapon: e.target.value, weaponTwoHanded: false, weaponAbility: 'auto', weaponBonus: 0, weaponProficient: isWeaponProficient(getWeapon(e.target.value), data?.classInfo.weaponProficiencies || []) }) }} className="max-w-full rounded bg-slate-700 p-2">
        {WEAPONS.map(w => <option key={w.name}>{w.name}</option>)}
      </select>
    </label>
    <p className="text-xs text-slate-400">{(weapon.property || []).map(p => PROPERTY_NAMES[p] || p).join(' · ')}{weapon.range ? ` · Range ${weapon.range} ft` : ''}</p>
    <div className="grid grid-cols-3 gap-2 text-center">
      <div className="rounded bg-slate-700 p-2"><span className="block text-xs text-slate-400">To hit ({result.ability.toUpperCase()})</span><strong className="text-xl">{formatModifier(result.attackBonus)}</strong></div>
      <div className="rounded bg-slate-700 p-2"><span className="block text-xs text-slate-400">Damage</span><strong>{weapon.name === 'Net' ? 'Special' : `${result.damageDice}${formatModifier(result.damageBonus)}`}</strong><span className="block text-xs">{DAMAGE_NAMES[weapon.dmgType || '']}</span></div>
      <div className="rounded bg-slate-700 p-2"><span className="block text-xs text-slate-400">Attacks / action</span><strong className="text-xl">{result.weaponAttacks}</strong></div>
    </div>
    <div className="flex flex-wrap gap-4 text-sm">
      <label className="flex items-center gap-2"><input type="checkbox" checked={result.proficient} onChange={e => save({ weaponProficient: e.target.checked })} />Proficient</label>
      {weapon.dmg2 && <label className="flex items-center gap-2"><input type="checkbox" checked={!!state.weaponTwoHanded} onChange={e => save({ weaponTwoHanded: e.target.checked })} />Use two hands</label>}
      <label className="flex items-center gap-2">Magic bonus<input aria-label="Weapon magic bonus" type="number" min="-5" max="10" value={state.weaponBonus || 0} onChange={e => save({ weaponBonus: Math.trunc(Number(e.target.value) || 0) })} className="w-16 rounded bg-slate-700 p-1" /></label>
      <label className="flex items-center gap-2">Ability<select value={state.weaponAbility || 'auto'} onChange={e => save({ weaponAbility: e.target.value as GameplayState['weaponAbility'] })} className="rounded bg-slate-700 p-1"><option value="auto">Automatic</option><option value="str">Strength override</option><option value="dex">Dexterity override</option></select></label>
    </div>
    {result.twoHands && state.shield && <p role="status" className="text-sm text-amber-300">This attack needs two hands. Unequip your shield in Combat & resources before attacking.</p>}
    {result.weaponAttacks < result.attacks && <p className="text-xs text-amber-300">Your class grants {result.attacks} attacks, but this weapon’s loading or net rule limits this action to one. Resolve any feat exceptions at the table.</p>}
    {weapon.name === 'Net' && <p className="text-xs text-slate-400">Nets restrain eligible targets instead of dealing damage. Resolve target size, disadvantage and escape rules at the table.</p>}
    {weapon.name === 'Lance' && <p className="text-xs text-slate-400">Lance: disadvantage against targets within 5 feet; requires two hands when not mounted.</p>}
    <div className="flex flex-wrap gap-2">
      <select aria-label="Attack roll mode" value={mode} onChange={e => setMode(e.target.value as typeof mode)} className="rounded bg-slate-700 p-2 text-sm"><option value="normal">Normal</option><option value="advantage">Advantage</option><option value="disadvantage">Disadvantage</option></select>
      <button disabled={result.twoHands && state.shield} onClick={attack} className="rounded bg-gold-600 px-3 py-2 text-sm disabled:opacity-40">Roll attack</button>
      {weapon.name !== 'Net' && <><button onClick={() => damage(false)} className="rounded bg-slate-700 px-3 py-2 text-sm">Roll damage</button><button onClick={() => damage(true)} className="rounded bg-slate-700 px-3 py-2 text-sm">Critical damage</button></>}
    </div>
    {rolls.length > 0 && <ol aria-live="polite" className="space-y-1 text-sm text-gold-200">{rolls.map((roll, index) => <li key={`${index}-${roll}`}>{roll}</li>)}</ol>}
    <p className="text-xs text-slate-400">Each click rolls one attack. Range, ammunition, fighting styles, sneak attack and situational bonuses are table checks. Class proficiency is suggested; adjust for racial traits or feats. {result.martialArts ? 'Monk Martial Arts is applied.' : ''}</p>
  </fieldset>
}
