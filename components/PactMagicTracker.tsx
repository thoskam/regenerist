'use client'

import { useState } from 'react'

interface PactMagicTrackerProps {
  pactSlotsUsed: number
  pactSlotsMax: number
  pactSlotLevel: number
  slug: string
  onUpdate?: () => void
  disabled?: boolean
}

export default function PactMagicTracker({
  pactSlotsUsed,
  pactSlotsMax,
  pactSlotLevel,
  slug,
  onUpdate,
  disabled = false,
}: PactMagicTrackerProps) {
  const [updating, setUpdating] = useState(false)

  if (pactSlotsMax === 0) return null

  const handleAction = async (action: 'use' | 'recover') => {
    if (disabled) return
    setUpdating(true)
    try {
      const newUsed = action === 'use' ? Math.min(pactSlotsMax, pactSlotsUsed + 1) : Math.max(0, pactSlotsUsed - 1)
      const res = await fetch(`/api/characters/${slug}/active-state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pactSlotsUsed: newUsed }),
      })
      if (res.ok) onUpdate?.()
    } catch (e) {
      console.error(e)
    } finally {
      setUpdating(false)
    }
  }

  const available = pactSlotsMax - pactSlotsUsed

  return (
    <div className="space-y-2">
      <span className="text-xs text-slate-400 font-semibold tracking-wider">
        PACT MAGIC (Level {pactSlotLevel} slots)
      </span>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">
          {Array.from({ length: pactSlotsMax }, (_, i) => {
            const used = i < pactSlotsUsed
            return (
              <button
                key={i}
                type="button"
                disabled={disabled || updating}
                title={used ? 'Recover (short rest)' : 'Use'}
                onClick={() => handleAction(used ? 'recover' : 'use')}
                className={`w-7 h-7 rounded border transition-colors ${
                  used
                    ? 'bg-violet-600/80 border-violet-500'
                    : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                } ${disabled || updating ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
              />
            )
          })}
        </div>
        <span className="text-sm text-slate-400">
          {available}/{pactSlotsMax} available
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={disabled || available === 0 || updating}
            onClick={() => handleAction('use')}
            className="text-xs px-2 py-0.5 rounded bg-violet-700 hover:bg-violet-600 text-white disabled:opacity-50"
          >
            Use
          </button>
          <button
            type="button"
            disabled={disabled || pactSlotsUsed === 0 || updating}
            onClick={() => handleAction('recover')}
            className="text-xs px-2 py-0.5 rounded bg-slate-600 hover:bg-slate-500 text-white disabled:opacity-50"
          >
            Recover
          </button>
        </div>
      </div>
    </div>
  )
}
