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

  // Each ASI gives +2 to one stat (capped at 20)
  // Apply to highest priority stat that's under 20
  for (let i = 0; i < asiCount; i++) {
    let applied = false

    // Try to apply +2 to highest priority stat under 20
    for (const stat of statPriority) {
      if (stats[stat] <= 18) {
        stats[stat] = Math.min(20, stats[stat] + 2)
        applied = true
        break
      }
    }

    // If all primary stats are 19+, try to bump any stat under 20
    if (!applied) {
      for (const stat of statPriority) {
        if (stats[stat] < 20) {
          stats[stat] = Math.min(20, stats[stat] + 2)
          break
        }
      }
    }
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
