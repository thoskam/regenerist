'use client'

import DraggableModule from '@/components/layout/DraggableModule'
import DeathSaves from '@/components/DeathSaves'
import DeathSaveRoller from '@/components/combat/DeathSaveRoller'

interface DeathSavesModuleProps {
  successes: number
  failures: number
  currentHp: number
  characterSlug: string
  characterId: string
  characterName: string
  onUpdate: () => void
}

export default function DeathSavesModule({
  successes,
  failures,
  currentHp,
  characterSlug,
  characterId,
  characterName,
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
      <div className="space-y-3">
        <DeathSaveRoller
          characterId={characterId}
          characterName={characterName}
          onRollResult={(result) => {
            if (result.isNat20) {
              updateDeathSaves(3, 0)
              return
            }

            if (result.isNat1) {
              updateDeathSaves(successes, Math.min(3, failures + 2))
              return
            }

            if (result.isSuccess) {
              updateDeathSaves(Math.min(3, successes + 1), failures)
              return
            }

            updateDeathSaves(successes, Math.min(3, failures + 1))
          }}
        />
        <DeathSaves
          successes={successes}
          failures={failures}
          currentHp={currentHp}
          onUpdate={updateDeathSaves}
        />
      </div>
    </DraggableModule>
  )
}
