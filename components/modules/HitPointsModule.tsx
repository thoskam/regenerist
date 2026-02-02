'use client'

import DraggableModule from '@/components/layout/DraggableModule'
import HPTracker from '@/components/HPTracker'
import RestButtons from '@/components/RestButtons'
import RestTracker from '@/components/RestTracker'
import type { HydratedActiveState } from '@/lib/types/5etools'

interface HitPointsModuleProps {
  slug: string
  lifeId: number
  currentHp: number
  maxHp: number
  activeState: HydratedActiveState | null
  conModifier: number
  isOwner: boolean
  onUpdate: () => void
}

export default function HitPointsModule({
  slug,
  lifeId,
  currentHp,
  maxHp,
  activeState,
  conModifier,
  isOwner,
  onUpdate,
}: HitPointsModuleProps) {
  const handleHpChange = async (current: number, max: number) => {
    try {
      await fetch(`/api/characters/${slug}/lives/${lifeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentHp: current, maxHp: max }),
      })
      if (activeState) {
        await fetch(`/api/characters/${slug}/active-state`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentHp: current }),
        })
      }
      onUpdate()
    } catch (error) {
      console.error('Failed to update HP:', error)
    }
  }

  return (
    <DraggableModule moduleId="hit-points">
      <div className="space-y-4">
        <HPTracker currentHp={currentHp} maxHp={maxHp} onHpChange={handleHpChange} />
        {activeState && isOwner && (
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-3">
            <RestButtons
              characterSlug={slug}
              activeState={activeState}
              maxHp={maxHp}
              conModifier={conModifier}
              onRestComplete={onUpdate}
            />
            <RestTracker activeState={activeState} />
          </div>
        )}
      </div>
    </DraggableModule>
  )
}
