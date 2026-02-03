'use client'

import { Stats } from '@/lib/types'
import { SKILLS_BY_ABILITY, calculateSkillModifier } from '@/lib/proficiencyEngine'
import { formatModifier } from '@/lib/calculations'
import { StatName } from '@/lib/statMapper'
import SkillTooltip from './SkillTooltip'
import RollableSkill from './skills/RollableSkill'
import { getStatModifier } from '@/lib/statMapper'

interface ProficiencyListProps {
  stats: Stats
  proficiencies: string[]
  proficiencyBonus: number
  characterId: string
  characterName: string
}

const ABILITY_LABELS: Record<StatName, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
}

const ABILITY_NAMES: Record<StatName, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
}

const ABILITY_ORDER: StatName[] = ['str', 'dex', 'int', 'wis', 'cha']

export default function ProficiencyList({
  stats,
  proficiencies,
  proficiencyBonus,
  characterId,
  characterName,
}: ProficiencyListProps) {
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
                  const abilityModifier = getStatModifier(stats[ability])

                  return (
                    <div key={skill} className={`${isProficient ? 'bg-gold-500/10 rounded' : ''}`}>
                      <RollableSkill
                        skillName={skill}
                        abilityName={ABILITY_NAMES[ability]}
                        modifier={modifier}
                        isProficient={isProficient}
                        hasExpertise={false}
                        proficiencyBonus={proficiencyBonus}
                        abilityModifier={abilityModifier}
                        characterId={characterId}
                        characterName={characterName}
                        label={
                          <SkillTooltip skillName={skill}>
                            <span
                              className={`text-sm ${
                                isProficient ? 'text-gold-400 font-medium' : 'text-slate-400'
                              }`}
                            >
                              {skill}
                            </span>
                          </SkillTooltip>
                        }
                      />
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
