'use client'

import { useState, useEffect } from 'react'

interface HPTrackerProps {
  disabled?: boolean
  currentHp: number
  maxHp: number
  onAdjust?: (delta: number) => void
  onHpChange: (current: number, max: number) => void
}

export default function HPTracker({ currentHp, maxHp, onHpChange, onAdjust, disabled = false }: HPTrackerProps) {
  const [current, setCurrent] = useState(currentHp)
  const [max, setMax] = useState(maxHp)
  const [amount, setAmount] = useState(1)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    setCurrent(currentHp)
    setMax(maxHp)
  }, [currentHp, maxHp])

  const handleCurrentChange = (delta: number) => {
    if (onAdjust) { onAdjust(delta); return }
    const newValue = Math.max(0, Math.min(current + delta, max))
    onHpChange(newValue, max)
  }

  const handleMaxChange = (newMax: number) => {
    const validMax = Math.max(1, newMax)
    const newCurrent = Math.min(current, validMax)
    onHpChange(newCurrent, validMax)
  }

  const hpPercentage = max > 0 ? (current / max) * 100 : 0
  const hpColor = hpPercentage > 50 ? 'bg-green-500' : hpPercentage > 25 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <fieldset disabled={disabled} className="bg-slate-800 rounded-lg p-4 border border-slate-700 disabled:opacity-60">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 font-semibold tracking-wider">HIT POINTS</span>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {isEditing ? 'Done' : 'Edit Max'}
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 mb-3">
        <button
          onClick={() => handleCurrentChange(-1)}
          className="w-8 h-8 rounded-full bg-red-900 hover:bg-red-800 text-white font-bold transition-colors"
        >
          -
        </button>
        <button
          onClick={() => handleCurrentChange(-5)}
          className="text-xs text-red-400 hover:text-red-300 px-2"
        >
          -5
        </button>

        <div className="text-center min-w-[80px]">
          <span className="text-3xl font-bold text-white">{current}</span>
          <span className="text-xl text-slate-500"> / </span>
          {isEditing ? (
            <input
              aria-label="Maximum hit points"
              min="1"
              type="number"
              value={max}
              onChange={(e) => handleMaxChange(parseInt(e.target.value) || 1)}
              className="w-16 text-xl bg-slate-700 text-white rounded px-2 py-1"
            />
          ) : (
            <span className="text-xl text-slate-400">{max}</span>
          )}
        </div>

        <button
          onClick={() => handleCurrentChange(5)}
          className="text-xs text-green-400 hover:text-green-300 px-2"
        >
          +5
        </button>
        <button
          onClick={() => handleCurrentChange(1)}
          className="w-8 h-8 rounded-full bg-green-900 hover:bg-green-800 text-white font-bold transition-colors"
        >
          +
        </button>
      </div>

      <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${hpColor} transition-all duration-300`}
          style={{ width: `${hpPercentage}%` }}
        />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input aria-label="Damage or healing amount" type="number" min="1" step="1" value={amount}
          onChange={e => setAmount(Math.max(1, Math.trunc(Number(e.target.value) || 1)))}
          className="w-20 rounded bg-slate-700 px-2 py-2" />
        <button onClick={() => handleCurrentChange(-amount)} className="rounded bg-red-900 px-3 py-2 text-sm">Damage</button>
        <button onClick={() => handleCurrentChange(amount)} className="rounded bg-green-900 px-3 py-2 text-sm">Heal</button>
      </div>
      {current === 0 && <p role="status" className="mt-3 text-sm text-red-300">At 0 HP. Track death saving throws and follow your table’s regeneration rules.</p>}
    </fieldset>
  )
}
