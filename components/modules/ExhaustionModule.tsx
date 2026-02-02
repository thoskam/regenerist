'use client'

import DraggableModule from '@/components/layout/DraggableModule'
import ExhaustionTracker from '@/components/ExhaustionTracker'

interface ExhaustionModuleProps {
  level: number
  characterSlug: string
  onUpdate: () => void
}

export default function ExhaustionModule({ level, characterSlug, onUpdate }: ExhaustionModuleProps) {
  const updateExhaustion = async (next: number) => {
    await fetch(`/api/characters/${characterSlug}/active-state/exhaustion`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: next }),
    })
    onUpdate()
  }

  return (
    <DraggableModule moduleId="exhaustion">
      <ExhaustionTracker level={level} onUpdate={updateExhaustion} />
    </DraggableModule>
  )
}
