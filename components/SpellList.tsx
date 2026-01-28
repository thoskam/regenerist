'use client'

import { useState } from 'react'
import type { HydratedSpell, HydratedSpellbook } from '@/lib/types/5etools'

interface Stats {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

interface SpellListProps {
  selectedSpellbook?: HydratedSpellbook | null
  allAvailableSpells?: HydratedSpell[]  // All spells available to this class
  maxSpellLevel: number
  spellcastingAbility: string
  stats: Stats
  proficiencyBonus: number
  // For editing
  slug?: string
  lifeId?: number
  onSpellbookUpdate?: (spellbook: { spellNames: string[]; archivistNote: string }) => void
}

const ABILITY_LABELS: Record<string, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
}

const SCHOOL_COLORS: Record<string, string> = {
  Abjuration: 'text-blue-400',
  Conjuration: 'text-yellow-400',
  Divination: 'text-purple-400',
  Enchantment: 'text-pink-400',
  Evocation: 'text-red-400',
  Illusion: 'text-indigo-400',
  Necromancy: 'text-green-400',
  Transmutation: 'text-orange-400',
}

function getStatModifier(stat: number): number {
  return Math.floor((stat - 10) / 2)
}

function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export default function SpellList({
  selectedSpellbook,
  allAvailableSpells,
  maxSpellLevel,
  spellcastingAbility,
  stats,
  proficiencyBonus,
  slug,
  lifeId,
  onSpellbookUpdate,
}: SpellListProps) {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)
  const [expandedSpell, setExpandedSpell] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editedSpellNames, setEditedSpellNames] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Use selected spellbook if available, otherwise fall back to all available spells
  const selectedSpells = selectedSpellbook?.spells || []
  const availableSpells = allAvailableSpells || []

  // Calculate spellcasting stats
  const abilityMod = getStatModifier(stats[spellcastingAbility as keyof Stats] || 10)
  const spellSaveDC = 8 + proficiencyBonus + abilityMod
  const spellAttackBonus = proficiencyBonus + abilityMod

  // When entering edit mode, initialize with current spellbook
  const handleStartEditing = () => {
    setEditedSpellNames(selectedSpellbook?.spells.map(s => s.name) || [])
    setIsEditing(true)
  }

  const handleCancelEditing = () => {
    setIsEditing(false)
    setEditedSpellNames([])
  }

  const handleAddSpell = (spellName: string) => {
    if (!editedSpellNames.includes(spellName)) {
      setEditedSpellNames([...editedSpellNames, spellName])
    }
  }

  const handleRemoveSpell = (spellName: string) => {
    setEditedSpellNames(editedSpellNames.filter(n => n !== spellName))
  }

  const handleSaveSpellbook = async () => {
    if (!slug || !lifeId) return

    setIsSaving(true)
    try {
      const newSpellbook = {
        spellNames: editedSpellNames,
        archivistNote: selectedSpellbook?.archivistNote || 'A custom spell selection.',
      }

      const res = await fetch(`/api/characters/${slug}/lives/${lifeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spellbook: newSpellbook }),
      })

      if (res.ok) {
        setIsEditing(false)
        if (onSpellbookUpdate) {
          onSpellbookUpdate(newSpellbook)
        }
      }
    } catch (error) {
      console.error('Failed to save spellbook:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Determine which spells to show based on edit mode
  const spellsToShow = isEditing ? availableSpells : (selectedSpells.length > 0 ? selectedSpells : availableSpells)

  // Group spells by level
  const spellsByLevel = spellsToShow.reduce((acc, spell) => {
    const level = spell.level
    if (!acc[level]) acc[level] = []
    acc[level].push(spell)
    return acc
  }, {} as Record<number, HydratedSpell[]>)

  // Sort spells alphabetically within each level
  Object.values(spellsByLevel).forEach((levelSpells) => {
    levelSpells.sort((a, b) => a.name.localeCompare(b.name))
  })

  const levels = Object.keys(spellsByLevel)
    .map(Number)
    .filter((l) => l <= maxSpellLevel)
    .sort((a, b) => a - b)

  // Filter spells by search query
  const filteredSpells = selectedLevel !== null
    ? (spellsByLevel[selectedLevel] || []).filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  // Check if spell is in edited list
  const isSpellSelected = (spellName: string) => editedSpellNames.includes(spellName)

  // Check if we can edit (need slug, lifeId, and available spells)
  const canEdit = slug && lifeId && availableSpells.length > 0

  if (spellsToShow.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <p className="text-sm text-slate-500 text-center">No spells available yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-4">
      {/* Spellcasting Stats Block */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-700/50 rounded p-2">
          <span className="text-xs text-slate-400 block">Ability</span>
          <span className="text-sm font-medium text-gold-400">
            {ABILITY_LABELS[spellcastingAbility] || spellcastingAbility}
          </span>
        </div>
        <div className="bg-slate-700/50 rounded p-2">
          <span className="text-xs text-slate-400 block">Save DC</span>
          <span className="text-sm font-bold text-white">{spellSaveDC}</span>
        </div>
        <div className="bg-slate-700/50 rounded p-2">
          <span className="text-xs text-slate-400 block">Attack</span>
          <span className="text-sm font-bold text-white">{formatModifier(spellAttackBonus)}</span>
        </div>
      </div>

      {/* Archivist's Note (only show when not editing) */}
      {!isEditing && selectedSpellbook?.archivistNote && (
        <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gold-400 text-xs font-semibold tracking-wider">THE ARCHIVIST&apos;S NOTE</span>
          </div>
          <p className="text-sm text-slate-300 italic leading-relaxed">
            &ldquo;{selectedSpellbook.archivistNote}&rdquo;
          </p>
        </div>
      )}

      {/* Header with Edit Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs text-slate-400 font-semibold tracking-wider">
          {isEditing ? 'EDIT SPELLS' : (selectedSpellbook ? 'PREPARED SPELLS' : 'AVAILABLE SPELLS')}
        </h3>
        <div className="flex items-center gap-2">
          {isEditing && (
            <span className="text-xs text-gold-400">
              {editedSpellNames.length} selected
            </span>
          )}
          {!isEditing && (
            <span className="text-xs text-slate-500">
              {selectedSpells.length > 0 ? selectedSpells.length : spellsToShow.length} spell{(selectedSpells.length > 0 ? selectedSpells.length : spellsToShow.length) !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Edit Mode Controls */}
      {canEdit && (
        <div className="flex gap-2">
          {!isEditing ? (
            <button
              onClick={handleStartEditing}
              className="flex-1 px-3 py-1.5 text-xs font-medium bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
            >
              Edit Spells
            </button>
          ) : (
            <>
              <button
                onClick={handleSaveSpellbook}
                disabled={isSaving}
                className="flex-1 px-3 py-1.5 text-xs font-medium bg-gold-500 text-slate-900 rounded hover:bg-gold-400 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancelEditing}
                disabled={isSaving}
                className="px-3 py-1.5 text-xs font-medium bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      {/* Spell level tabs */}
      <div className="flex flex-wrap gap-2">
        {levels.map((level) => (
          <button
            key={level}
            onClick={() => {
              setSelectedLevel(selectedLevel === level ? null : level)
              setExpandedSpell(null)
            }}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              selectedLevel === level
                ? 'bg-gold-500 text-slate-900'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {level === 0 ? 'Cantrips' : `${level}${getOrdinalSuffix(level)}`}
            <span className="ml-1 text-xs opacity-70">
              ({spellsByLevel[level]?.length || 0})
            </span>
          </button>
        ))}
      </div>

      {/* Spell list for selected level */}
      {selectedLevel !== null && (
        <>
          {/* Search input */}
          <div>
            <input
              type="text"
              placeholder="Search spells..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-gold-500"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredSpells.length === 0 ? (
              <p className="text-sm text-slate-500 py-2">No spells found</p>
            ) : (
              filteredSpells.map((spell) => {
                const isSelected = isSpellSelected(spell.name)
                return (
                  <div
                    key={spell.name}
                    className={`border rounded-lg overflow-hidden ${
                      isEditing && isSelected
                        ? 'border-gold-500 bg-gold-500/10'
                        : 'border-slate-600 bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center">
                      {/* Add/Remove button in edit mode */}
                      {isEditing && (
                        <button
                          onClick={() => isSelected ? handleRemoveSpell(spell.name) : handleAddSpell(spell.name)}
                          className={`px-3 py-2 text-lg transition-colors ${
                            isSelected
                              ? 'text-red-400 hover:text-red-300'
                              : 'text-green-400 hover:text-green-300'
                          }`}
                        >
                          {isSelected ? '−' : '+'}
                        </button>
                      )}

                      <button
                        onClick={() => setExpandedSpell(expandedSpell === spell.name ? null : spell.name)}
                        className="flex-1 px-3 py-2 flex items-center justify-between text-left hover:bg-slate-700/80 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isEditing && isSelected ? 'text-gold-400' : 'text-slate-200'}`}>
                            {spell.name}
                          </span>
                          <span className={`text-xs ${SCHOOL_COLORS[spell.school] || 'text-slate-400'}`}>
                            {spell.school}
                          </span>
                        </div>
                        <span
                          className={`text-slate-500 transition-transform text-xs ${
                            expandedSpell === spell.name ? 'rotate-180' : ''
                          }`}
                        >
                          ▼
                        </span>
                      </button>
                    </div>

                    {expandedSpell === spell.name && (
                      <div className="px-3 py-2 border-t border-slate-600 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-500">Casting Time:</span>{' '}
                            <span className="text-slate-300">{spell.castingTime}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Range:</span>{' '}
                            <span className="text-slate-300">{spell.range}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Components:</span>{' '}
                            <span className="text-slate-300">{spell.components}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Duration:</span>{' '}
                            <span className="text-slate-300">{spell.duration}</span>
                          </div>
                        </div>
                        <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap pt-1 border-t border-slate-600">
                          {spell.description}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {selectedLevel === null && (
        <p className="text-sm text-slate-500 text-center py-2">
          Select a spell level to view spells
        </p>
      )}
    </div>
  )
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}
