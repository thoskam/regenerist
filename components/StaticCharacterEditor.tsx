'use client'

import { useState } from 'react'
import PointBuyCalculator from './PointBuyCalculator'
import AlignmentPicker from './AlignmentPicker'
import { Stats } from '@/lib/statMapper'
import races from '@/lib/data/races.json'
import classes from '@/lib/data/classes.json'

interface StaticCharacterEditorProps {
  characterName: string
  currentRace: string
  currentClass: string
  currentSubclass: string
  currentLevel: number
  currentStats: Stats
  currentStatBonuses?: Stats
  currentStory: string
  currentEffect: string
  currentAlignment?: string
  onSave: (data: EditorData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  isRegenerist?: boolean
}

export interface EditorData {
  race: string
  class: string
  subclass: string
  level: number
  stats: Stats
  statBonuses: Stats
  alignment: string
  story: string
  effect: string
}

const STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const
const STAT_LABELS: Record<keyof Stats, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
}

const ZERO_BONUSES: Stats = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }

export default function StaticCharacterEditor({
  characterName,
  currentRace,
  currentClass,
  currentSubclass,
  currentLevel,
  currentStats,
  currentStatBonuses,
  currentStory,
  currentEffect,
  currentAlignment = '',
  onSave,
  onCancel,
  isLoading = false,
  isRegenerist = false,
}: StaticCharacterEditorProps) {
  const [race, setRace] = useState(currentRace)
  const [selectedClass, setSelectedClass] = useState(`${currentClass}: ${currentSubclass}`)
  const [level, setLevel] = useState(currentLevel)
  const [stats, setStats] = useState<Stats>(currentStats)
  const [statBonuses, setStatBonuses] = useState<Stats>(currentStatBonuses ?? ZERO_BONUSES)
  const [alignment, setAlignment] = useState(currentAlignment)
  const [story, setStory] = useState(currentStory)
  const [effect, setEffect] = useState(currentEffect)
  const [activeTab, setActiveTab] = useState<'basic' | 'stats' | 'story'>('basic')

  const handleSave = async () => {
    const [className, subclass] = selectedClass.split(': ')
    await onSave({
      race,
      class: className.trim(),
      subclass: subclass?.trim() || '',
      level,
      stats,
      statBonuses,
      alignment,
      story,
      effect,
    })
  }

  const handleFreeStatChange = (statName: keyof Stats, value: string) => {
    const parsed = parseInt(value)
    if (isNaN(parsed)) return
    setStats((prev) => ({ ...prev, [statName]: Math.max(1, Math.min(30, parsed)) }))
  }

  const handleBonusChange = (statName: keyof Stats, delta: number) => {
    setStatBonuses((prev) => ({
      ...prev,
      [statName]: Math.max(-10, Math.min(20, (prev[statName] ?? 0) + delta)),
    }))
  }

  const handleBonusInput = (statName: keyof Stats, value: string) => {
    const parsed = parseInt(value)
    if (isNaN(parsed)) return
    setStatBonuses((prev) => ({ ...prev, [statName]: Math.max(-10, Math.min(20, parsed)) }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Edit {characterName}</h2>
            <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-900/50 px-4">
          {(['basic', 'stats', 'story'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-gold-400 border-b-2 border-gold-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {isRegenerist ? (
                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-2">Level</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={level}
                    onChange={(e) => setLevel(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                    className="w-32 px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-gold-500"
                  />
                  <p className="text-xs text-slate-500 mt-2">Race and class are determined by regeneration.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-400 mb-2">Race</label>
                      <select
                        value={race}
                        onChange={(e) => setRace(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-gold-500"
                      >
                        {races.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-400 mb-2">Level</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={level}
                        onChange={(e) => setLevel(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-gold-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-400 mb-2">Class & Subclass</label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-gold-500"
                    >
                      {classes.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Alignment</label>
                <AlignmentPicker value={alignment} onChange={setAlignment} />
              </div>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              {/* Base stats */}
              {isRegenerist ? (
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Base Stats</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {STAT_KEYS.map((statName) => (
                      <div key={statName} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                          {STAT_LABELS[statName]}
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={stats[statName]}
                          onChange={(e) => handleFreeStatChange(statName, e.target.value)}
                          className="w-full text-center text-2xl font-bold text-white bg-slate-900 border border-slate-600 rounded px-2 py-1 focus:outline-none focus:border-gold-500"
                        />
                        <div className="mt-2 flex gap-1">
                          <button
                            onClick={() => handleFreeStatChange(statName, String(stats[statName] - 1))}
                            disabled={stats[statName] <= 1}
                            className="flex-1 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-slate-300 text-xs font-semibold transition-colors"
                          >−</button>
                          <button
                            onClick={() => handleFreeStatChange(statName, String(stats[statName] + 1))}
                            disabled={stats[statName] >= 30}
                            className="flex-1 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-slate-300 text-xs font-semibold transition-colors"
                          >+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Base Stats (Point Buy)</h4>
                  <PointBuyCalculator initialStats={stats} onStatsChange={setStats} level={level} />
                </div>
              )}

              {/* Campaign bonuses — always shown */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-1">Campaign Bonuses</h4>
                <p className="text-xs text-slate-500 mb-3">Permanent stat boosts gained through campaign rewards, magic items, etc.</p>
                <div className="grid grid-cols-3 gap-3">
                  {STAT_KEYS.map((statName) => {
                    const base = stats[statName]
                    const bonus = statBonuses[statName] ?? 0
                    return (
                      <div key={statName} className="bg-slate-900/50 rounded-lg p-3 border border-amber-900/40">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold text-slate-400 uppercase">
                            {STAT_LABELS[statName]}
                          </label>
                          <span className="text-xs text-slate-500">= {base + bonus}</span>
                        </div>
                        <input
                          type="number"
                          min={-10}
                          max={20}
                          value={bonus}
                          onChange={(e) => handleBonusInput(statName, e.target.value)}
                          className="w-full text-center text-2xl font-bold text-amber-400 bg-slate-900 border border-amber-700/50 rounded px-2 py-1 focus:outline-none focus:border-amber-500"
                        />
                        <div className="mt-2 flex gap-1">
                          <button
                            onClick={() => handleBonusChange(statName, -1)}
                            disabled={bonus <= -10}
                            className="flex-1 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-slate-300 text-xs font-semibold transition-colors"
                          >−</button>
                          <button
                            onClick={() => handleBonusChange(statName, 1)}
                            disabled={bonus >= 20}
                            className="flex-1 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-slate-300 text-xs font-semibold transition-colors"
                          >+</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Story Tab */}
          {activeTab === 'story' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Quirk / Effect</label>
                <input
                  type="text"
                  value={effect}
                  onChange={(e) => setEffect(e.target.value)}
                  placeholder="e.g., Haunted by visions, Lucky charm, etc."
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-gold-500"
                />
                <p className="text-xs text-slate-500 mt-1">A unique trait, quirk, or ongoing effect for your character</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Backstory</label>
                <textarea
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  placeholder="Write your character's story here..."
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-gold-500 min-h-[250px] font-mono text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700 px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg text-slate-300 font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-6 py-2 bg-gold-500 hover:bg-gold-400 disabled:bg-slate-600 disabled:text-slate-400 rounded-lg text-slate-900 font-semibold transition-colors"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
