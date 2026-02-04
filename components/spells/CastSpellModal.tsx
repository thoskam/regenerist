'use client'

import { useMemo, useState } from 'react'
import { X, Sparkles, Clock } from 'lucide-react'
import { useRoller } from '@/lib/dice/useRoller'

interface SpellSlotState {
  used: number
  max: number
}

interface CastSpellModalProps {
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
  }
  spellSlots: Record<string, SpellSlotState>
  pactSlots: { used: number; max: number; level: number }
  currentConcentration: string | null
  characterSlug: string
  onClose: () => void
  onCast: () => void
  spellAttackBonus: number
  spellAttackBreakdown: { source: string; value: number }[]
  characterId: string
  characterName: string
}

export default function CastSpellModal({
  spell,
  spellSlots,
  pactSlots,
  currentConcentration,
  characterSlug,
  onClose,
  onCast,
  spellAttackBonus,
  spellAttackBreakdown,
  characterId,
  characterName,
}: CastSpellModalProps) {
  const { makeAttackRoll, makeFeatureDamageRoll } = useRoller({
    characterId,
    characterName,
  })
  const isCantrip = spell.level === 0
  const canCastAsRitual = spell.ritual
  const requiresConcentration = spell.concentration
  const hasHigherLevelEffect = Boolean(spell.higherLevels)

  const availableSlotLevels = useMemo(() => {
    if (isCantrip) return []
    const levels: number[] = []
    for (let i = spell.level; i <= 9; i += 1) {
      const slot = spellSlots[i.toString()]
      if (slot && slot.max > 0) {
        levels.push(i)
      }
    }
    return levels
  }, [isCantrip, spell.level, spellSlots])

  const initialSlotLevel = !isCantrip && availableSlotLevels.length > 0 ? availableSlotLevels[0] : null
  const [selectedSlotLevel, setSelectedSlotLevel] = useState<number | 'pact' | 'ritual' | null>(
    isCantrip ? null : initialSlotLevel
  )
  const [isCasting, setIsCasting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasAvailableSlot = (level: number): boolean => {
    const slot = spellSlots[level.toString()]
    return slot ? slot.used < slot.max : false
  }

  const canUsePactSlot = (): boolean => {
    return pactSlots.max > 0 && pactSlots.used < pactSlots.max && pactSlots.level >= spell.level
  }

  const handleCast = async () => {
    if (!characterSlug) return
    setIsCasting(true)
    setError(null)

    try {
      if (!isCantrip) {
        if (selectedSlotLevel === null) {
          setError('Please select a spell slot level')
          setIsCasting(false)
          return
        }

        if (selectedSlotLevel === 'ritual') {
          // Ritual casting does not consume slots
        } else if (selectedSlotLevel === 'pact') {
          const res = await fetch(`/api/characters/${characterSlug}/active-state/pact-slots`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'use' }),
          })

          if (!res.ok) {
            throw new Error('Failed to use pact slot')
          }
        } else {
          const res = await fetch(`/api/characters/${characterSlug}/active-state/spell-slots`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level: selectedSlotLevel, action: 'use' }),
          })

          if (!res.ok) {
            throw new Error('Failed to use spell slot')
          }
        }
      }

      if (requiresConcentration) {
        await fetch(`/api/characters/${characterSlug}/active-state/concentration`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spellName: spell.name }),
        })
      }

      const attackType = getSpellAttackType(spell.description)
      if (attackType) {
        makeAttackRoll(spell.name, spellAttackBonus, spellAttackBreakdown)
      }

      const damageDice = getSpellDamageDice(spell.description)
      if (damageDice) {
        makeFeatureDamageRoll(spell.name, damageDice)
      }

      onCast()
      onClose()
    } catch (err) {
      setError('Failed to cast spell. Please try again.')
      setIsCasting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between p-4 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Cast {spell.name}
            </h2>
            <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
              <span>{isCantrip ? 'Cantrip' : `Level ${spell.level}`}</span>
              <span>•</span>
              <span>{spell.school}</span>
              {requiresConcentration && (
                <>
                  <span>•</span>
                  <span className="text-yellow-400">⟳ Concentration</span>
                </>
              )}
              {canCastAsRitual && (
                <>
                  <span>•</span>
                  <span className="text-blue-400">📖 Ritual</span>
                </>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-700">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Casting Time</span>
              <p className="font-medium">{spell.castingTime}</p>
            </div>
            <div>
              <span className="text-slate-400">Range</span>
              <p className="font-medium">{spell.range}</p>
            </div>
            <div>
              <span className="text-slate-400">Duration</span>
              <p className="font-medium">{spell.duration}</p>
            </div>
          </div>
        </div>

        {!isCantrip && (
          <div className="p-4 border-b border-slate-700">
            <h3 className="font-medium mb-3">Select Spell Slot</h3>

            <div className="grid grid-cols-3 gap-2 mb-3">
              {availableSlotLevels.map((level) => {
                const slot = spellSlots[level.toString()]
                const available = slot.max - slot.used
                const isSelected = selectedSlotLevel === level
                const isDisabled = available === 0
                const isUpcast = level > spell.level

                return (
                  <button
                    key={level}
                    onClick={() => !isDisabled && setSelectedSlotLevel(level)}
                    disabled={isDisabled}
                    className={`
                      p-3 rounded-lg border text-center transition-all
                      ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/20'
                          : isDisabled
                            ? 'border-slate-700 bg-slate-900 opacity-50 cursor-not-allowed'
                            : 'border-slate-600 hover:border-slate-500'
                      }
                    `}
                  >
                    <div className="font-bold">
                      Level {level}
                      {isUpcast && <span className="text-green-400 text-xs ml-1">↑</span>}
                    </div>
                    <div className="text-sm text-slate-400">
                      {available}/{slot.max} slots
                    </div>
                    <div className="flex justify-center gap-1 mt-1">
                      {Array.from({ length: slot.max }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i < slot.used ? 'bg-slate-600' : 'bg-purple-500'
                          }`}
                        />
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>

            {pactSlots.max > 0 && pactSlots.level >= spell.level && (
              <div className="mb-3">
                <button
                  onClick={() => canUsePactSlot() && setSelectedSlotLevel('pact')}
                  disabled={!canUsePactSlot()}
                  className={`
                    w-full p-3 rounded-lg border text-center transition-all
                    ${
                      selectedSlotLevel === 'pact'
                        ? 'border-fuchsia-500 bg-fuchsia-500/20'
                        : !canUsePactSlot()
                          ? 'border-slate-700 bg-slate-900 opacity-50 cursor-not-allowed'
                          : 'border-slate-600 hover:border-slate-500'
                    }
                  `}
                >
                  <div className="font-bold text-fuchsia-400">
                    Pact Magic (Level {pactSlots.level})
                  </div>
                  <div className="text-sm text-slate-400">
                    {pactSlots.max - pactSlots.used}/{pactSlots.max} slots
                  </div>
                  <div className="flex justify-center gap-1 mt-1">
                    {Array.from({ length: pactSlots.max }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < pactSlots.used ? 'bg-slate-600' : 'bg-fuchsia-500'
                        }`}
                      />
                    ))}
                  </div>
                </button>
              </div>
            )}

            {canCastAsRitual && (
              <button
                onClick={() => setSelectedSlotLevel('ritual')}
                className={`
                  w-full p-3 rounded-lg border text-center transition-all
                  ${
                    selectedSlotLevel === 'ritual'
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-slate-600 hover:border-slate-500'
                  }
                `}
              >
                <div className="font-bold text-blue-400 flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4" />
                  Cast as Ritual
                </div>
                <div className="text-sm text-slate-400">
                  +10 minutes casting time, no slot expended
                </div>
              </button>
            )}

            {hasHigherLevelEffect &&
              selectedSlotLevel &&
              typeof selectedSlotLevel === 'number' &&
              selectedSlotLevel > spell.level && (
                <div className="mt-3 p-3 bg-green-900/20 border border-green-600/30 rounded-lg">
                  <h4 className="text-sm font-medium text-green-400 mb-1">At Higher Levels</h4>
                  <p className="text-sm text-slate-300">{spell.higherLevels}</p>
                </div>
              )}
          </div>
        )}

        {requiresConcentration && currentConcentration && (
          <div className="p-4 bg-yellow-900/20 border-y border-yellow-600/30">
            <p className="text-sm text-yellow-400">
              ⚠️ You are currently concentrating on{' '}
              <strong>{currentConcentration}</strong>. Casting this spell will break that concentration.
            </p>
          </div>
        )}

        {error && (
          <div className="px-4 py-2 bg-red-900/20 text-red-400 text-sm">{error}</div>
        )}

        <div className="p-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleCast}
            disabled={isCasting || (!isCantrip && selectedSlotLevel === null)}
            className={`
              flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-2
              ${
                isCasting || (!isCantrip && selectedSlotLevel === null)
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-500'
              }
            `}
          >
            <Sparkles className="w-4 h-4" />
            {isCasting ? 'Casting...' : isCantrip ? 'Cast Cantrip' : 'Cast Spell'}
          </button>
        </div>
      </div>
    </div>
  )
}

function getSpellAttackType(description: string) {
  if (/melee spell attack/i.test(description)) return 'melee'
  if (/ranged spell attack/i.test(description)) return 'ranged'
  if (/spell attack/i.test(description)) return 'spell'
  return null
}

function getSpellDamageDice(description: string) {
  const match = description.match(/\d+d\d+(?:\s*[+-]\s*\d+)*/i)
  return match ? match[0].replace(/\s+/g, '') : null
}
