'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { Dice6 } from 'lucide-react'
import { useRoller } from '@/lib/dice/useRoller'

interface RollableSkillProps {
  skillName: string
  abilityName: string
  modifier: number
  isProficient: boolean
  hasExpertise: boolean
  proficiencyBonus: number
  abilityModifier: number
  characterId: string
  characterName: string
  label?: ReactNode
}

export default function RollableSkill({
  skillName,
  abilityName,
  modifier,
  isProficient,
  hasExpertise,
  proficiencyBonus,
  abilityModifier,
  characterId,
  characterName,
  label,
}: RollableSkillProps) {
  const { makeSkillCheck } = useRoller({ characterId, characterName })
  const [isRolling, setIsRolling] = useState(false)

  const handleClick = () => {
    setIsRolling(true)

    const breakdown = [{ source: abilityName, value: abilityModifier }]

    if (isProficient) {
      breakdown.push({
        source: hasExpertise ? 'Expertise' : 'Proficiency',
        value: hasExpertise ? proficiencyBonus * 2 : proficiencyBonus,
      })
    }

    makeSkillCheck(skillName, modifier, breakdown)

    setTimeout(() => setIsRolling(false), 300)
  }

  return (
    <button
      onClick={handleClick}
      className={`
        w-full flex items-center justify-between py-1 px-2 rounded
        hover:bg-slate-700/50 transition-all group cursor-pointer
        ${isRolling ? 'bg-purple-500/20 scale-95 rolling' : ''}
      `}
      type="button"
    >
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            hasExpertise ? 'bg-yellow-400' : isProficient ? 'bg-green-400' : 'bg-slate-600'
          }`}
        />

        <span className="text-slate-300 group-hover:text-white transition-colors">
          {label ?? skillName}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className={`font-mono font-medium ${modifier >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {modifier >= 0 ? '+' : ''}{modifier}
        </span>
        <Dice6 className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity dice-indicator" />
      </div>
    </button>
  )
}
