'use client'

import { useState } from 'react'

export interface LimitedFeatureEntry {
  name: string
  max: number
  used: number
  recharge?: string
}

interface LimitedFeatureTrackerProps {
  limitedFeatures: Record<string, LimitedFeatureEntry>
  slug: string
  onUpdate?: () => void
  disabled?: boolean
}

const rechargeLabel: Record<string, string> = {
  short: 'SR',
  long: 'LR',
  dawn: 'Dawn',
}

export default function LimitedFeatureTracker({
  limitedFeatures,
  slug,
  onUpdate,
  disabled = false,
}: LimitedFeatureTrackerProps) {
  const [updating, setUpdating] = useState<string | null>(null)

  const entries = Object.entries(limitedFeatures)
  if (entries.length === 0) return null

  const handleUse = async (featureKey: string, action: 'use' | 'recover') => {
    if (disabled) return
    setUpdating(featureKey)
    try {
      const res = await fetch(`/api/characters/${slug}/active-state/features`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureKey, action, amount: 1 }),
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
      <span className="text-xs text-slate-400 font-semibold tracking-wider">LIMITED FEATURES</span>
      <div className="flex flex-wrap gap-2">
        {entries.map(([key, feat]) => {
          const remaining = feat.max - feat.used
          const depleted = remaining <= 0
          const recharge = feat.recharge ? rechargeLabel[feat.recharge] ?? feat.recharge : ''
          const isUpdating = updating === key
          return (
            <div
              key={key}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                depleted ? 'border-slate-600 bg-slate-800/50' : 'border-slate-600 bg-slate-800'
              }`}
            >
              <span className="text-sm font-medium text-slate-200 min-w-[100px]">{feat.name}</span>
              <span className="text-xs text-slate-500">
                {remaining}/{feat.max}
                {recharge && ` (${recharge})`}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={disabled || depleted || isUpdating}
                  onClick={() => handleUse(key, 'use')}
                  className="text-xs px-2 py-0.5 rounded bg-amber-700 hover:bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Use
                </button>
                <button
                  type="button"
                  disabled={disabled || feat.used === 0 || isUpdating}
                  onClick={() => handleUse(key, 'recover')}
                  className="text-xs px-2 py-0.5 rounded bg-slate-600 hover:bg-slate-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Recover
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
