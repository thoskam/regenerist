'use client'

import { useState, useEffect } from 'react'
import { Stats } from '@/lib/statMapper'

interface PointBuyCalculatorProps {
  onStatsChange: (stats: Stats) => void
  initialStats?: Stats
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
}

const MAX_POINTS = 27
const MIN_STAT = 8
const MAX_STAT = 15  // Before racial bonuses

export default function PointBuyCalculator({ onStatsChange, initialStats }: PointBuyCalculatorProps) {
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

  const calculateTotalPoints = (currentStats: Stats): number => {
    let total = 0
    for (const stat of Object.values(currentStats)) {
      if (stat >= 8 && stat <= 15) {
        // Sum all costs up to this stat
        for (let i = 8; i < stat; i++) {
          total += POINT_COSTS[i + 1] || 1
        }
      }
    }
    return total
  }

  const remainingPoints = MAX_POINTS - calculateTotalPoints(stats)

  const handleStatChange = (statName: keyof Stats, newValue: number) => {
    const clampedValue = Math.max(MIN_STAT, Math.min(MAX_STAT, newValue))
    const newStats = { ...stats, [statName]: clampedValue }
    
    // Check if we're within point budget
    const totalPoints = calculateTotalPoints(newStats)
    if (totalPoints <= MAX_POINTS) {
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
    if (currentValue >= MAX_STAT) return 0
    return POINT_COSTS[currentValue + 1] || 0
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Point Buy (27 Points)</h3>
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
                    max={MAX_STAT}
                    value={value}
                    onChange={(e) => handleStatInput(statName, e)}
                    className="w-full text-center text-2xl font-bold text-white bg-slate-900 border border-slate-600 rounded px-2 py-1 focus:outline-none focus:border-gold-500"
                  />
                </div>

                <div className="space-y-1 text-xs text-slate-400">
                  <div>
                    Cost: <span className="text-gold-400 font-semibold">{costForThisStat}</span> pts
                  </div>
                  {value < MAX_STAT && (
                    <div>
                      Next +1: <span className="text-slate-300">{costToNextPoint(value)} pts</span>
                    </div>
                  )}
                  {value >= MAX_STAT && (
                    <div className="text-gold-400">Max before racial bonuses</div>
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
                    disabled={value >= MAX_STAT || remainingPoints < costToNextPoint(value)}
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
          <li>All scores start at 8</li>
          <li>Increase from 8→15 costs points</li>
          <li>Max 15 before racial bonuses</li>
          <li>No score below 8</li>
        </ul>
      </div>
    </div>
  )
}
