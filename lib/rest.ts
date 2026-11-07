import { getHitDie } from './calculations'
import { GameplayState } from './gameplay'

interface RestLife { class: string; level: number; currentHp: number; maxHp: number; stats: { con: number } }
/** 2014 single-class rest resources; feature-specific recoveries remain explicit table choices. */
export function completeRest(life: RestLife, state: GameplayState, long: boolean) {
  if (long && life.currentHp < 1) throw new Error('A long rest requires at least 1 HP at its start')
  const used = Math.min(life.level, Math.max(0, state.hitDiceUsed || 0))
  return {
    ...(long ? { currentHp: life.maxHp } : {}),
    gameplayState: {
      ...state,
      ...(long || life.class === 'Warlock' ? { slotsUsed: {} } : {}),
      ...(long ? { tempHp: 0, deathSuccesses: 0, deathFailures: 0, concentration: null, hitDiceUsed: Math.max(0, used - Math.max(1, Math.floor(life.level / 2))) } : {}),
    },
  }
}
export function spendHitDie(life: RestLife, state: GameplayState, roll: number) {
  const used = state.hitDiceUsed || 0
  const die = getHitDie(life.class)
  if (used >= life.level) throw new Error('No hit dice remaining')
  if (life.currentHp === 0) throw new Error('Resolve unconsciousness before spending hit dice')
  if (!Number.isInteger(roll) || roll < 1 || roll > die) throw new Error(`Enter a d${die} roll between 1 and ${die}`)
  const healing = Math.max(0, roll + Math.floor((life.stats.con - 10) / 2))
  return { currentHp: Math.min(life.maxHp, life.currentHp + healing), gameplayState: { ...state, hitDiceUsed: used + 1 } }
}
