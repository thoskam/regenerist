'use client'

import { useState } from 'react'
import PointBuyCalculator from './PointBuyCalculator'
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
  stats: Stats
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
  const [story, setStory] = useState(currentStory)
  const [activeTab, setActiveTab] = useState<'basic' | 'stats' | 'story'>('basic')

  const handleSave = async () => {
    const [className, subclass] = selectedClass.split(': ')
    await onSave({
      race,
      class: className.trim(),
      subclass: subclass?.trim() || '',
      level,
      stats,
      story,
    })
  }

  const availableClasses = classes.filter((c) => c.startsWith(`${currentClass.split(':')[0]}:`))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Edit {characterName}</h2>
            <button
              onClick={onCancel}
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
        <div className="p-6 space-y-6">
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
              </div>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div>
              <PointBuyCalculator
                initialStats={stats}
                onStatsChange={setStats}
              />
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
