// Play-state transitions (damage, healing, rests) and validation of client-submitted state.

import type { CharacterDoc, PlayState, ResetType } from './types'
import { emptyPlayState } from './types'
import { computeSheet } from './compute'

const CONDITIONS = new Set(['Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious'])
const int = (v: unknown, min: number, max: number, d = 0) => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.trunc(n))) : d
}
const countMap = (v: unknown, keyRe: RegExp): Record<string, number> => {
  const out: Record<string, number> = {}
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const [k, n] of Object.entries(v as Record<string, unknown>).slice(0, 500)) if (keyRe.test(k)) { const x = int(n, 0, 1000); if (x) out[k] = x }
  }
  return out
}

/** Coerce untrusted input into a valid PlayState. */
export function normalizeState(input: unknown): PlayState {
  const s = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const base = emptyPlayState()
  const ds = (s.deathSaves && typeof s.deathSaves === 'object' ? s.deathSaves : {}) as Record<string, unknown>
  return {
    hpRemoved: int(s.hpRemoved, 0, 100000, base.hpRemoved),
    tempHp: int(s.tempHp, 0, 10000, 0),
    deathSaves: { success: int(ds.success, 0, 3), fail: int(ds.fail, 0, 3) },
    inspiration: s.inspiration === true,
    conditions: Array.isArray(s.conditions) ? [...new Set(s.conditions.filter((c): c is string => typeof c === 'string' && CONDITIONS.has(c)))] : [],
    exhaustion: int(s.exhaustion, 0, 10),
    used: countMap(s.used, /^[\w:.-]{1,120}$/),
    slotsUsed: countMap(s.slotsUsed, /^([1-9]|pact)$/),
    hitDiceUsed: countMap(s.hitDiceUsed, /^(6|8|10|12)$/),
    concentration: typeof s.concentration === 'string' ? s.concentration.slice(0, 120) : null,
  }
}

export function applyDamage(doc: CharacterDoc, state: PlayState, amount: number): PlayState {
  const n = Math.max(0, Math.trunc(amount))
  if (!n) return state
  const max = computeSheet(doc, state).hp.max
  const fromTemp = Math.min(state.tempHp, n)
  const rest = n - fromTemp
  const wasDown = state.hpRemoved >= max
  const next = { ...state, tempHp: state.tempHp - fromTemp, hpRemoved: Math.min(max, state.hpRemoved + rest) }
  if (wasDown && rest > 0) next.deathSaves = { ...state.deathSaves, fail: Math.min(3, state.deathSaves.fail + 1) }
  return next
}

export function applyHealing(state: PlayState, amount: number): PlayState {
  const n = Math.max(0, Math.trunc(amount))
  if (!n) return state
  return { ...state, hpRemoved: Math.max(0, state.hpRemoved - n), deathSaves: { success: 0, fail: 0 } }
}

/** Temporary HP don't stack; the new value replaces the old one. */
export function setTempHp(state: PlayState, amount: number): PlayState {
  return { ...state, tempHp: Math.max(0, Math.trunc(amount)) }
}

function resetUses(doc: CharacterDoc, state: PlayState, resets: ResetType[]): Record<string, number> {
  const keys = new Set<string>()
  const add = (u?: { key: string; reset: ResetType }) => { if (u && resets.includes(u.reset)) keys.add(u.key) }
  doc.features.forEach(f => add(f.uses))
  doc.actions.forEach(a => add(a.uses))
  doc.inventory.forEach(i => add(i.uses))
  doc.spellSources.forEach(s => s.spells.forEach(sp => add(sp.uses)))
  return Object.fromEntries(Object.entries(state.used).filter(([k]) => !keys.has(k)))
}

export function shortRest(doc: CharacterDoc, state: PlayState): PlayState {
  const slotsUsed = { ...state.slotsUsed }
  delete slotsUsed.pact
  return { ...state, used: resetUses(doc, state, ['short']), slotsUsed }
}

/** Long rest: full HP, spell slots, short/long/dawn uses, half hit dice back, one exhaustion level removed. */
export function longRest(doc: CharacterDoc, state: PlayState): PlayState {
  const hitDiceUsed: Record<string, number> = {}
  const totals = new Map<number, number>()
  for (const c of doc.classes) totals.set(c.hitDie, (totals.get(c.hitDie) || 0) + c.level)
  let regain = Math.max(1, Math.floor(doc.classes.reduce((a, c) => a + c.level, 0) / 2))
  for (const [die] of [...totals].sort((a, b) => b[0] - a[0])) {
    const used = state.hitDiceUsed[String(die)] || 0
    const back = Math.min(used, regain)
    regain -= back
    if (used - back) hitDiceUsed[String(die)] = used - back
  }
  return {
    ...state, hpRemoved: 0, tempHp: 0, deathSaves: { success: 0, fail: 0 }, slotsUsed: {}, hitDiceUsed,
    used: resetUses(doc, state, ['short', 'long', 'dawn']), exhaustion: Math.max(0, state.exhaustion - 1),
  }
}
