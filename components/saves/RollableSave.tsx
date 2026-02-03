'use client'

import { useState } from 'react'
import { useRoller } from '@/lib/dice/useRoller'

interface RollableSaveProps {
  saveName: string
  modifier: number
  isProficient: boolean
  proficiencyBonus: number
  abilityModifier: number
  characterId: string
  characterName: string
}

export default function RollableSave({
  saveName,
  modifier,
  isProficient,
  proficiencyBonus,
  abilityModifier,
  characterId,
  characterName,
}: RollableSaveProps) {
  const { makeSavingThrow } = useRoller({ characterId, characterName })
  const [isRolling, setIsRolling] = useState(false)

  const handleClick = () => {
    setIsRolling(true)

    const breakdown = [{ source: saveName, value: abilityModifier }]

    if (isProficient) {
      breakdown.push({ source: 'Proficiency', value: proficiencyBonus })
    }

    makeSavingThrow(saveName, modifier, breakdown)

    setTimeout(() => setIsRolling(false), 300)
  }

  return (
    <button
      onClick={handleClick}
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all
        ${
          isProficient
            ? 'bg-green-900/30 border border-green-600 hover:bg-green-900/50'
            : 'bg-slate-800 border border-slate-700 hover:bg-slate-700'
        }
        ${isRolling ? 'scale-95 ring-2 ring-purple-500 rolling' : ''}
      `}
      type="button"
    >
      {isProficient && <span className="text-yellow-400">●</span>}
      <span className="font-medium text-slate-200 text-sm">{saveName}</span>
      <span className={`font-mono ml-auto ${modifier >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {modifier >= 0 ? '+' : ''}{modifier}
      </span>
    </button>
  )
}
