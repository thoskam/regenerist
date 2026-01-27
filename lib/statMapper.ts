export type StatName = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export interface Stats {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]

const STAT_PRIORITY: Record<string, StatName[]> = {
  Artificer: ['int', 'con', 'dex', 'wis', 'cha', 'str'],
  Barbarian: ['str', 'con', 'dex', 'wis', 'cha', 'int'],
  Bard: ['cha', 'dex', 'con', 'wis', 'int', 'str'],
  Cleric: ['wis', 'con', 'str', 'cha', 'dex', 'int'],
  Druid: ['wis', 'con', 'dex', 'int', 'cha', 'str'],
  Fighter: ['str', 'con', 'dex', 'wis', 'cha', 'int'],
  Monk: ['dex', 'wis', 'con', 'str', 'cha', 'int'],
  Paladin: ['str', 'cha', 'con', 'wis', 'dex', 'int'],
  Ranger: ['dex', 'wis', 'con', 'int', 'str', 'cha'],
  Rogue: ['dex', 'con', 'int', 'wis', 'cha', 'str'],
  Sorcerer: ['cha', 'con', 'dex', 'wis', 'int', 'str'],
  Warlock: ['cha', 'con', 'dex', 'wis', 'int', 'str'],
  Wizard: ['int', 'con', 'dex', 'wis', 'cha', 'str'],
  'Blood Hunter': ['str', 'con', 'int', 'dex', 'wis', 'cha'],
}

export function mapStatsForClass(className: string): Stats {
  const priority = STAT_PRIORITY[className] || STAT_PRIORITY.Fighter

  const stats: Stats = {
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
  }

  priority.forEach((stat, index) => {
    stats[stat] = STANDARD_ARRAY[index]
  })

  return stats
}

export function getStatModifier(stat: number): number {
  return Math.floor((stat - 10) / 2)
}
