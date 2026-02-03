'use client'

import type { CharacterAction, ActionTiming } from '@/lib/actions/types'
import type { HydratedActiveState } from '@/lib/types/5etools'
import { useRoller } from '@/lib/dice/useRoller'

interface ActionCardProps {
  action: CharacterAction
  activeState: HydratedActiveState | null
  onUse: () => void
  characterId: string
  characterName: string
}

export default function ActionCard({
  action,
  activeState,
  onUse,
  characterId,
  characterName,
}: ActionCardProps) {
  const { makeAttackRoll } = useRoller({ characterId, characterName })
  const isAvailable = checkActionAvailable(action, activeState)
  const timingLabel = action.timing.charAt(0).toUpperCase() + action.timing.slice(1)

  const handleActionClick = () => {
    if (!isAvailable) return

    if (action.isAttack && typeof action.attackBonus === 'number') {
      makeAttackRoll(
        action.name,
        action.attackBonus,
        [{ source: 'Attack Bonus', value: action.attackBonus }]
      )
      if (action.isLimited) {
        onUse()
      }
      return
    }

    onUse()
  }

  return (
    <div
      className={`border rounded-lg p-4 transition-colors ${
        isAvailable ? 'bg-slate-800 border-slate-600' : 'bg-slate-900 border-slate-700 opacity-60'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-white leading-snug">{action.name}</h4>
          <span className="text-xs text-slate-400">{action.sourceName}</span>
        </div>

        <span className={`text-xs px-2 py-1 rounded ${getTimingColor(action.timing)}`}>
          {timingLabel}
        </span>
      </div>

      {action.isAttack && (
        <div className="flex gap-4 text-sm mb-2">
          {typeof action.attackBonus === 'number' && (
            <span className="text-green-400">+{action.attackBonus} to hit</span>
          )}
          {action.damage && <span className="text-red-400">{action.damage}</span>}
          {action.range && <span className="text-slate-400">{action.range}</span>}
        </div>
      )}

      {action.isSpell && (
        <div className="flex gap-2 text-xs mb-2">
          {action.isCantrip ? (
            <span className="text-purple-400">Cantrip</span>
          ) : (
            <span className="text-blue-400">Level {action.spellLevel}</span>
          )}
          {action.requiresConcentration && (
            <span className="text-yellow-400">⟳ Concentration</span>
          )}
          {action.spellSchool && <span className="text-slate-400">{action.spellSchool}</span>}
          {typeof action.saveDC === 'number' && (
            <span className="text-slate-400">DC {action.saveDC}</span>
          )}
        </div>
      )}

      {action.isLimited && action.featureKey && (
        <div className="text-sm text-amber-400 mb-2">
          {action.usesRemaining ?? 0}/{action.maxUses ?? 0} uses
          {action.recharge ? ` (${action.recharge} rest)` : ''}
        </div>
      )}

      <p className="text-sm text-slate-300">
        {action.shortDescription || action.description}
      </p>

      {(action.isLimited || action.isAttack || action.isSpell) && (
        <button
          onClick={handleActionClick}
          disabled={!isAvailable}
          className={`mt-3 w-full py-1 rounded text-sm font-medium ${
            isAvailable
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {action.isAttack ? 'Roll Attack' : action.isSpell ? 'Cast' : 'Use'}
        </button>
      )}
    </div>
  )
}

function checkActionAvailable(action: CharacterAction, activeState: HydratedActiveState | null): boolean {
  if (!action.isLimited) return true
  if (!action.featureKey || !activeState?.limitedFeatures) return true

  const feature = activeState.limitedFeatures[action.featureKey]
  if (!feature) return true

  return feature.used < feature.max
}

function getTimingColor(timing: ActionTiming): string {
  switch (timing) {
    case 'action':
      return 'bg-amber-600'
    case 'bonus':
      return 'bg-green-600'
    case 'reaction':
      return 'bg-blue-600'
    case 'special':
      return 'bg-purple-600'
    case 'free':
      return 'bg-slate-600'
    case 'movement':
      return 'bg-teal-600'
    default:
      return 'bg-slate-600'
  }
}
