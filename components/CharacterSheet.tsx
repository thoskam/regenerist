'use client'

import { useState, useEffect } from 'react'
import StatBlock from './StatBlock'
import HPTracker from './HPTracker'
import LevelSelector from './LevelSelector'
import RegenerateButton from './RegenerateButton'
import StoryDisplay from './StoryDisplay'
import LifeHistory from './LifeHistory'
import FormSummary from './FormSummary'
import { Life } from '@/lib/types'
import { calculateProficiencyBonus, calculateAC, calculateInitiative, calculateSpeed, formatModifier, calculateMaxHp } from '@/lib/calculations'
import { getStatModifier } from '@/lib/statMapper'

export default function CharacterSheet() {
  const [currentLife, setCurrentLife] = useState<Life | null>(null)
  const [allLives, setAllLives] = useState<Life[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [level, setLevel] = useState(1)

  useEffect(() => {
    fetchLives()
  }, [])

  const fetchLives = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/lives')
      const lives = await res.json()
      setAllLives(lives)
      const active = lives.find((l: Life) => l.isActive)
      if (active) {
        setCurrentLife(active)
        setLevel(active.level)
      }
    } catch (error) {
      console.error('Failed to fetch lives:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    try {
      const res = await fetch('/api/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level }),
      })
      const newLife = await res.json()
      setCurrentLife(newLife)
      setAllLives((prev) => [newLife, ...prev.map(l => ({ ...l, isActive: false }))])
    } catch (error) {
      console.error('Failed to regenerate:', error)
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleHpChange = async (current: number, max: number) => {
    if (!currentLife) return
    setCurrentLife({ ...currentLife, currentHp: current, maxHp: max })
    try {
      await fetch(`/api/lives/${currentLife.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentHp: current, maxHp: max }),
      })
    } catch (error) {
      console.error('Failed to update HP:', error)
    }
  }

  const handleLevelChange = async (newLevel: number) => {
    setLevel(newLevel)
    if (!currentLife) return

    const stats = currentLife.stats as { str: number; dex: number; con: number; int: number; wis: number; cha: number }
    const conMod = getStatModifier(stats.con)
    const newMaxHp = calculateMaxHp(currentLife.class, newLevel, conMod)
    const newCurrentHp = Math.min(currentLife.currentHp, newMaxHp)

    setCurrentLife({ ...currentLife, level: newLevel, maxHp: newMaxHp, currentHp: newCurrentHp })

    try {
      await fetch(`/api/lives/${currentLife.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: newLevel, maxHp: newMaxHp, currentHp: newCurrentHp }),
      })
    } catch (error) {
      console.error('Failed to update level:', error)
    }
  }

  const handleSelectLife = (life: Life) => {
    setCurrentLife(life)
    setLevel(life.level)
  }

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear all past lives? This cannot be undone.')) {
      return
    }
    try {
      await fetch('/api/lives/clear', { method: 'DELETE' })
      setAllLives([])
      setCurrentLife(null)
      setLevel(1)
    } catch (error) {
      console.error('Failed to clear history:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gold-400 text-xl">Loading...</div>
      </div>
    )
  }

  const stats = currentLife?.stats as { str: number; dex: number; con: number; int: number; wis: number; cha: number } | undefined

  return (
    <div className={`min-h-screen bg-slate-900 text-white ${isRegenerating ? 'animate-regenerate-glow' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
            THE REGENERIST
          </h1>
          {currentLife && (
            <p className="text-slate-400 mt-2">
              Life #{currentLife.lifeNumber}
            </p>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Life History */}
          <div className="lg:col-span-1">
            <LifeHistory
              lives={allLives}
              currentLifeId={currentLife?.id || null}
              onSelectLife={handleSelectLife}
              onClearHistory={handleClearHistory}
            />
          </div>

          {/* Main Character Sheet */}
          <div className="lg:col-span-2 space-y-6">
            {currentLife ? (
              <>
                {/* Character Info */}
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h2 className="text-3xl font-bold text-white">{currentLife.name}</h2>
                      <p className="text-gold-400 text-lg">{currentLife.race}</p>
                      <p className="text-slate-400">
                        {currentLife.class} ({currentLife.subclass})
                      </p>
                    </div>
                    <LevelSelector level={level} onChange={handleLevelChange} />
                  </div>
                </div>

                {/* Combat Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-center">
                    <span className="text-xs text-slate-400 font-semibold tracking-wider block">AC</span>
                    <span className="text-3xl font-bold text-white">
                      {stats ? calculateAC(stats, currentLife.class) : 10}
                    </span>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-center">
                    <span className="text-xs text-slate-400 font-semibold tracking-wider block">INITIATIVE</span>
                    <span className="text-3xl font-bold text-white">
                      {stats ? formatModifier(calculateInitiative(stats)) : '+0'}
                    </span>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-center">
                    <span className="text-xs text-slate-400 font-semibold tracking-wider block">SPEED</span>
                    <span className="text-3xl font-bold text-white">
                      {calculateSpeed(currentLife.race)} ft
                    </span>
                  </div>
                </div>

                {/* Proficiency Bonus */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-center">
                  <span className="text-xs text-slate-400 font-semibold tracking-wider block">PROFICIENCY BONUS</span>
                  <span className="text-2xl font-bold text-gold-400">
                    {formatModifier(calculateProficiencyBonus(level))}
                  </span>
                </div>

                {/* HP Tracker */}
                <HPTracker
                  currentHp={currentLife.currentHp}
                  maxHp={currentLife.maxHp}
                  onHpChange={handleHpChange}
                />

                {/* Stats */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {stats && ['str', 'dex', 'con', 'int', 'wis', 'cha'].map((stat) => (
                    <StatBlock
                      key={stat}
                      name={stat}
                      value={stats[stat as keyof typeof stats]}
                      animate={isRegenerating}
                    />
                  ))}
                </div>

                {/* Form Summary Table */}
                <FormSummary
                  race={currentLife.race}
                  className={currentLife.class}
                  subclass={currentLife.subclass}
                  effect={currentLife.effect}
                  story={currentLife.story}
                />
              </>
            ) : (
              <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 text-center">
                <p className="text-slate-400 text-lg mb-6">
                  No active life. Begin your journey with a regeneration.
                </p>
              </div>
            )}

            {/* Regenerate Button */}
            <div className="flex justify-center">
              <RegenerateButton onClick={handleRegenerate} isLoading={isRegenerating} />
            </div>
          </div>

          {/* Right Sidebar - Story */}
          <div className="lg:col-span-1">
            {currentLife && (
              <StoryDisplay story={currentLife.story} effect={currentLife.effect} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
