'use client'

import { Stats } from '@/lib/types'
import { SKILLS_BY_ABILITY, SKILL_ABILITIES, calculateSkillModifier } from '@/lib/proficiencyEngine'
import { formatModifier } from '@/lib/calculations'
import { StatName } from '@/lib/statMapper'
import SkillTooltip from './SkillTooltip'

interface ProficiencyListProps {
  stats: Stats
  proficiencies: string[]
  proficiencyBonus: number
}

const ABILITY_LABELS: Record<StatName, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
}

const ABILITY_ORDER: StatName[] = ['str', 'dex', 'int', 'wis', 'cha']

export default function ProficiencyList({ stats, proficiencies, proficiencyBonus }: ProficiencyListProps) {
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <h3 className="text-xs text-slate-400 font-semibold tracking-wider mb-4">SKILLS</h3>

      <div className="space-y-4">
        {ABILITY_ORDER.map((ability) => {
          const skills = SKILLS_BY_ABILITY[ability]
          if (skills.length === 0) return null

          return (
            <div key={ability}>
              <h4 className="text-xs text-slate-500 font-medium mb-2">
                {ABILITY_LABELS[ability]}
              </h4>
              <div className="space-y-1">
                {skills.map((skill) => {
                  const isProficient = proficiencies.includes(skill)
                  const modifier = calculateSkillModifier(skill, stats, proficiencies, proficiencyBonus)

                  return (
                    <div
                      key={skill}
                      className={`flex items-center justify-between py-1 px-2 rounded ${
                        isProficient ? 'bg-gold-500/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isProficient ? 'bg-gold-400' : 'bg-slate-600'
                          }`}
                        />
                        <SkillTooltip skillName={skill}>
                          <span
                            className={`text-sm ${
                              isProficient ? 'text-gold-400 font-medium' : 'text-slate-400'
                            }`}
                          >
                            {skill}
                          </span>
                        </SkillTooltip>
                      </div>
                      <span
                        className={`text-sm font-mono ${
                          isProficient ? 'text-gold-400' : 'text-slate-500'
                        }`}
                      >
                        {formatModifier(modifier)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700">
        <div className="text-xs text-slate-500">
          Proficiency Bonus: <span className="text-gold-400 font-medium">{formatModifier(proficiencyBonus)}</span>
        </div>
        <div className="text-xs text-slate-500 mt-1">
          Proficient: <span className="text-slate-400">{proficiencies.length} skills</span>
        </div>
      </div>
    </div>
  )
}
