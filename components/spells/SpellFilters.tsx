'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'

export interface SpellFilterState {
  search: string
  levels: number[]
  schools: string[]
  concentrationOnly: boolean
  ritualOnly: boolean
  preparedOnly: boolean
  castingTime: 'all' | 'action' | 'bonus' | 'reaction' | 'other'
}

export const defaultFilters: SpellFilterState = {
  search: '',
  levels: [],
  schools: [],
  concentrationOnly: false,
  ritualOnly: false,
  preparedOnly: false,
  castingTime: 'all',
}

interface SpellFiltersProps {
  filters: SpellFilterState
  onChange: (filters: SpellFilterState) => void
  showPreparedFilter?: boolean
  availableSchools: string[]
  availableLevels: number[]
  maxSpellLevel: number
}

const SCHOOL_ICONS: Record<string, string> = {
  Abjuration: '🛡️',
  Conjuration: '🌀',
  Divination: '👁️',
  Enchantment: '💫',
  Evocation: '🔥',
  Illusion: '🎭',
  Necromancy: '💀',
  Transmutation: '🔄',
}

const SCHOOL_COLORS: Record<string, string> = {
  Abjuration: 'bg-blue-500/20 border-blue-500 text-blue-400',
  Conjuration: 'bg-amber-500/20 border-amber-500 text-amber-400',
  Divination: 'bg-purple-500/20 border-purple-500 text-purple-400',
  Enchantment: 'bg-pink-500/20 border-pink-500 text-pink-400',
  Evocation: 'bg-red-500/20 border-red-500 text-red-400',
  Illusion: 'bg-indigo-500/20 border-indigo-500 text-indigo-400',
  Necromancy: 'bg-emerald-800/30 border-emerald-700 text-emerald-400',
  Transmutation: 'bg-orange-500/20 border-orange-500 text-orange-400',
}

function hasActiveFilters(filters: SpellFilterState): boolean {
  return (
    filters.search !== '' ||
    filters.levels.length > 0 ||
    filters.schools.length > 0 ||
    filters.concentrationOnly ||
    filters.ritualOnly ||
    filters.preparedOnly ||
    filters.castingTime !== 'all'
  )
}

