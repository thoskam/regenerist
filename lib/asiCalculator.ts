import { Stats, StatName, STAT_PRIORITY } from './statMapper'

// ASI levels for each class
// Default: 4, 8, 12, 16, 19
// Fighter: extra ASIs at 6, 14
// Rogue: extra ASI at 10
const ASI_LEVELS: Record<string, number[]> = {
  default: [4, 8, 12, 16, 19],
  Fighter: [4, 6, 8, 12, 14, 16, 19],
  Rogue: [4, 8, 10, 12, 16, 19],
}

export function getASILevels(className: string): number[] {
  return ASI_LEVELS[className] || ASI_LEVELS.default
}

export function getASICount(className: string, level: number): number {
  const levels = getASILevels(className)
  return levels.filter(l => l <= level).length
}

export function applyASIs(
  baseStats: Stats,
  className: string,
  level: number
): Stats {
  const asiCount = getASICount(className, level)
  if (asiCount === 0) {
    return { ...baseStats }
  }

  const stats = { ...baseStats }
  const statPriority = STAT_PRIORITY[className] || STAT_PRIORITY.Fighter

  // Spend both points, including a split when the primary score is 19.
  for (let i = 0; i < asiCount * 2; i++) {
    const stat = statPriority.find(stat => stats[stat] < 20)
    if (!stat) break
    stats[stat] += 1
  }

  return stats
}

export function getStatDifference(baseStats: Stats, finalStats: Stats): Partial<Record<StatName, number>> {
  const diff: Partial<Record<StatName, number>> = {}
  const statNames: StatName[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

  for (const stat of statNames) {
    const difference = finalStats[stat] - baseStats[stat]
    if (difference > 0) {
      diff[stat] = difference
    }
  }

  return diff
}
