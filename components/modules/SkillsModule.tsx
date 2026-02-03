'use client'

import DraggableModule from '@/components/layout/DraggableModule'
import ProficiencyList from '@/components/ProficiencyList'
import type { Stats } from '@/lib/types'

interface SkillsModuleProps {
  stats: Stats
  proficiencies: string[]
  proficiencyBonus: number
  characterId: string
  characterName: string
}

export default function SkillsModule({
  stats,
  proficiencies,
  proficiencyBonus,
  characterId,
  characterName,
}: SkillsModuleProps) {
  return (
    <DraggableModule moduleId="skills">
      <ProficiencyList
        stats={stats}
        proficiencies={proficiencies}
        proficiencyBonus={proficiencyBonus}
        characterId={characterId}
        characterName={characterName}
      />
    </DraggableModule>
  )
}
