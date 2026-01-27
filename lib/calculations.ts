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

export function calculateMaxHp(className: string, level: number, conMod: number): number {
  const hitDie = getHitDie(className)
  const avgRoll = Math.floor(hitDie / 2) + 1

  // Level 1: max hit die + CON mod
  // Levels 2+: avg roll + CON mod per level
  const level1Hp = hitDie + conMod
  const subsequentLevelsHp = (level - 1) * (avgRoll + conMod)

  return Math.max(1, level1Hp + subsequentLevelsHp)
}

export function calculateProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1
}

export function calculateAC(stats: Stats, className: string): number {
  const dexMod = getStatModifier(stats.dex)
  const conMod = getStatModifier(stats.con)
  const wisMod = getStatModifier(stats.wis)

  // Barbarian Unarmored Defense: 10 + DEX + CON
  if (className === 'Barbarian') {
    return 10 + dexMod + conMod
  }

  // Monk Unarmored Defense: 10 + DEX + WIS
  if (className === 'Monk') {
    return 10 + dexMod + wisMod
  }

  // Default: 10 + DEX (assumes light/no armor)
  return 10 + dexMod
}

export function calculateInitiative(stats: Stats): number {
  return getStatModifier(stats.dex)
}

export function calculateSpeed(race: string): number {
  const slowRaces = ['Dwarf (Hill)', 'Dwarf (Mountain)', 'Gnome (Forest)', 'Gnome (Rock)', 'Gnome (Deep)', 'Halfling (Lightfoot)', 'Halfling (Stout)']
  const fastRaces = ['Aarakocra', 'Centaur', 'Tabaxi', 'Harengon']

  if (slowRaces.includes(race)) return 25
  if (fastRaces.includes(race)) return 35
  return 30
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}
