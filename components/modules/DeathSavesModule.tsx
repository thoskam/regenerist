'use client'

import DraggableModule from '@/components/layout/DraggableModule'
import DeathSaves from '@/components/DeathSaves'

interface DeathSavesModuleProps {
  successes: number
  failures: number
  currentHp: number
  characterSlug: string
  onUpdate: () => void
}

export default function DeathSavesModule({
  successes,
  failures,
  currentHp,
  characterSlug,
  onUpdate,
}: DeathSavesModuleProps) {
  const updateDeathSaves = async (nextSuccesses: number, nextFailures: number) => {
    await fetch(`/api/characters/${characterSlug}/active-state/death-saves`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ successes: nextSuccesses, failures: nextFailures }),
    })
    onUpdate()
  }

  if (currentHp > 0) return null

  return (
    <DraggableModule moduleId="death-saves">
      <DeathSaves
        successes={successes}
        failures={failures}
        currentHp={currentHp}
        onUpdate={updateDeathSaves}
      />
    </DraggableModule>
  )
}
