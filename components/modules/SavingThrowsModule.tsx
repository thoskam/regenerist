'use client'

import DraggableModule from '@/components/layout/DraggableModule'
import SavesTable from '@/components/SavesTable'
import type { Stats } from '@/lib/types'

interface SavingThrowsModuleProps {
  stats: Stats
  savingThrowProficiencies: string[]
  proficiencyBonus: number
  characterId: string
  characterName: string
  calculatedSaves?: Record<string, { total: number; breakdown: { source: string; value: number }[] }>
}

export default function SavingThrowsModule({
  stats,
  savingThrowProficiencies,
  proficiencyBonus,
  characterId,
  characterName,
  calculatedSaves,
}: SavingThrowsModuleProps) {
  return (
    <DraggableModule moduleId="saving-throws">
      <SavesTable
        stats={stats}
        savingThrowProficiencies={savingThrowProficiencies}
        proficiencyBonus={proficiencyBonus}
        characterId={characterId}
        characterName={characterName}
        calculatedSaves={calculatedSaves}
      />
    </DraggableModule>
  )
}
