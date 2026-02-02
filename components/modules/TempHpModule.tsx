'use client'

import DraggableModule from '@/components/layout/DraggableModule'
import TempHpTracker from '@/components/TempHpTracker'

interface TempHpModuleProps {
  tempHp: number
  characterSlug: string
  onUpdate: () => void
}

export default function TempHpModule({ tempHp, characterSlug, onUpdate }: TempHpModuleProps) {
  const updateTempHp = async (value: number) => {
    await fetch(`/api/characters/${characterSlug}/active-state/temp-hp`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempHp: value }),
    })
    onUpdate()
  }

  return (
    <DraggableModule moduleId="temp-hp">
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <TempHpTracker tempHp={tempHp} onUpdate={updateTempHp} />
      </div>
    </DraggableModule>
  )
}
