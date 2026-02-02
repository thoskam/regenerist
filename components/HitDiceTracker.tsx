'use client'

import { useState } from 'react'

export interface HitDiceSlot {
  used: number
  max: number
}

interface HitDiceTrackerProps {
  hitDice: Record<string, HitDiceSlot>
  slug: string
  onUpdate?: () => void
  disabled?: boolean
}

export default function HitDiceTracker({
  hitDice,
  slug,
  onUpdate,
  disabled = false,
}: HitDiceTrackerProps) {
  const [updating, setUpdating] = useState<string | null>(null)

  const entries = Object.entries(hitDice).filter(([, s]) => s.max > 0)
  if (entries.length === 0) return null

  const handleAction = async (dieType: string, action: 'spend' | 'recover') => {
    if (disabled) return
    setUpdating(dieType)
    try {
      const res = await fetch(`/api/characters/${slug}/active-state/hit-dice`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dieType, action, amount: 1 }),
      })
      if (res.ok) onUpdate?.()
    } catch (e) {
      console.error(e)
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-2">
      <span className="text-xs text-slate-400 font-semibold tracking-wider">HIT DICE</span>
      <div className="flex flex-wrap gap-3">
        {entries.map(([dieType, slot]) => {
          const available = slot.max - slot.used
          const isUpdating = updating === dieType
          return (
            <div key={dieType} className="flex flex-col items-center gap-1">
              <span className="text-xs text-slate-500 uppercase">{dieType}</span>
              <div className="flex gap-1 flex-wrap justify-center max-w-[120px]">
                {Array.from({ length: slot.max }, (_, i) => {
                  const used = i < slot.used
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={disabled || isUpdating}
                      title={used ? 'Click to recover (short rest)' : 'Click to spend'}
                      onClick={() => handleAction(dieType, used ? 'recover' : 'spend')}
                      className={`w-5 h-5 rounded border text-xs font-bold transition-colors ${
                        used
                          ? 'bg-amber-600/80 border-amber-500 text-white'
                          : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                      } ${disabled || isUpdating ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                    >
                      {used ? '·' : ''}
                    </button>
                  )
                })}
              </div>
              <span className="text-xs text-slate-400">
                {available}/{slot.max} available
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
