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
  const { makeAttackRoll, makeFeatureDamageRoll, makeHealingRoll } = useRoller({ characterId, characterName })
  const isAvailable = checkActionAvailable(action, activeState)
  const timingLabel = action.timing.charAt(0).toUpperCase() + action.timing.slice(1)

  const hasDamageDice = action.damageDice && !action.damageDice.startsWith('+') && !action.damageDice.startsWith('up to')
  const hasHealingDice = action.healingDice && !action.healingDice.startsWith('up to')
  const hasRollableMechanics = hasDamageDice || hasHealingDice

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

  const handleRollDamage = () => {
    if (!isAvailable) return
    if (action.damageDice) {
      makeFeatureDamageRoll(action.name, action.damageDice, action.damageType)
    }
  }

  const handleRollHealing = () => {
    if (!isAvailable) return
    if (action.healingDice) {
      makeHealingRoll(action.name, action.healingDice)
    }
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

      {/* Feature mechanics: damage dice, save DC */}
      {!action.isAttack && !action.isSpell && (action.damageDice || action.healingDice || action.saveDC) && (
        <div className="flex flex-wrap gap-3 text-sm mb-2">
          {action.damageDice && (
            <span className="text-red-400">
              {action.damageDice} {action.damageType && <span className="text-red-300">{action.damageType}</span>}
            </span>
          )}
          {action.healingDice && (
            <span className="text-green-400">
              {action.healingDice} healing
            </span>
          )}
          {typeof action.saveDC === 'number' && action.saveAbility && (
            <span className="text-cyan-400">
              DC {action.saveDC} {action.saveAbility}
            </span>
          )}
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
            <span className="text-yellow-400">Concentration</span>
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

      {/* Scaling note */}
      {action.scalingNote && (
        <p className="text-xs text-slate-500 italic mt-1">
          {action.scalingNote}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        {/* Primary Use/Attack/Cast button */}
        {(action.isLimited || action.isAttack || action.isSpell) && (
          <button
            onClick={handleActionClick}
            disabled={!isAvailable}
            className={`flex-1 py-1 rounded text-sm font-medium ${
              isAvailable
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {action.isAttack ? 'Roll Attack' : action.isSpell ? 'Cast' : 'Use'}
          </button>
        )}

        {/* Roll Damage button for features with damage dice */}
        {hasDamageDice && (
          <button
            onClick={handleRollDamage}
            disabled={!isAvailable}
            className={`py-1 px-3 rounded text-sm font-medium ${
              isAvailable
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            Roll Damage
          </button>
        )}

        {/* Roll Healing button for features with healing dice */}
        {hasHealingDice && (
          <button
            onClick={handleRollHealing}
            disabled={!isAvailable}
            className={`py-1 px-3 rounded text-sm font-medium ${
              isAvailable
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            Roll Healing
          </button>
        )}

        {/* Stand-alone Roll Damage for non-limited features */}
        {!action.isLimited && !action.isAttack && !action.isSpell && hasRollableMechanics && !hasDamageDice && !hasHealingDice && (
          <button
            onClick={hasDamageDice ? handleRollDamage : handleRollHealing}
            className="flex-1 py-1 rounded text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white"
          >
            Roll
          </button>
        )}
      </div>
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
