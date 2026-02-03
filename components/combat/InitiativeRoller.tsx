'use client'

import { Flag } from 'lucide-react'
import { useRoller } from '@/lib/dice/useRoller'

interface InitiativeRollerProps {
  dexModifier: number
  bonuses?: number
  characterId: string
  characterName: string
}

export default function InitiativeRoller({
  dexModifier,
  bonuses = 0,
  characterId,
  characterName,
}: InitiativeRollerProps) {
  const { makeInitiativeRoll } = useRoller({ characterId, characterName })
  const totalMod = dexModifier + bonuses

  return (
    <button
      onClick={() => makeInitiativeRoll(dexModifier, bonuses)}
      className="flex flex-col items-center p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-amber-500 hover:bg-slate-700 transition-all"
      type="button"
    >
      <span className="text-xs text-slate-400 font-semibold tracking-wider block">INITIATIVE</span>
      <span className={`text-3xl font-bold ${totalMod >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {totalMod >= 0 ? '+' : ''}{totalMod}
      </span>
      <Flag className="w-4 h-4 text-amber-400 mt-1" />
    </button>
  )
}
