'use client'

import { useState, useEffect } from 'react'
import { Stats } from '@/lib/statMapper'

interface PointBuyCalculatorProps {
  onStatsChange: (stats: Stats) => void
  initialStats?: Stats
  level?: number  // Character level - adds bonus points at ASI levels
}

// Point costs: 8 starts at 8, cost matrix is how many points to increase by 1
const POINT_COSTS: Record<number, number> = {
  8: 0,  // baseline
  9: 1,
  10: 1,
  11: 1,
  12: 1,
  13: 1,
  14: 2,
  15: 2,
  16: 2,  // Extended for ASI points
  17: 2,
  18: 2,
  19: 2,
  20: 2,
}

const BASE_POINTS = 27
const MIN_STAT = 8

// ASI levels grant +2 points each (representing the +2 to stats or +1/+1)
const ASI_LEVELS = [4, 8, 12, 16, 19]

function calculateMaxPoints(level: number): number {
  const asiCount = ASI_LEVELS.filter(l => level >= l).length
  return BASE_POINTS + (asiCount * 2)
}

function calculateMaxStat(level: number): number {
  // Base max is 15, but with ASIs you can go higher
  // Each ASI adds potential +2, so max increases
  const asiCount = ASI_LEVELS.filter(l => level >= l).length
  return Math.min(20, 15 + (asiCount * 2))
}

export default function PointBuyCalculator({ onStatsChange, initialStats, level = 1 }: PointBuyCalculatorProps) {
  const [stats, setStats] = useState<Stats>(
    initialStats || {
      str: 8,
      dex: 8,
      con: 8,
      int: 8,
      wis: 8,
      cha: 8,
    }
  )

  const maxPoints = calculateMaxPoints(level)
  const maxStat = calculateMaxStat(level)
  const asiCount = ASI_LEVELS.filter(l => level >= l).length

  const calculateTotalPoints = (currentStats: Stats): number => {
    let total = 0
    for (const stat of Object.values(currentStats)) {
      if (stat >= 8) {
        // Sum all costs up to this stat
        for (let i = 8; i < stat; i++) {
          total += POINT_COSTS[i + 1] || 2  // Default to 2 for high stats
        }
      }
    }
    return total
  }

  const remainingPoints = maxPoints - calculateTotalPoints(stats)

  const handleStatChange = (statName: keyof Stats, newValue: number) => {
    const clampedValue = Math.max(MIN_STAT, Math.min(maxStat, newValue))
    const newStats = { ...stats, [statName]: clampedValue }

    // Check if we're within point budget
    const totalPoints = calculateTotalPoints(newStats)
    if (totalPoints <= maxPoints) {
      setStats(newStats)
      onStatsChange(newStats)
    }
  }

  const handleStatInput = (statName: keyof Stats, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? MIN_STAT : parseInt(e.target.value)
    handleStatChange(statName, value)
  }

  const resetToDefault = () => {
    const defaultStats: Stats = {
      str: 8,
      dex: 8,
      con: 8,
      int: 8,
      wis: 8,
      cha: 8,
    }
    setStats(defaultStats)
    onStatsChange(defaultStats)
  }

  const costToNextPoint = (currentValue: number): number => {
    if (currentValue >= maxStat) return 0
    return POINT_COSTS[currentValue + 1] || 2  // Default to 2 for high stats
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Point Buy ({maxPoints} Points)</h3>
            {asiCount > 0 && (
              <p className="text-xs text-gold-400">+{asiCount * 2} pts from {asiCount} ASI{asiCount > 1 ? 's' : ''}</p>
            )}
          </div>
          <button
            onClick={resetToDefault}
            className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((statName) => {
            const value = stats[statName]
            const cost = calculateTotalPoints({ ...stats, [statName]: value })
            const costForThisStat = calculateTotalPoints({ ...stats, [statName]: value }) - 
                                     calculateTotalPoints({ ...stats, [statName]: MIN_STAT })
            
            return (
              <div key={statName} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                  {statName}
                </label>
                
                <div className="mb-3">
                  <input
                    type="number"
                    min={MIN_STAT}
                    max={maxStat}
                    value={value}
                    onChange={(e) => handleStatInput(statName, e)}
                    className="w-full text-center text-2xl font-bold text-white bg-slate-900 border border-slate-600 rounded px-2 py-1 focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div className="space-y-1 text-xs text-slate-400">
                  <div>
                    Cost: <span className="text-gold-400 font-semibold">{costForThisStat}</span> pts
                  </div>
                  {value < maxStat && (
                    <div>
                      Next +1: <span className="text-slate-300">{costToNextPoint(value)} pts</span>
                    </div>
                  )}
                  {value >= maxStat && (
                    <div className="text-gold-400">Max for level {level}</div>
                  )}
                </div>

                <div className="mt-2 flex gap-1">
                  <button
                    onClick={() => handleStatChange(statName, value - 1)}
                    disabled={value <= MIN_STAT}
                    className="flex-1 px-1 py-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed rounded text-slate-300 text-xs font-semibold transition-colors"
                  >
                    −
                  </button>
                  <button
                    onClick={() => handleStatChange(statName, value + 1)}
                    disabled={value >= maxStat || remainingPoints < costToNextPoint(value)}
                    className="flex-1 px-1 py-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed rounded text-slate-300 text-xs font-semibold transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              Points Remaining:
            </span>
            <span className={`text-lg font-bold ${remainingPoints === 0 ? 'text-gold-400' : remainingPoints > 0 ? 'text-blue-400' : 'text-red-400'}`}>
              {remainingPoints}
            </span>
          </div>
          {remainingPoints === 0 && (
            <p className="text-xs text-gold-400 mt-2">✓ Points perfectly allocated</p>
          )}
          {remainingPoints > 0 && (
            <p className="text-xs text-blue-400 mt-2">Allocate {remainingPoints} more point{remainingPoints !== 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      <div className="text-xs text-slate-400 bg-slate-900/30 rounded px-3 py-2">
        <p className="font-semibold text-slate-300 mb-1">Point Buy Rules:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Base 27 points, +2 per ASI (levels 4, 8, 12, 16, 19)</li>
          <li>Scores 8→13 cost 1 pt each, 14→15 cost 2 pts each</li>
          <li>Max {maxStat} at level {level}</li>
          <li>No score below 8</li>
        </ul>
      </div>
    </div>
  )
}
