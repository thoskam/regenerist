'use client'

import DraggableModule from '@/components/layout/DraggableModule'
import ProficiencyList from '@/components/ProficiencyList'
import PassiveScores from '@/components/stats/PassiveScores'
import type { Stats } from '@/lib/types'

interface SkillsModuleProps {
  stats: Stats
  proficiencies: string[]
  proficiencyBonus: number
  characterId: string
  characterName: string
  calculatedSkills?: Record<string, { total: number; breakdown: { source: string; value: number }[] }>
  passives?: { perception: number; investigation: number; insight: number }
}

export default function SkillsModule({
  stats,
  proficiencies,
  proficiencyBonus,
  characterId,
  characterName,
  calculatedSkills,
  passives,
}: SkillsModuleProps) {
  return (
    <DraggableModule moduleId="skills">
      <div className="space-y-3">
        <ProficiencyList
          stats={stats}
          proficiencies={proficiencies}
          proficiencyBonus={proficiencyBonus}
          characterId={characterId}
          characterName={characterName}
          calculatedSkills={calculatedSkills}
        />
        {passives && (
          <PassiveScores
            perception={passives.perception}
            investigation={passives.investigation}
            insight={passives.insight}
          />
        )}
      </div>
    </DraggableModule>
  )
}
