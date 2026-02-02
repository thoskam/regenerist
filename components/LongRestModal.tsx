'use client'

import { useState } from 'react'

interface LongRestModalProps {
  characterSlug: string
  maxHp: number
  onClose: () => void
  onComplete: () => void
}

export default function LongRestModal({
  characterSlug,
  maxHp,
  onClose,
  onComplete,
}: LongRestModalProps) {
  const [isResting, setIsResting] = useState(false)
  const [result, setResult] = useState<{
    changes?: {
      spellSlotsRestored?: Record<string, number>
      featuresReset?: string[]
      exhaustionReduced?: boolean
    }
  } | null>(null)

  const handleRest = async () => {
    setIsResting(true)

    try {
      const response = await fetch(`/api/characters/${characterSlug}/rest/long`, {
        method: 'POST',
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Long rest failed:', error)
    } finally {
      setIsResting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">🌙 Long Rest</h2>

        {!result ? (
          <>
            <p className="text-slate-300 mb-4">A long rest (8+ hours) fully restores your character:</p>

            <ul className="list-disc list-inside space-y-1 text-slate-400 mb-4">
              <li>Restore all hit points</li>
              <li>Recover all spell slots</li>
              <li>Reset all limited-use abilities</li>
              <li>Recover half your total Hit Dice</li>
              <li>Reduce exhaustion by 1 level</li>
              <li>Clear temporary HP and conditions</li>
            </ul>

            <div className="bg-amber-900/30 border border-amber-600 rounded p-3 mb-4">
              <span className="text-amber-400">⚠️ This will reset your character's combat state.</span>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2 bg-slate-600 hover:bg-slate-500 rounded">
                Cancel
              </button>
              <button
                onClick={handleRest}
                disabled={isResting}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded font-medium"
              >
                {isResting ? 'Resting...' : 'Take Long Rest'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🌙</div>
              <h3 className="text-lg font-medium text-green-400">You awaken refreshed!</h3>
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-green-400">❤️ HP fully restored: {maxHp}/{maxHp}</div>
              {Object.entries(result.changes?.spellSlotsRestored || {}).length > 0 && (
                <div className="text-blue-400">🔮 All spell slots recovered</div>
              )}
              {result.changes?.featuresReset?.length ? (
                <div className="text-purple-400">✨ All abilities reset</div>
              ) : null}
              {result.changes?.exhaustionReduced && (
                <div className="text-amber-400">😴 Exhaustion reduced by 1</div>
              )}
            </div>

            <button onClick={onComplete} className="w-full py-2 bg-green-600 hover:bg-green-500 rounded font-medium">
              Done
            </button>
          </>
        )}
      </div>
    </div>
  )
}
