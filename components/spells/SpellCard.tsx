'use client'

import { useState } from 'react'
import { Sparkles, Target, Clock, Zap } from 'lucide-react'
import CastSpellModal from './CastSpellModal'

interface SpellCardProps {
  spell: {
    name: string
    level: number
    school: string
    castingTime: string
    range: string
    duration: string
    concentration: boolean
    ritual: boolean
    description: string
    higherLevels?: string
    components?: { v?: boolean; s?: boolean; m?: string }
  }
  spellSlots: Record<string, { used: number; max: number }>
  pactSlots: { used: number; max: number; level: number }
  currentConcentration: string | null
  characterSlug: string
  onCast: () => void
  spellAttackBonus: number
  spellAttackBreakdown: { source: string; value: number }[]
  characterId: string
  characterName: string
  isExpanded?: boolean
  onToggleExpand?: () => void
  // Prepared caster props
  isPreparedCaster?: boolean
  isPrepared?: boolean
  isAlwaysPrepared?: boolean
  onTogglePrepared?: () => void
}

export default function SpellCard({
  spell,
  spellSlots,
  pactSlots,
  currentConcentration,
  characterSlug,
  onCast,
  spellAttackBonus,
  spellAttackBreakdown,
  characterId,
  characterName,
  isExpanded = false,
  onToggleExpand,
  isPreparedCaster = false,
  isPrepared = true,
  isAlwaysPrepared = false,
  onTogglePrepared,
}: SpellCardProps) {
  const [showCastModal, setShowCastModal] = useState(false)

  const isCantrip = spell.level === 0
  const showPreparedToggle = isPreparedCaster && !isCantrip && !isAlwaysPrepared

  const canCast = (): boolean => {
    if (!characterSlug) return false
    if (isCantrip) return true
    if (spell.ritual) return true

    for (let i = spell.level; i <= 9; i += 1) {
      const slot = spellSlots[i.toString()]
      if (slot && slot.used < slot.max) return true
    }

    if (pactSlots.max > 0 && pactSlots.level >= spell.level && pactSlots.used < pactSlots.max) {
      return true
    }

    return false
  }

  const getSchoolColor = (school: string): string => {
    const colors: Record<string, string> = {
      abjuration: 'text-blue-400',
      conjuration: 'text-yellow-400',
      divination: 'text-purple-400',
      enchantment: 'text-pink-400',
      evocation: 'text-red-400',
      illusion: 'text-indigo-400',
      necromancy: 'text-green-400',
      transmutation: 'text-orange-400',
    }
    return colors[school.toLowerCase()] || 'text-slate-400'
  }

  const getLevelBadgeColor = (level: number): string => {
    if (level === 0) return 'bg-slate-600'
    if (level <= 2) return 'bg-green-600'
    if (level <= 4) return 'bg-blue-600'
    if (level <= 6) return 'bg-purple-600'
    if (level <= 8) return 'bg-orange-600'
    return 'bg-red-600'
  }

  const componentText = [
    spell.components?.v ? 'V' : null,
    spell.components?.s ? 'S' : null,
    spell.components?.m ? `M (${spell.components.m})` : null,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <>
      <div
        className={`
        border rounded-lg overflow-hidden transition-all
        ${
          currentConcentration === spell.name
            ? 'border-yellow-500 bg-yellow-900/10'
            : 'border-slate-700 bg-slate-800'
        }
      `}
      >
        <div
          className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-700/50"
          onClick={onToggleExpand}
        >
          <div className="flex items-center gap-3">
            <span
              className={`
              px-2 py-0.5 rounded text-xs font-bold
              ${getLevelBadgeColor(spell.level)}
            `}
            >
              {isCantrip ? 'C' : spell.level}
            </span>

            <div>
              <h4 className="font-medium flex items-center gap-2">
                {spell.name}
                {spell.concentration && (
                  <span className="text-yellow-400 text-xs" title="Concentration">
                    ⟳
                  </span>
                )}
                {spell.ritual && (
                  <span className="text-blue-400 text-xs" title="Ritual">
                    ℛ
                  </span>
                )}
                {isAlwaysPrepared && (
                  <span className="text-amber-400 text-xs" title="Always Prepared (Domain/Oath)">
                    🔒
                  </span>
                )}
              </h4>
              <span className={`text-xs ${getSchoolColor(spell.school)}`}>{spell.school}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Prepared Toggle for prepared casters */}
            {showPreparedToggle && (
              <button
                onClick={(event) => {
                  event.stopPropagation()
                  onTogglePrepared?.()
                }}
                className={`
                  px-2 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${
                    isPrepared
                      ? 'bg-green-600/20 text-green-400 border border-green-600/50 hover:bg-green-600/30'
                      : 'bg-slate-700 text-slate-400 border border-slate-600 hover:bg-slate-600'
                  }
                `}
                title={isPrepared ? 'Click to unprepare' : 'Click to prepare'}
              >
                {isPrepared ? '✓ Prepared' : 'Prepare'}
              </button>
            )}

            {/* Cast Button - only show if spell is prepared (or not a prepared caster) */}
            {(!isPreparedCaster || isPrepared || isCantrip) && (
              <button
                onClick={(event) => {
                  event.stopPropagation()
                  setShowCastModal(true)
                }}
                disabled={!canCast()}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all
                  ${
                    canCast()
                      ? 'bg-purple-600 hover:bg-purple-500 text-white'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }
                `}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Cast
              </button>
            )}
          </div>
        </div>

        {currentConcentration === spell.name && (
          <div className="px-3 py-1.5 bg-yellow-900/30 border-t border-yellow-600/30 text-sm text-yellow-400 flex items-center gap-2">
            <span>⟳</span>
            <span>Currently concentrating</span>
          </div>
        )}

        {isExpanded && (
          <div className="p-3 border-t border-slate-700 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{spell.castingTime}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-slate-400" />
                <span>{spell.range}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-slate-400" />
                <span>{spell.duration}</span>
              </div>
            </div>

            {componentText && (
              <div className="text-sm text-slate-400">
                <span className="font-medium">Components: </span>
                {componentText}
              </div>
            )}

            <p className="text-sm text-slate-300">{spell.description}</p>

            {spell.higherLevels && (
              <div className="text-sm">
                <span className="font-medium text-green-400">At Higher Levels: </span>
                <span className="text-slate-300">{spell.higherLevels}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {showCastModal && (
        <CastSpellModal
          spell={spell}
          spellSlots={spellSlots}
          pactSlots={pactSlots}
          currentConcentration={currentConcentration}
          characterSlug={characterSlug}
          onClose={() => setShowCastModal(false)}
          onCast={onCast}
          spellAttackBonus={spellAttackBonus}
          spellAttackBreakdown={spellAttackBreakdown}
          characterId={characterId}
          characterName={characterName}
        />
      )}
    </>
  )
}
