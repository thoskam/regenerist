'use client'

import { useState } from 'react'
import PointBuyCalculator from './PointBuyCalculator'
import { Stats } from '@/lib/statMapper'
import races from '@/lib/data/races.json'
import classes from '@/lib/data/classes.json'
import { getClassSupportIssue } from '@/lib/catalog'

interface StaticCharacterEditorProps {
  characterName: string
  currentRace: string
  currentClass: string
  currentSubclass: string
  currentLevel: number
  currentStats: Stats
  currentStory: string
  onSave: (data: EditorData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export interface EditorData {
  race: string
  class: string
  subclass: string
  level: number
  stats?: Stats
  pointBuyStats?: Stats
  story: string
}

export default function StaticCharacterEditor({
  characterName,
  currentRace,
  currentClass,
  currentSubclass,
  currentLevel,
  currentStats,
  currentStory,
  onSave,
  onCancel,
  isLoading = false,
}: StaticCharacterEditorProps) {
  const [race, setRace] = useState(currentRace)
  const [selectedClass, setSelectedClass] = useState(`${currentClass}: ${currentSubclass}`)
  const [level, setLevel] = useState(currentLevel)
  const [stats, setStats] = useState<Stats>(currentStats)
  const [statsDirty, setStatsDirty] = useState(false)
  const [statMode, setStatMode] = useState<'manual' | 'pointBuy'>('manual')
  const [pointBuyStats, setPointBuyStats] = useState<Stats>({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 })
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [story, setStory] = useState(currentStory)
  const [activeTab, setActiveTab] = useState<'basic' | 'stats' | 'story'>('basic')

  const handleSave = async () => {
    if (saving || isLoading) return
    const [className, subclass] = selectedClass.split(': ')
    setSaving(true)
    setSaveError(null)
    try {
      await onSave({
        race,
        class: className.trim(),
        subclass: subclass?.trim() || '',
        level,
        ...(statMode === 'pointBuy' ? { pointBuyStats } : statsDirty ? { stats } : {}),
        story,
      })
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save character')
    } finally {
      setSaving(false)
    }
  }

  const [className, subclassName] = selectedClass.split(': ')
  const supportIssue = getClassSupportIssue(className, subclassName)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div role="dialog" aria-modal="true" aria-label={`Edit ${characterName}`} className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Edit {characterName}</h2>
            <button
              onClick={onCancel}
              disabled={saving || isLoading}
              aria-label="Close editor"
              className="text-slate-400 hover:text-white transition-colors"
            >
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
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${{
                'basic': activeTab === 'basic' ? 'text-gold-400 border-b-2 border-gold-400' : 'text-slate-400 hover:text-slate-300',
                'stats': activeTab === 'stats' ? 'text-gold-400 border-b-2 border-gold-400' : 'text-slate-400 hover:text-slate-300',
                'story': activeTab === 'story' ? 'text-gold-400 border-b-2 border-gold-400' : 'text-slate-400 hover:text-slate-300',
              }[tab]}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <fieldset disabled={saving || isLoading} className="p-6 space-y-6">
          {saveError && <p role="alert" className="text-red-300">{saveError}</p>}
          {/* Basic Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-2">Race</label>
                  <select
                    value={race}
                    onChange={(e) => setRace(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-gold-500"
                  >
                    {races.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
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
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {supportIssue && <p role="status" className="mt-3 text-sm text-amber-300">{supportIssue} Features require manual handling.</p>}
              </div>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              <label className="block text-sm text-slate-300">
                Ability score method
                <select value={statMode} onChange={e => setStatMode(e.target.value as 'manual' | 'pointBuy')} className="mt-2 block w-full rounded border border-slate-600 bg-slate-900 p-2">
                  <option value="manual">Current final scores / manual override</option>
                  <option value="pointBuy">Rebuild with 27-point buy</option>
                </select>
              </label>
              {statMode === 'manual' ? <>
                <p className="text-sm text-slate-400">These are your final scores, including racial bonuses and ability score improvements. Unchanged scores preserve your existing progression. Manually changing a score switches to manual advancement; update scores yourself when leveling.</p>
                <div className="grid grid-cols-3 gap-3">
                  {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map(ability => <label key={ability} className="text-xs uppercase text-slate-400">
                    {ability}
                    <input aria-label={`${ability} final score`} type="number" min={1} max={30} value={stats[ability]} onChange={e => {
                      const value = Number(e.target.value)
                      if (!Number.isInteger(value)) return
                      setStats(previous => ({ ...previous, [ability]: Math.max(1, Math.min(30, value)) }))
                      setStatsDirty(true)
                    }} className="mt-1 w-full rounded border border-slate-600 bg-slate-900 p-2 text-lg text-white" />
                  </label>)}
                </div>
              </> : <>
                <p className="text-sm text-slate-400">Replaces your current scores. Buy scores before racial bonuses; saving adds the selected race’s bonuses and assigns level-based ability increases by class priority. Feats and flexible racial choices still require manual adjustment.</p>
                <PointBuyCalculator initialStats={pointBuyStats} onStatsChange={setPointBuyStats} />
              </>}
            </div>
          )}

          {/* Story Tab */}
          {activeTab === 'story' && (
            <div>
              <label className="block text-sm font-semibold text-slate-400 mb-2">Backstory</label>
              <textarea
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="Write your character's story here..."
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-gold-500 min-h-[300px] font-mono text-sm"
              />
            </div>
          )}
        </fieldset>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700 px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading || saving}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg text-slate-300 font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || saving}
            className="px-6 py-2 bg-gold-500 hover:bg-gold-400 disabled:bg-slate-600 disabled:text-slate-400 rounded-lg text-slate-900 font-semibold transition-colors"
          >
            {isLoading || saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