export default function SpellFilters({
  filters,
  onChange,
  showPreparedFilter = false,
  availableSchools,
  availableLevels,
  maxSpellLevel,
}: SpellFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleLevel = (level: number) => {
    const newLevels = filters.levels.includes(level)
      ? filters.levels.filter(l => l !== level)
      : [...filters.levels, level]
    onChange({ ...filters, levels: newLevels })
  }

  const toggleSchool = (school: string) => {
    const newSchools = filters.schools.includes(school)
      ? filters.schools.filter(s => s !== school)
      : [...filters.schools, school]
    onChange({ ...filters, schools: newSchools })
  }

  const activeFilterCount = [
    filters.levels.length > 0,
    filters.schools.length > 0,
    filters.concentrationOnly,
    filters.ritualOnly,
    filters.preparedOnly,
    filters.castingTime !== 'all',
  ].filter(Boolean).length

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search spells..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-gold-500"
        />
        {filters.search && (
          <button
            onClick={() => onChange({ ...filters, search: '' })}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand/Collapse Filters Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300"
      >
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="bg-gold-500 text-slate-900 text-xs px-1.5 py-0.5 rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="space-y-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          {/* Level Filter */}
          <div>
            <span className="text-xs text-slate-400 font-medium block mb-2">SPELL LEVEL</span>
            <div className="flex flex-wrap gap-1.5">
              {availableLevels.filter(l => l <= maxSpellLevel).map(level => (
                <button
                  key={level}
                  onClick={() => toggleLevel(level)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    filters.levels.includes(level)
                      ? 'bg-gold-500 text-slate-900'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {level === 0 ? 'Cantrip' : level}
                </button>
              ))}
            </div>
          </div>

          {/* School Filter */}
          <div>
            <span className="text-xs text-slate-400 font-medium block mb-2">SCHOOL</span>
            <div className="flex flex-wrap gap-1.5">
              {availableSchools.map(school => (
                <button
                  key={school}
                  onClick={() => toggleSchool(school)}
                  className={`px-2 py-1 rounded text-xs font-medium border transition-colors flex items-center gap-1 ${
                    filters.schools.includes(school)
                      ? SCHOOL_COLORS[school] || 'bg-gold-500/20 border-gold-500 text-gold-400'
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <span>{SCHOOL_ICONS[school] || '✨'}</span>
                  <span>{school}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Filters */}
          <div>
            <span className="text-xs text-slate-400 font-medium block mb-2">PROPERTIES</span>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.concentrationOnly}
                  onChange={(e) => onChange({ ...filters, concentrationOnly: e.target.checked })}
                  className="rounded bg-slate-700 border-slate-600 text-gold-500 focus:ring-gold-500"
                />
                <span className="text-yellow-400">⟳</span>
                <span className="text-slate-300">Concentration</span>
              </label>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.ritualOnly}
                  onChange={(e) => onChange({ ...filters, ritualOnly: e.target.checked })}
                  className="rounded bg-slate-700 border-slate-600 text-gold-500 focus:ring-gold-500"
                />
                <span className="text-blue-400">ℛ</span>
                <span className="text-slate-300">Ritual</span>
              </label>

              {showPreparedFilter && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.preparedOnly}
                    onChange={(e) => onChange({ ...filters, preparedOnly: e.target.checked })}
                    className="rounded bg-slate-700 border-slate-600 text-gold-500 focus:ring-gold-500"
                  />
                  <span className="text-green-400">✓</span>
                  <span className="text-slate-300">Prepared Only</span>
                </label>
              )}
            </div>
          </div>

          {/* Casting Time Filter */}
          <div>
            <span className="text-xs text-slate-400 font-medium block mb-2">CASTING TIME</span>
            <select
              value={filters.castingTime}
              onChange={(e) => onChange({ ...filters, castingTime: e.target.value as SpellFilterState['castingTime'] })}
              className="bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-gold-500"
            >
              <option value="all">All</option>
              <option value="action">Action</option>
              <option value="bonus">Bonus Action</option>
              <option value="reaction">Reaction</option>
              <option value="other">Other (Minutes/Hours)</option>
            </select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters(filters) && (
            <button
              onClick={() => onChange({ ...defaultFilters, search: filters.search })}
              className="text-sm text-gold-400 hover:text-gold-300 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Filter spells based on filter state
 */
export function filterSpells<T extends {
  name: string
  level: number
  school: string
  concentration: boolean
  ritual: boolean
  castingTime: string
}>(
  spells: T[],
  filters: SpellFilterState,
  preparedSpells?: string[]
): T[] {
  return spells.filter(spell => {
    // Search filter
    if (filters.search && !spell.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }

    // Level filter
    if (filters.levels.length > 0 && !filters.levels.includes(spell.level)) {
      return false
    }

    // School filter
    if (filters.schools.length > 0 && !filters.schools.includes(spell.school)) {
      return false
    }

    // Concentration filter
    if (filters.concentrationOnly && !spell.concentration) {
      return false
    }

    // Ritual filter
    if (filters.ritualOnly && !spell.ritual) {
      return false
    }

    // Prepared filter
    if (filters.preparedOnly && preparedSpells && !preparedSpells.includes(spell.name)) {
      return false
    }

    // Casting time filter
    if (filters.castingTime !== 'all') {
      const time = spell.castingTime.toLowerCase()
      switch (filters.castingTime) {
        case 'action':
          if (!time.includes('action') || time.includes('bonus')) return false
          break
        case 'bonus':
          if (!time.includes('bonus')) return false
          break
        case 'reaction':
          if (!time.includes('reaction')) return false
          break
        case 'other':
          if (time.includes('action') || time.includes('reaction')) return false
          break
      }
    }

    return true
  })
}
