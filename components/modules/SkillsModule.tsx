'use client'

import DraggableModule from '@/components/layout/DraggableModule'
import ProficiencyList from '@/components/ProficiencyList'
import PassiveScores from '@/components/stats/PassiveScores'
import { formatModifier } from '@/lib/calculations'
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
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700 text-center">
          <div className="text-xs text-slate-400 font-semibold tracking-wider">PROFICIENCY BONUS</div>
          <div className="text-lg font-bold text-gold-400">{formatModifier(proficiencyBonus)}</div>
        </div>
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
