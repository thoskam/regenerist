import type { ArmorOptions } from './calculations'

export interface GameplayState {
  weapon?: string
  weaponBonus?: number
  weaponProficient?: boolean
  weaponAbility?: 'auto' | 'str' | 'dex'
  weaponTwoHanded?: boolean
  hitDiceUsed?: number
  tempHp?: number
  deathSuccesses?: number
  deathFailures?: number
  slotsUsed?: Record<string, number>
  concentration?: string | null
  armor?: ArmorOptions['armor']
  shield?: boolean
  acBonus?: number
}

/** Positive delta heals, negative delta damages; temporary HP only absorbs damage. */
export function adjustHitPoints(currentHp: number, maxHp: number, delta: number, state: GameplayState) {
  const damage = Math.max(0, -delta)
  const absorbed = Math.min(state.tempHp || 0, damage)
  const current = Math.max(0, Math.min(maxHp, currentHp + delta + absorbed))
  const massiveDamage = damage > 0 && damage - absorbed - currentHp >= maxHp
  return {
    currentHp: current,
    concentrationDC: damage > 0 && state.concentration ? Math.max(10, Math.floor(damage / 2)) : null,
    massiveDamage,
    gameplayState: {
      ...state, tempHp: (state.tempHp || 0) - absorbed,
      ...(current > 0 ? { deathSuccesses: 0, deathFailures: 0 } : { concentration: null }),
      ...(currentHp === 0 && damage > absorbed ? { deathSuccesses: 0, deathFailures: Math.min(3, (state.deathFailures || 0) + 1) } : {}),
      ...(massiveDamage ? { deathFailures: 3 } : {}),
    },
  }
}

export function resolveDeathSave(currentHp: number, state: GameplayState, natural: number) {
  if (currentHp !== 0 || (state.deathSuccesses || 0) >= 3 || (state.deathFailures || 0) >= 3) throw new Error('Death saves require a dying, unstable character at 0 HP')
  if (!Number.isInteger(natural) || natural < 1 || natural > 20) throw new Error('A death save must be a d20 roll')
  if (natural === 20) return { currentHp: 1, gameplayState: { deathSuccesses: 0, deathFailures: 0 }, message: 'Natural 20: regain 1 HP.' }
  const failures = Math.min(3, (state.deathFailures || 0) + (natural === 1 ? 2 : natural < 10 ? 1 : 0))
  const successes = Math.min(3, (state.deathSuccesses || 0) + (natural >= 10 ? 1 : 0))
  return { currentHp: 0, gameplayState: { deathSuccesses: successes, deathFailures: failures }, message: failures === 3 ? 'Three failures: dead.' : successes === 3 ? 'Three successes: stable at 0 HP.' : natural === 1 ? 'Natural 1: two failures.' : natural >= 10 ? 'Success.' : 'Failure.' }
}
