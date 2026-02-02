'use client'

import { useState } from 'react'

export interface SpellSlotState {
  used: number
  max: number
}

interface SpellSlotTrackerProps {
  spellSlots: Record<string, SpellSlotState>
  slug: string
  onUpdate?: () => void
  disabled?: boolean
}

export default function SpellSlotTracker({
  spellSlots,
  slug,
  onUpdate,
  disabled = false,
}: SpellSlotTrackerProps) {
  const [updating, setUpdating] = useState<string | null>(null)

  const levels = Object.keys(spellSlots)
    .map(Number)
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b)
  if (levels.length === 0) return null

  const handleSlotClick = async (level: number, action: 'use' | 'recover') => {
    if (disabled) return
    const key = `${level}`
    setUpdating(key)
    try {
      const res = await fetch(`/api/characters/${slug}/active-state/spell-slots`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, action, amount: 1 }),
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
      <span className="text-xs text-slate-400 font-semibold tracking-wider">SPELL SLOTS</span>
      <div className="flex flex-wrap gap-3">
        {levels.map((level) => {
          const slot = spellSlots[String(level)] ?? { used: 0, max: 0 }
          const available = slot.max - slot.used
          const isUpdating = updating === String(level)
          return (
            <div key={level} className="flex flex-col items-center gap-1">
              <span className="text-xs text-slate-500">Level {level}</span>
              <div className="flex gap-1 flex-wrap justify-center max-w-[140px]">
                {Array.from({ length: slot.max }, (_, i) => {
                  const used = i < slot.used
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={disabled || isUpdating}
                      title={used ? 'Click to recover' : 'Click to use'}
                      onClick={() => handleSlotClick(level, used ? 'recover' : 'use')}
                      className={`w-6 h-6 rounded border transition-colors ${
                        used
                          ? 'bg-amber-600/80 border-amber-500'
                          : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                      } ${disabled || isUpdating ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                    />
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
