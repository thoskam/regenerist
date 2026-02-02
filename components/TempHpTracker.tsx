'use client'

import { useState } from 'react'

interface TempHpTrackerProps {
  tempHp: number
  onUpdate: (value: number) => void
}

export default function TempHpTracker({ tempHp, onUpdate }: TempHpTrackerProps) {
  const [inputValue, setInputValue] = useState('')
  const [showInput, setShowInput] = useState(false)

  const handleAdd = () => {
    const value = parseInt(inputValue, 10)
    if (!isNaN(value) && value > 0) {
      onUpdate(Math.max(tempHp, value))
      setInputValue('')
      setShowInput(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-400">Temp HP:</span>

      {tempHp > 0 ? (
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-bold">+{tempHp}</span>
          <button onClick={() => onUpdate(0)} className="text-xs text-slate-500 hover:text-red-400">
            Clear
          </button>
        </div>
      ) : showInput ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-20 px-2 py-1 bg-slate-700 rounded text-sm"
            autoFocus
          />
          <button onClick={handleAdd} className="text-sm px-2 py-1 bg-cyan-600 rounded">
            Add
          </button>
          <button onClick={() => setShowInput(false)} className="text-sm text-slate-500">
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={() => setShowInput(true)} className="text-sm text-cyan-400 hover:text-cyan-300">
          + Add Temp HP
        </button>
      )}
    </div>
  )
}
