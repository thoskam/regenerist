'use client'

import DraggableModule from '@/components/layout/DraggableModule'
import ProficiencyList from '@/components/ProficiencyList'
import type { Stats } from '@/lib/types'

interface SkillsModuleProps {
  stats: Stats
  proficiencies: string[]
  proficiencyBonus: number
}

export default function SkillsModule({ stats, proficiencies, proficiencyBonus }: SkillsModuleProps) {
  return (
    <DraggableModule moduleId="skills">
      <ProficiencyList
        stats={stats}
        proficiencies={proficiencies}
        proficiencyBonus={proficiencyBonus}
      />
    </DraggableModule>
  )
}
