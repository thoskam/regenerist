import { Stats, getStatModifier } from './statMapper'

const HIT_DICE: Record<string, number> = {
  Barbarian: 12,
  Fighter: 10,
  Paladin: 10,
  Ranger: 10,
  Artificer: 8,
  Bard: 8,
  Cleric: 8,
  Druid: 8,
  Monk: 8,
  Rogue: 8,
  Warlock: 8,
  'Blood Hunter': 8,
  Sorcerer: 6,
  Wizard: 6,
}

export function getHitDie(className: string): number {
  return HIT_DICE[className] || 8
}

export function calculateMaxHp(className: string, level: number, conMod: number, options: {race?: string; subclass?: string} = {}): number {
  level = Math.max(1, Math.min(20, Math.floor(level) || 1))
  const hitDie = getHitDie(className)
  const avgRoll = Math.floor(hitDie / 2) + 1

  // Level 1: max hit die + CON mod
  // Levels 2+: avg roll + CON mod per level
  const level1Hp = hitDie + conMod
  const subsequentLevelsHp = (level - 1) * Math.max(1, avgRoll + conMod)

  const perLevelBonus = (options.race === 'Dwarf (Hill)' ? 1 : 0) + (className === 'Sorcerer' && options.subclass === 'Draconic Bloodline' ? 1 : 0)
  return Math.max(1, level1Hp + subsequentLevelsHp) + level * perLevelBonus
}

export function calculateProficiencyBonus(level: number): number {
  return Math.ceil(Math.max(1, Math.min(20, Math.floor(level) || 1)) / 4) + 1
}

export const ARMOR = {
  none: [10, Infinity], padded: [11, Infinity], leather: [11, Infinity],
  'studded leather': [12, Infinity], hide: [12, 2], 'chain shirt': [13, 2],
  'scale mail': [14, 2], breastplate: [14, 2], 'half plate': [15, 2],
  'ring mail': [14, 0], 'chain mail': [16, 0], splint: [17, 0], plate: [18, 0],
} as const
export interface ArmorOptions { armor?: keyof typeof ARMOR; shield?: boolean; bonus?: number; race?: string; subclass?: string }
export function calculateAC(stats: Stats, className: string, options: ArmorOptions = {}): number {
  const dex = getStatModifier(stats.dex)
  const armor = options.armor || 'none'
  const [base, cap] = ARMOR[armor] || ARMOR.none
  const heavy = ['ring mail', 'chain mail', 'splint', 'plate'].includes(armor)
  let ac = base + (heavy ? 0 : Math.min(dex, cap))
  if (options.race === 'Tortle') ac = 17
  if (armor === 'none') {
    if (className === 'Sorcerer' && options.subclass === 'Draconic Bloodline') ac = Math.max(ac, 13 + dex)
    if (options.race === 'Lizardfolk') ac = Math.max(ac, 13 + dex)
    if (className === 'Barbarian') ac = Math.max(ac, 10 + dex + getStatModifier(stats.con))
    if (className === 'Monk' && !options.shield) ac = Math.max(ac, 10 + dex + getStatModifier(stats.wis))
  }
  return ac + (options.shield ? 2 : 0) + (options.bonus || 0)
}

export function calculateInitiative(stats: Stats): number {
  return getStatModifier(stats.dex)
}

export function calculateSpeed(race: string, className?: string, level = 1, options: ArmorOptions & { strength?: number } = {}): number {
  let speed = 30
  if (/^(Dwarf|Gnome|Halfling)( \(|$)/.test(race)) speed = 25
  if (race === 'Elf (Wood)' || race === 'Satyr') speed = 35
  if (race === 'Centaur') speed = 40
  if (race === 'Aarakocra') speed = 25
  const armor = options.armor || 'none'
  const heavy = ['ring mail', 'chain mail', 'splint', 'plate'].includes(armor)
  const requiredStrength = armor === 'chain mail' ? 13 : ['splint', 'plate'].includes(armor) ? 15 : 0
  if (!race.startsWith('Dwarf') && options.strength !== undefined && options.strength < requiredStrength) speed -= 10
  if (className === 'Monk' && level >= 2 && armor === 'none' && !options.shield) speed += 10 + Math.floor((level - 2) / 4) * 5
  if (className === 'Barbarian' && level >= 5 && !heavy) speed += 10
  return speed
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}
