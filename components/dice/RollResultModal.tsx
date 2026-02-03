'use client'

import { useEffect, useState } from 'react'
import { X, Check, XCircle, Sparkles, Skull, Copy, Send } from 'lucide-react'
import { useRoll } from '@/lib/dice/RollContext'
import RollNarration from './RollNarration'

export default function RollResultModal() {
  const { currentRoll, dismissRollResult, settings, sendToDiscord } = useRoll()
  const [isAnimating, setIsAnimating] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [narration, setNarration] = useState<string | null>(null)
  const [isLoadingNarration, setIsLoadingNarration] = useState(false)

  useEffect(() => {
    if (currentRoll) {
      setIsAnimating(true)
      setShowDetails(false)

      const timeout = setTimeout(() => {
        if (!currentRoll.isCriticalSuccess && !currentRoll.isCriticalFailure) {
          dismissRollResult()
        }
      }, 5000)

      return () => clearTimeout(timeout)
    }

    setIsAnimating(false)
    return undefined
  }, [currentRoll, dismissRollResult])

  useEffect(() => {
    if (
      currentRoll &&
      settings.enableAINarration &&
      (currentRoll.isCriticalSuccess || currentRoll.isCriticalFailure)
    ) {
      setIsLoadingNarration(true)
      fetch('/api/rolls/narrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roll: currentRoll }),
      })
        .then((res) => res.json())
        .then((data) => {
          setNarration(data.narration || null)
          setIsLoadingNarration(false)
        })
        .catch(() => setIsLoadingNarration(false))
      return
    }

    setNarration(null)
    setIsLoadingNarration(false)
  }, [currentRoll, settings.enableAINarration])

  if (!currentRoll) return null

  const {
    rollName,
    rollType,
    dice,
    modifier,
    modifierBreakdown,
    advantageState,
    advantageRolls,
    naturalRoll,
    total,
    isCriticalSuccess,
    isCriticalFailure,
    targetDC,
    isSuccess,
    characterName,
  } = currentRoll

  const getResultStyle = () => {
    if (isCriticalSuccess) return 'from-yellow-600 to-amber-600 border-yellow-400'
    if (isCriticalFailure) return 'from-red-800 to-red-900 border-red-500'
    if (isSuccess === true) return 'from-green-800 to-green-900 border-green-500'
    if (isSuccess === false) return 'from-slate-700 to-slate-800 border-slate-500'
    return 'from-slate-700 to-slate-800 border-purple-500'
  }

  const getResultIcon = () => {
    if (isCriticalSuccess) return <Sparkles className="w-8 h-8 text-yellow-300" />
    if (isCriticalFailure) return <Skull className="w-8 h-8 text-red-400" />
    if (isSuccess === true) return <Check className="w-8 h-8 text-green-400" />
    if (isSuccess === false) return <XCircle className="w-8 h-8 text-red-400" />
    return null
  }

  const getResultText = () => {
    if (isCriticalSuccess) return 'NATURAL 20!'
    if (isCriticalFailure) return 'NATURAL 1!'
    if (isSuccess === true) return 'SUCCESS!'
    if (isSuccess === false) return 'FAILURE'
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      onClick={dismissRollResult}
    >
      {(isCriticalSuccess || isCriticalFailure) && (
        <div
          className={`absolute inset-0 pointer-events-auto ${
            isCriticalSuccess ? 'bg-yellow-500/10' : 'bg-red-500/10'
          }`}
        />
      )}

      <div
        className={`
          pointer-events-auto
          bg-gradient-to-b ${getResultStyle()}
          border-2 rounded-2xl shadow-2xl
          p-6 min-w-[300px] max-w-[420px]
          transform transition-all duration-300
          ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={dismissRollResult}
          className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded"
          type="button"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>

        <div className="text-sm text-slate-300 mb-1">{characterName}</div>
        <h2 className="text-xl font-bold mb-4 text-slate-100">{rollName}</h2>

        <div className="text-center mb-4">
          <div
            className={`
              text-6xl font-bold mb-2
              ${isCriticalSuccess ? 'text-yellow-300 animate-bounce' : ''}
              ${isCriticalFailure ? 'text-red-400 animate-pulse' : 'text-slate-100'}
            `}
          >
            {total}
          </div>

          {getResultText() && (
            <div className="flex items-center justify-center gap-2 mb-2">
              {getResultIcon()}
              <span
                className={`text-lg font-bold ${
                  isCriticalSuccess ? 'text-yellow-300' : ''
                } ${isCriticalFailure ? 'text-red-400' : ''} ${
                  isSuccess === true ? 'text-green-400' : ''
                } ${isSuccess === false ? 'text-red-400' : ''}`}
              >
                {getResultText()}
              </span>
            </div>
          )}

          {targetDC !== undefined && (
            <div className="text-sm text-slate-300">Target: {targetDC}</div>
          )}
        </div>

        <div className="bg-black/20 rounded-lg p-3 mb-4">
          {rollType !== 'damage' && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-300">d20 Roll:</span>
              <span
                className={`font-mono font-bold ${
                  naturalRoll === 20 ? 'text-yellow-300' : ''
                } ${naturalRoll === 1 ? 'text-red-400' : ''}`}
              >
                {naturalRoll}
              </span>
            </div>
          )}

          {advantageRolls && advantageRolls.length > 1 && (
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-slate-400">
                ({advantageState === 'advantage' ? 'Advantage' : 'Disadvantage'})
              </span>
              <span className="text-slate-400 font-mono">[{advantageRolls.join(', ')}]</span>
            </div>
          )}

          {modifier !== 0 && (
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Modifier:</span>
              <span className={`font-mono ${modifier >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {modifier >= 0 ? '+' : ''}{modifier}
              </span>
            </div>
          )}

          {modifierBreakdown && modifierBreakdown.length > 0 && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full text-left text-xs text-slate-400 mt-2 hover:text-slate-200"
              type="button"
            >
              {showDetails ? '▼' : '▶'} Details
            </button>
          )}

          {showDetails && modifierBreakdown && (
            <div className="mt-2 pl-4 border-l border-slate-600 space-y-1">
              {modifierBreakdown.map((source, index) => (
                <div key={`${source.source}-${index}`} className="flex justify-between text-sm">
                  <span className="text-slate-400">{source.source}</span>
                  <span className="text-slate-300 font-mono">
                    {source.value >= 0 ? '+' : ''}{source.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {rollType === 'damage' && dice.length > 0 && (
          <div className="bg-black/20 rounded-lg p-3 mb-4">
            <div className="text-sm text-slate-300 mb-2">Damage Dice:</div>
            <div className="flex flex-wrap gap-2">
              {dice.map((diceRoll, i) => (
                <div key={`${diceRoll.die}-${i}`} className="flex gap-1">
                  {diceRoll.results.map((result, j) => (
                    <span
                      key={`${diceRoll.die}-${i}-${j}`}
                      className={`w-8 h-8 flex items-center justify-center rounded bg-red-900/50 border border-red-600 font-mono font-bold ${
                        result === parseInt(diceRoll.die.replace('d', ''), 10)
                          ? 'text-yellow-300'
                          : 'text-red-200'
                      }`}
                    >
                      {result}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {settings.enableAINarration &&
          (currentRoll.isCriticalSuccess || currentRoll.isCriticalFailure) && (
            <div className="mb-4">
              {isLoadingNarration ? (
                <div className="text-center text-slate-400 animate-pulse">
                  <Sparkles className="w-5 h-5 mx-auto mb-2" />
                  The Narrator speaks...
                </div>
              ) : narration ? (
                <RollNarration
                  narration={narration}
                  isCritical={currentRoll.isCriticalSuccess || currentRoll.isCriticalFailure}
                />
              ) : null}
            </div>
          )}

        <div className="flex gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${rollName}: ${total}`)
            }}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded flex items-center justify-center gap-2 text-sm"
            type="button"
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
          <button
            onClick={() => sendToDiscord(currentRoll)}
            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded flex items-center justify-center gap-2 text-sm"
            type="button"
          >
            <Send className="w-4 h-4" />
            Discord
          </button>
        </div>
      </div>
    </div>
  )
}
