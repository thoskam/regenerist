'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useRoller } from '@/lib/dice/useRoller'

interface RollableAbilityProps {
  abilityName: string
  abilityAbbr: string
  score: number
  modifier: number
  baseValue?: number
  animate?: boolean
  pulseStyle?: CSSProperties
  characterId: string
  characterName: string
}

export default function RollableAbility({
  abilityName,
  abilityAbbr,
  score,
  modifier,
  baseValue,
  animate = false,
  pulseStyle,
  characterId,
  characterName,
}: RollableAbilityProps) {
  const { makeAbilityCheck } = useRoller({ characterId, characterName })
  const [isRolling, setIsRolling] = useState(false)

  const hasBonus = baseValue !== undefined && baseValue !== score
  const bonusAmount = hasBonus ? score - baseValue : 0

  const handleClick = () => {
    setIsRolling(true)
    makeAbilityCheck(abilityName, modifier)
    setTimeout(() => setIsRolling(false), 300)
  }

  return (
    <button
      onClick={handleClick}
      className={`flex flex-col items-center bg-slate-800 rounded-lg p-3 border border-slate-700 transition-all cursor-pointer hover:bg-slate-700 hover:border-slate-500 ${
        animate ? 'animate-stat-change' : ''
      } ${isRolling ? 'scale-95 ring-2 ring-purple-500 rolling' : ''}`}
      style={pulseStyle}
      type="button"
    >
      <span className="text-xs text-slate-400 font-semibold tracking-wider">{abilityAbbr}</span>
      {hasBonus && (
        <span className="text-xs text-slate-500">
          {baseValue} <span className="text-green-400">+{bonusAmount}</span>
        </span>
      )}
      <span className={`text-2xl font-bold ${hasBonus ? 'text-green-400' : 'text-white'}`}>{score}</span>
      <span className={`text-sm font-medium ${modifier >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {modifier >= 0 ? '+' : ''}{modifier}
      </span>
    </button>
  )
}
