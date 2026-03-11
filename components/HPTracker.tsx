'use client'

import { useState, useEffect } from 'react'

interface HPTrackerProps {
  currentHp: number
  maxHp: number
  onHpChange: (current: number, max: number) => void
}

export default function HPTracker({ currentHp, maxHp, onHpChange }: HPTrackerProps) {
  const [current, setCurrent] = useState(currentHp)
  const [max, setMax] = useState(maxHp)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    setCurrent(currentHp)
    setMax(maxHp)
  }, [currentHp, maxHp])

  const handleCurrentChange = (delta: number) => {
    const newValue = Math.max(0, Math.min(current + delta, max))
    setCurrent(newValue)
    onHpChange(newValue, max)
  }

  const handleMaxChange = (newMax: number) => {
    const validMax = Math.max(1, newMax)
    setMax(validMax)
    const newCurrent = Math.min(current, validMax)
    setCurrent(newCurrent)
    onHpChange(newCurrent, validMax)
  }

  const hpPercentage = max > 0 ? (current / max) * 100 : 0
  const hpBarColor = hpPercentage > 50 ? 'bg-green-500' : hpPercentage > 25 ? 'bg-yellow-500' : 'bg-red-500'
  const hpTextColor = hpPercentage > 50 ? 'text-green-400' : hpPercentage > 25 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="bg-slate-800 rounded-lg px-4 pt-3 pb-4 border border-slate-700">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400 font-semibold tracking-wider">HIT POINTS</span>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {isEditing ? 'Done' : 'Edit Max'}
        </button>
      </div>

      <div className="flex items-center justify-center gap-3 mb-3">
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => handleCurrentChange(-5)}
            className="text-xs text-red-400 hover:text-red-300 font-semibold px-2 py-0.5 rounded hover:bg-red-900/30 transition-colors"
          >
            −5
          </button>
          <button
            onClick={() => handleCurrentChange(-1)}
            className="w-9 h-9 rounded-full bg-red-900/80 hover:bg-red-800 text-white font-bold text-lg transition-colors"
          >
            −
          </button>
        </div>

        <div className="text-center min-w-[90px]">
          <span className={`text-5xl font-black leading-none ${hpTextColor}`}>{current}</span>
          <div className="flex items-baseline justify-center gap-1 mt-0.5">
            <span className="text-sm text-slate-500">/</span>
            {isEditing ? (
              <input
                type="number"
                value={max}
                onChange={(e) => handleMaxChange(parseInt(e.target.value) || 1)}
                className="w-14 text-lg bg-slate-700 text-white rounded px-2 py-0.5 text-center"
              />
            ) : (
              <span className="text-lg text-slate-400 font-semibold">{max}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => handleCurrentChange(5)}
            className="text-xs text-green-400 hover:text-green-300 font-semibold px-2 py-0.5 rounded hover:bg-green-900/30 transition-colors"
          >
            +5
          </button>
          <button
            onClick={() => handleCurrentChange(1)}
            className="w-9 h-9 rounded-full bg-green-900/80 hover:bg-green-800 text-white font-bold text-lg transition-colors"
          >
            +
          </button>
        </div>
      </div>

      <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${hpBarColor} transition-all duration-300 rounded-full`}
          style={{ width: `${hpPercentage}%` }}
        />
      </div>
    </div>
  )
}
