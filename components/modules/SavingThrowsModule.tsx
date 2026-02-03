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
}

export default function SavingThrowsModule({
  stats,
  savingThrowProficiencies,
  proficiencyBonus,
  characterId,
  characterName,
}: SavingThrowsModuleProps) {
  return (
    <DraggableModule moduleId="saving-throws">
      <SavesTable
        stats={stats}
        savingThrowProficiencies={savingThrowProficiencies}
        proficiencyBonus={proficiencyBonus}
        characterId={characterId}
        characterName={characterName}
      />
    </DraggableModule>
  )
}
