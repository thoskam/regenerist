'use client'

import DraggableModule from '@/components/layout/DraggableModule'
import ConditionsTracker from '@/components/ConditionsTracker'

interface ConditionsModuleProps {
  conditions: string[]
  characterSlug: string
  onUpdate: () => void
}

export default function ConditionsModule({ conditions, characterSlug, onUpdate }: ConditionsModuleProps) {
  const updateConditions = async (next: string[]) => {
    await fetch(`/api/characters/${characterSlug}/active-state/conditions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conditions: next }),
    })
    onUpdate()
  }

  return (
    <DraggableModule moduleId="conditions">
      <ConditionsTracker activeConditions={conditions} onUpdate={updateConditions} />
    </DraggableModule>
  )
}
