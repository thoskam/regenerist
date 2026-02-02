'use client'

import { useState } from 'react'
import SpellSlotTracker from './SpellSlotTracker'
import LimitedFeatureTracker from './LimitedFeatureTracker'
import HitDiceTracker from './HitDiceTracker'
import PactMagicTracker from './PactMagicTracker'
import type { HydratedActiveState } from '@/lib/types/5etools'

interface ResourcePanelProps {
  slug: string
  activeState: HydratedActiveState | null
  isWarlock: boolean
  isSpellcaster: boolean
  onUpdate?: () => void
  disabled?: boolean
}

export default function ResourcePanel({
  slug,
  activeState,
  isWarlock,
  isSpellcaster,
  onUpdate,
  disabled = false,
}: ResourcePanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (!activeState) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="text-xs text-slate-400 font-semibold tracking-wider">RESOURCES</span>
          <span className="text-slate-500">{collapsed ? '▼' : '▲'}</span>
        </button>
        {!collapsed && (
          <p className="text-sm text-slate-500 mt-2">
            No active state loaded. Resources are initialized when you create or regenerate a character.
          </p>
        )}
      </div>
    )
  }

  const hasSpellSlots = isSpellcaster && !isWarlock && Object.keys(activeState.spellSlots || {}).length > 0
  const hasPactMagic = isWarlock && activeState.pactSlotsMax > 0
  const hasFeatures = Object.keys(activeState.limitedFeatures || {}).length > 0
  const hasHitDice = Object.keys(activeState.hitDice || {}).length > 0
  const hasAnything = hasSpellSlots || hasPactMagic || hasFeatures || hasHitDice

  if (!hasAnything) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="text-xs text-slate-400 font-semibold tracking-wider">RESOURCES</span>
          <span className="text-slate-500">{collapsed ? '▼' : '▲'}</span>
        </button>
        {!collapsed && (
          <p className="text-sm text-slate-500 mt-2">No expendable resources for this build.</p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between w-full text-left mb-2"
      >
        <span className="text-xs text-slate-400 font-semibold tracking-wider">RESOURCES</span>
        <span className="text-slate-500">{collapsed ? '▼' : '▲'}</span>
      </button>

      {!collapsed && (
        <div className="space-y-4 pt-2">
          {hasSpellSlots && (
            <SpellSlotTracker
              spellSlots={activeState.spellSlots}
              slug={slug}
              onUpdate={onUpdate}
              disabled={disabled}
            />
          )}
          {hasPactMagic && (
            <PactMagicTracker
              pactSlotsUsed={activeState.pactSlotsUsed}
              pactSlotsMax={activeState.pactSlotsMax}
              pactSlotLevel={activeState.pactSlotLevel}
              slug={slug}
              onUpdate={onUpdate}
              disabled={disabled}
            />
          )}
          {hasFeatures && (
            <LimitedFeatureTracker
              limitedFeatures={activeState.limitedFeatures}
              slug={slug}
              onUpdate={onUpdate}
              disabled={disabled}
            />
          )}
          {hasHitDice && (
            <HitDiceTracker
              hitDice={activeState.hitDice}
              slug={slug}
              onUpdate={onUpdate}
              disabled={disabled}
            />
          )}
        </div>
      )}
    </div>
  )
}
