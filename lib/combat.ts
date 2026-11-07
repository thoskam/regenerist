import weaponData from './data/weapons2014.json'
import { calculateProficiencyBonus } from './calculations'
import type { Stats } from './types'
import type { GameplayState } from './gameplay'

export interface Weapon {
  name: string; type: string; weaponCategory: string; property?: string[]
  range?: string; dmg1?: string; dmg2?: string; dmgType?: string
}
// 2014 PHB/SRD weapon facts from the project's bundled items-base.json.
export const WEAPONS: Weapon[] = [
  { name: 'Unarmed strike', type: 'M', weaponCategory: 'unarmed', dmg1: '1', dmgType: 'B' },
  ...weaponData,
]
export function getWeapon(name?: string): Weapon {
  return WEAPONS.find(w => w.name === name) || WEAPONS[0]
}
export function isWeaponProficient(weapon: Weapon, proficiencies: string[]): boolean {
  if (weapon.weaponCategory === 'unarmed') return true
  return proficiencies.some(p => {
    const entry = p.toLowerCase().replace(/weapons?/g, '').trim()
    return entry === weapon.weaponCategory || entry === weapon.name.toLowerCase() || entry === `${weapon.name.toLowerCase()}s`
  })
}
export function getAttacksPerAction(className: string, level: number, featureNames: string[] = []): number {
  if (className === 'Fighter') return level >= 20 ? 4 : level >= 11 ? 3 : level >= 5 ? 2 : 1
  if (['Barbarian', 'Monk', 'Paladin', 'Ranger'].includes(className) && level >= 5) return 2
  // Hydrated features are already restricted to the character's actual class/subclass level.
  return featureNames.some(name => /^Extra Attack(?:\b|$)/i.test(name)) ? 2 : 1
}
export function calculateWeaponAttack({ stats, level, className, weapon, state, proficiencies = [], featureNames = [] }: {
  stats: Stats; level: number; className: string; weapon: Weapon; state: GameplayState
  proficiencies?: string[]; featureNames?: string[]
}) {
  const properties = weapon.property || []
  const monkWeapon = weapon.weaponCategory === 'unarmed' || weapon.name === 'Shortsword' ||
    (weapon.weaponCategory === 'simple' && weapon.type === 'M' && !properties.includes('2H') && !properties.includes('H'))
  const martialArts = className === 'Monk' && !state.shield && (!state.armor || state.armor === 'none') && monkWeapon
  const str = Math.floor((stats.str - 10) / 2)
  const dex = Math.floor((stats.dex - 10) / 2)
  const autoAbility = properties.includes('F') || martialArts ? (dex > str ? 'dex' : 'str') : weapon.type === 'R' ? 'dex' : 'str'
  const ability = state.weaponAbility && state.weaponAbility !== 'auto' ? state.weaponAbility : autoAbility
  const abilityModifier = ability === 'dex' ? dex : str
  const proficient = state.weaponProficient ?? isWeaponProficient(weapon, proficiencies)
  const bonus = state.weaponBonus || 0
  let damageDice = state.weaponTwoHanded && weapon.dmg2 ? weapon.dmg2 : weapon.dmg1 || '0'
  if (martialArts) {
    const die = level >= 17 ? 10 : level >= 11 ? 8 : level >= 5 ? 6 : 4
    const match = /^(\d+)d(\d+)$/.exec(damageDice)
    const average = match ? Number(match[1]) * (Number(match[2]) + 1) / 2 : Number(damageDice)
    if ((die + 1) / 2 > average) damageDice = `1d${die}`
  }
  const attacks = getAttacksPerAction(className, level, featureNames)
  return {
    ability, proficient, attackBonus: abilityModifier + bonus + (proficient ? calculateProficiencyBonus(level) : 0),
    damageDice, damageBonus: weapon.name === 'Net' ? 0 : abilityModifier + bonus,
    attacks, weaponAttacks: weapon.name === 'Net' || properties.includes('LD') ? 1 : attacks,
    twoHands: properties.includes('2H') || !!(state.weaponTwoHanded && weapon.dmg2),
    martialArts,
  }
}

export function rollAttack(bonus: number, mode: 'normal' | 'advantage' | 'disadvantage', die: (sides: number) => number = randomDie) {
  const rolls = [die(20)]
  if (mode !== 'normal') rolls.push(die(20))
  const natural = mode === 'advantage' ? Math.max(...rolls) : mode === 'disadvantage' ? Math.min(...rolls) : rolls[0]
  return { rolls, natural, total: natural + bonus, critical: natural === 20, miss: natural === 1 }
}
export function rollDamage(dice: string, bonus: number, critical = false, die: (sides: number) => number = randomDie) {
  const match = /^(\d+)d(\d+)$/.exec(dice)
  const rolls = match ? Array.from({ length: Number(match[1]) * (critical ? 2 : 1) }, () => die(Number(match[2]))) : []
  return { rolls, total: Math.max(0, (match ? rolls.reduce((a, b) => a + b, 0) : Number(dice)) + bonus) }
}
export function randomDie(sides: number): number {
  // Rejection sampling avoids modulo bias and uses the browser's random source.
  const max = Math.floor(0x100000000 / sides) * sides
  const bytes = new Uint32Array(1)
  do { globalThis.crypto.getRandomValues(bytes) } while (bytes[0] >= max)
  return bytes[0] % sides + 1
}
