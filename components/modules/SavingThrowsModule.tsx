'use client'

import DraggableModule from '@/components/layout/DraggableModule'
import SavesTable from '@/components/SavesTable'
import type { Stats } from '@/lib/types'

interface SavingThrowsModuleProps {
  stats: Stats
  savingThrowProficiencies: string[]
  proficiencyBonus: number
}

export default function SavingThrowsModule({
  stats,
  savingThrowProficiencies,
  proficiencyBonus,
}: SavingThrowsModuleProps) {
  return (
    <DraggableModule moduleId="saving-throws">
      <SavesTable
        stats={stats}
        savingThrowProficiencies={savingThrowProficiencies}
        proficiencyBonus={proficiencyBonus}
      />
    </DraggableModule>
  )
}
