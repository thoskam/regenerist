'use client'

import { useState, useMemo } from 'react'
import PointBuyCalculator from './PointBuyCalculator'
import AlignmentPicker from './AlignmentPicker'
import { Stats } from '@/lib/statMapper'
import races from '@/lib/data/races.json'
import classes from '@/lib/data/classes.json'
import { SKILLS_BY_ABILITY } from '@/lib/proficiencyEngine'
import { RACIAL_STAT_BONUSES } from '@/lib/racialBonuses'
import skillProfData from '@/lib/data/skillProficiency.json'
import expertiseData from '@/lib/data/classExpertise.json'

type SkillProfData = Record<string, { count: number; options: string[] }>
type ExpertiseData = Record<string, { level: number; count: number }[]>

const CLASS_SKILL_PROFS = skillProfData as SkillProfData
const CLASS_EXPERTISE = expertiseData as ExpertiseData

function getMaxExpertise(className: string, level: number): number {
  const rules = CLASS_EXPERTISE[className]
  if (!rules) return 0
  return rules.reduce((total, rule) => (level >= rule.level ? total + rule.count : total), 0)
}

function getNextExpertiseUnlock(className: string, level: number): { level: number; count: number } | null {
  const rules = CLASS_EXPERTISE[className]
  if (!rules) return null
  return rules.find((r) => r.level > level) ?? null
}

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
  currentSkillProficiencies?: string[]
  currentExpertiseProficiencies?: string[]
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
  skillProficiencies: string[]
  expertiseProficiencies: string[]
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
  currentSkillProficiencies,
  currentExpertiseProficiencies,
  onSave,
  onCancel,
  isLoading = false,
  isRegenerist = false,
}: StaticCharacterEditorProps) {
  const [race, setRace] = useState(currentRace)
  const [selectedClass, setSelectedClass] = useState(`${currentClass}: ${currentSubclass}`)
  const [level, setLevel] = useState(currentLevel)
  const [stats, setStats] = useState<Stats>(currentStats) // pure point-buy values
  const [statBonuses, setStatBonuses] = useState<Stats>(currentStatBonuses ?? ZERO_BONUSES)

  // Racial bonuses derived from selected race — read-only, auto-applied on save
  const racialBonuses = useMemo<Partial<Stats>>(
    () => RACIAL_STAT_BONUSES[race] ?? {},
    [race]
  )
  const [alignment, setAlignment] = useState(currentAlignment)
  const [story, setStory] = useState(currentStory)
  const [effect, setEffect] = useState(currentEffect)
  const [skillProficiencies, setSkillProficiencies] = useState<string[]>(currentSkillProficiencies ?? [])
  const [expertiseProficiencies, setExpertiseProficiencies] = useState<string[]>(currentExpertiseProficiencies ?? [])
  const [activeTab, setActiveTab] = useState<'basic' | 'stats' | 'skills' | 'story'>('basic')

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
      skillProficiencies,
      expertiseProficiencies,
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
          {(['basic', 'stats', 'skills', 'story'] as const).map((tab) => (
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

              {/* Racial bonuses — read-only, auto-applied from race selection */}
              {!isRegenerist && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-1">Racial Bonuses</h4>
                  <p className="text-xs text-slate-500 mb-3">
                    Automatically applied from your race selection ({race}).
                    Change race in the Basic tab to update.
                  </p>
                  <div className="grid grid-cols-6 gap-2">
                    {STAT_KEYS.map((statName) => {
                      const bonus = racialBonuses[statName] ?? 0
                      return (
                        <div key={statName} className="bg-slate-900/50 rounded-lg p-2 border border-blue-900/40 text-center">
                          <div className="text-xs font-semibold text-slate-400 uppercase mb-1">{STAT_LABELS[statName]}</div>
                          <div className={`text-lg font-bold ${bonus > 0 ? 'text-blue-400' : bonus < 0 ? 'text-red-400' : 'text-slate-600'}`}>
                            {bonus > 0 ? `+${bonus}` : bonus === 0 ? '—' : bonus}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Campaign bonuses — always shown */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-1">Campaign Bonuses</h4>
                <p className="text-xs text-slate-500 mb-3">Permanent stat boosts gained through campaign rewards, magic items, etc.</p>
                <div className="grid grid-cols-3 gap-3">
                  {STAT_KEYS.map((statName) => {
                    const base = stats[statName]
                    const racial = racialBonuses[statName] ?? 0
                    const bonus = statBonuses[statName] ?? 0
                    return (
                      <div key={statName} className="bg-slate-900/50 rounded-lg p-3 border border-amber-900/40">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold text-slate-400 uppercase">
                            {STAT_LABELS[statName]}
                          </label>
                          <span className="text-xs text-slate-500">= {base + racial + bonus}</span>
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

          {/* Skills Tab */}
          {activeTab === 'skills' && (() => {
            const [baseClass] = selectedClass.split(': ')
            const className = baseClass.trim()
            const classProfData = CLASS_SKILL_PROFS[className]
            const classOptions = classProfData?.options ?? []
            const classGrantedCount = classProfData?.count ?? 0
            const maxExpertise = getMaxExpertise(className, level)
            const nextUnlock = getNextExpertiseUnlock(className, level)
            const expertiseUsed = expertiseProficiencies.length

            return (
              <div className="space-y-4">
                {/* Summary header */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                    <div className="text-xs text-slate-400 mb-1">Skill Proficiencies</div>
                    <div className={`text-lg font-bold ${skillProficiencies.length > classGrantedCount && classGrantedCount > 0 ? 'text-yellow-400' : 'text-white'}`}>
                      {skillProficiencies.length}
                      {classGrantedCount > 0 && <span className="text-slate-500 text-sm font-normal"> / {classGrantedCount} from class</span>}
                    </div>
                    {classGrantedCount > 0 && (
                      <div className="text-xs text-slate-500 mt-1">
                        Class skills highlighted in gold
                      </div>
                    )}
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                    <div className="text-xs text-slate-400 mb-1">Expertise Slots</div>
                    {maxExpertise > 0 ? (
                      <>
                        <div className={`text-lg font-bold ${expertiseUsed > maxExpertise ? 'text-red-400' : expertiseUsed === maxExpertise ? 'text-amber-400' : 'text-white'}`}>
                          {expertiseUsed} / {maxExpertise}
                        </div>
                        {nextUnlock && (
                          <div className="text-xs text-slate-500 mt-1">+{nextUnlock.count} more at level {nextUnlock.level}</div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-slate-500">
                        {CLASS_EXPERTISE[className] ? `Unlocks at level ${CLASS_EXPERTISE[className][0].level}` : 'Not available for this class'}
                      </div>
                    )}
                  </div>
                </div>

                {maxExpertise > 0 && expertiseUsed > maxExpertise && (
                  <div className="text-xs text-red-400 bg-red-900/20 rounded p-2 border border-red-900/40">
                    You have {expertiseUsed - maxExpertise} more expertise than available at level {level}. Expertise only applies to the first {maxExpertise} selected.
                  </div>
                )}

                <p className="text-xs text-slate-500">
                  Click to cycle: ◇ none → ◆ proficient → ✦ expertise (must be proficient first)
                  {classOptions.length > 0 && ' · Gold outline = class skill option'}
                </p>

                {(['str', 'dex', 'int', 'wis', 'cha'] as const).map((ability) => {
                  const abilitySkills = SKILLS_BY_ABILITY[ability]
                  if (abilitySkills.length === 0) return null
                  return (
                    <div key={ability}>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">{ability}</h4>
                      <div className="grid grid-cols-2 gap-1">
                        {abilitySkills.map((skill) => {
                          const isProf = skillProficiencies.includes(skill)
                          const isExpert = expertiseProficiencies.includes(skill)
                          const isClassSkill = classOptions.includes(skill)
                          const handleClick = () => {
                            if (!isProf && !isExpert) {
                              setSkillProficiencies(prev => [...prev, skill])
                            } else if (isProf && !isExpert) {
                              setExpertiseProficiencies(prev => [...prev, skill])
                            } else {
                              setSkillProficiencies(prev => prev.filter(s => s !== skill))
                              setExpertiseProficiencies(prev => prev.filter(s => s !== skill))
                            }
                          }
                          return (
                            <button
                              key={skill}
                              onClick={handleClick}
                              className={`px-3 py-2 rounded text-sm text-left transition-colors ${
                                isExpert
                                  ? 'bg-amber-500/30 border border-amber-500/50 text-amber-300'
                                  : isProf
                                  ? 'bg-gold-500/20 border border-gold-500/40 text-gold-400'
                                  : isClassSkill
                                  ? 'bg-slate-900/50 border border-gold-700/40 text-slate-300 hover:border-gold-600/60'
                                  : 'bg-slate-900/50 border border-slate-700 text-slate-400 hover:border-slate-500'
                              }`}
                            >
                              {isExpert ? '✦ ' : isProf ? '◆ ' : '◇ '}{skill}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}

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
