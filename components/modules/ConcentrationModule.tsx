'use client'

import DraggableModule from '@/components/layout/DraggableModule'
import ConcentrationTracker from '@/components/ConcentrationTracker'

interface ConcentrationModuleProps {
  spellName: string | null
  characterSlug: string
  onUpdate: () => void
}

export default function ConcentrationModule({ spellName, characterSlug, onUpdate }: ConcentrationModuleProps) {
  const updateConcentration = async (next: string | null) => {
    await fetch(`/api/characters/${characterSlug}/active-state/concentration`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spellName: next }),
    })
    onUpdate()
  }

  if (!spellName) return null

  return (
    <DraggableModule moduleId="concentration">
      <ConcentrationTracker spellName={spellName} onBreak={() => updateConcentration(null)} />
    </DraggableModule>
  )
}
