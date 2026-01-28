'use client'

import { useState } from 'react'
import type { HydratedSpell } from '@/lib/types/5etools'

interface SpellListProps {
  spells: HydratedSpell[]
  maxSpellLevel: number
  spellcastingAbility: string
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

export default function SpellList({ spells, maxSpellLevel, spellcastingAbility }: SpellListProps) {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)
  const [expandedSpell, setExpandedSpell] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Group spells by level
  const spellsByLevel = spells.reduce((acc, spell) => {
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

  if (spells.length === 0) {
    return null
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs text-slate-400 font-semibold tracking-wider">SPELLS</h3>
        <span className="text-xs text-slate-500">
          {ABILITY_LABELS[spellcastingAbility] || spellcastingAbility}
        </span>
      </div>

      {/* Spell level tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
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
          <div className="mb-3">
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
              filteredSpells.map((spell) => (
                <div
                  key={spell.name}
                  className="border border-slate-600 rounded-lg overflow-hidden bg-slate-700/50"
                >
                  <button
                    onClick={() => setExpandedSpell(expandedSpell === spell.name ? null : spell.name)}
                    className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-700/80 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-200">{spell.name}</span>
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
              ))
            )}
          </div>
        </>
      )}

      {selectedLevel === null && (
        <p className="text-sm text-slate-500 text-center py-4">
          Select a spell level to view available spells
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
