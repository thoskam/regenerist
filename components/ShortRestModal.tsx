'use client'

import { useState } from 'react'

interface ShortRestModalProps {
  characterSlug: string
  hitDice: Record<string, { used: number; max: number }>
  currentHp: number
  maxHp: number
  conModifier: number
  onClose: () => void
  onComplete: () => void
}

export default function ShortRestModal({
  characterSlug,
  hitDice,
  currentHp,
  maxHp,
  conModifier,
  onClose,
  onComplete,
}: ShortRestModalProps) {
  const [diceToSpend, setDiceToSpend] = useState<Record<string, number>>({})
  const [isResting, setIsResting] = useState(false)
  const [result, setResult] = useState<{
    changes?: {
      hpRestored?: number
      hitDiceSpent?: number
      featuresReset?: string[]
      spellSlotsRestored?: Record<string, number>
    }
  } | null>(null)

  const handleSpendDie = (dieType: string, delta: number) => {
    setDiceToSpend((prev) => {
      const current = prev[dieType] || 0
      const available = hitDice[dieType].max - hitDice[dieType].used
      const newValue = Math.max(0, Math.min(available, current + delta))
      return { ...prev, [dieType]: newValue }
    })
  }

  const estimateHealing = () => {
    let total = 0
    for (const [dieType, count] of Object.entries(diceToSpend)) {
      const dieMax = parseInt(dieType.replace('d', ''), 10)
      const avgRoll = Math.floor(dieMax / 2) + 1
      total += count * Math.max(1, avgRoll + conModifier)
    }
    return total
  }

  const handleRest = async () => {
    setIsResting(true)

    const hitDiceToSpend = Object.entries(diceToSpend)
      .filter(([, count]) => count > 0)
      .map(([dieType, count]) => ({ dieType, count }))

    try {
      const response = await fetch(`/api/characters/${characterSlug}/rest/short`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hitDiceToSpend }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Short rest failed:', error)
    } finally {
      setIsResting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">☕ Short Rest</h2>

        {!result ? (
          <>
            <p className="text-slate-300 mb-4">
              During a short rest (1+ hour), you can spend Hit Dice to recover hit points.
            </p>

            <div className="mb-4">
              <div className="text-sm text-slate-400 mb-2">
                Current HP: {currentHp} / {maxHp}
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <h3 className="font-medium">Spend Hit Dice:</h3>
              {Object.entries(hitDice).map(([dieType, data]) => {
                const available = data.max - data.used
                const spending = diceToSpend[dieType] || 0

                return (
                  <div key={dieType} className="flex items-center justify-between">
                    <span className="font-mono">{dieType}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-sm">{available} available</span>
                      <button
                        onClick={() => handleSpendDie(dieType, -1)}
                        className="w-8 h-8 bg-slate-700 rounded"
                        disabled={spending === 0}
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{spending}</span>
                      <button
                        onClick={() => handleSpendDie(dieType, 1)}
                        className="w-8 h-8 bg-slate-700 rounded"
                        disabled={spending >= available}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="bg-slate-700 rounded p-3 mb-4">
              <span className="text-slate-400">Estimated healing: </span>
              <span className="text-green-400 font-bold">~{estimateHealing()} HP</span>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2 bg-slate-600 hover:bg-slate-500 rounded">
                Cancel
              </button>
              <button
                onClick={handleRest}
                disabled={isResting}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium"
              >
                {isResting ? 'Resting...' : 'Take Short Rest'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">☕</div>
              <h3 className="text-lg font-medium text-green-400">Rest Complete!</h3>
            </div>

            <div className="space-y-2 mb-4">
              {result.changes?.hpRestored && result.changes.hpRestored > 0 && (
                <div className="text-green-400">❤️ Restored {result.changes.hpRestored} HP</div>
              )}
              {result.changes?.hitDiceSpent && result.changes.hitDiceSpent > 0 && (
                <div className="text-amber-400">🎲 Spent {result.changes.hitDiceSpent} Hit Dice</div>
              )}
              {result.changes?.featuresReset?.length ? (
                <div className="text-blue-400">✨ Reset: {result.changes.featuresReset.join(', ')}</div>
              ) : null}
              {result.changes?.spellSlotsRestored?.pact ? (
                <div className="text-purple-400">
                  🔮 Recovered {result.changes.spellSlotsRestored.pact} Pact Magic slots
                </div>
              ) : null}
            </div>

            <button
              onClick={onComplete}
              className="w-full py-2 bg-green-600 hover:bg-green-500 rounded font-medium"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  )
}
