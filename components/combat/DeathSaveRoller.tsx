'use client'

import { Skull } from 'lucide-react'
import { useRoller } from '@/lib/dice/useRoller'

interface DeathSaveRollerProps {
  characterId: string
  characterName: string
  modifier?: number
  onRollResult: (result: { isSuccess: boolean; isNat20: boolean; isNat1: boolean }) => void
}

export default function DeathSaveRoller({
  characterId,
  characterName,
  modifier = 0,
  onRollResult,
}: DeathSaveRollerProps) {
  const { makeDeathSave } = useRoller({ characterId, characterName })

  const handleRoll = () => {
    const result = makeDeathSave(modifier)

    onRollResult({
      isSuccess: result.isSuccess ?? false,
      isNat20: result.isCriticalSuccess,
      isNat1: result.isCriticalFailure,
    })
  }

  return (
    <button
      onClick={handleRoll}
      className="w-full py-3 bg-red-900/30 hover:bg-red-900/50 border border-red-600 rounded-lg flex items-center justify-center gap-2 transition-colors"
      type="button"
    >
      <Skull className="w-5 h-5 text-red-400" />
      <span className="font-medium">Roll Death Save</span>
      {modifier !== 0 && <span className="text-green-400 font-mono">+{modifier}</span>}
    </button>
  )
}
