'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import StatBlock from '@/components/StatBlock'
import HPTracker from '@/components/HPTracker'
import LevelSelector from '@/components/LevelSelector'
import RegenerateButton from '@/components/RegenerateButton'
import StoryDisplay from '@/components/StoryDisplay'
import LifeHistory from '@/components/LifeHistory'
import FormSummary from '@/components/FormSummary'
import ProficiencyList from '@/components/ProficiencyList'
import FeatureDisplay from '@/components/FeatureDisplay'
import SpellList from '@/components/SpellList'
import { Character, Life, Stats } from '@/lib/types'
import { HydratedCharacterData } from '@/lib/types/5etools'
import { calculateProficiencyBonus, calculateAC, calculateInitiative, calculateSpeed, formatModifier, calculateMaxHp } from '@/lib/calculations'
import { getStatModifier } from '@/lib/statMapper'
import { applyASIs } from '@/lib/asiCalculator'

interface CharacterWithLives extends Character {
  lives: Life[]
}

export default function CharacterPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [character, setCharacter] = useState<CharacterWithLives | null>(null)
  const [currentLife, setCurrentLife] = useState<Life | null>(null)
  const [allLives, setAllLives] = useState<Life[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [level, setLevel] = useState(1)
  const [uniqueSubclasses, setUniqueSubclasses] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hydratedData, setHydratedData] = useState<HydratedCharacterData | null>(null)
  const [activeTab, setActiveTab] = useState<'story' | 'features' | 'spells'>('story')
  const [formTab, setFormTab] = useState<'summary' | 'traits'>('summary')

  const fetchCharacter = useCallback(async () => {
    try {
      const res = await fetch(`/api/characters/${slug}`)
      if (!res.ok) {
        if (res.status === 404) {
          setError('Character not found')
        } else {
          setError('Failed to load character')
        }
        return
      }
      const data: CharacterWithLives = await res.json()
      setCharacter(data)
      setAllLives(data.lives || [])
      setLevel(data.level)

      const active = data.lives?.find((l: Life) => l.isActive)
      if (active) {
        setCurrentLife(active)
      }
    } catch (err) {
      console.error('Failed to fetch character:', err)
      setError('Failed to load character')
    } finally {
      setIsLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchCharacter()
  }, [fetchCharacter])

  // Fetch hydrated data when character has an active life
  const fetchHydratedData = useCallback(async () => {
    if (!character || !currentLife) {
      setHydratedData(null)
      return
    }

    try {
      const res = await fetch(`/api/characters/${slug}/hydrate`)
      if (res.ok) {
        const data = await res.json()
        setHydratedData(data)
      }
    } catch (err) {
      console.error('Failed to fetch hydrated data:', err)
    }
  }, [slug, character, currentLife])

  useEffect(() => {
    fetchHydratedData()
  }, [fetchHydratedData])

  const handleRegenerate = async () => {
    if (!character) return

    setIsRegenerating(true)
    try {
      const res = await fetch(`/api/characters/${slug}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uniqueSubclasses }),
      })
      const newLife = await res.json()
      setCurrentLife(newLife)
      setLevel(newLife.level)
      setAllLives((prev) => [newLife, ...prev.map(l => ({ ...l, isActive: false }))])
    } catch (err) {
      console.error('Failed to regenerate:', err)
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleHpChange = async (current: number, max: number) => {
    if (!currentLife || !character) return
    setCurrentLife({ ...currentLife, currentHp: current, maxHp: max })
    try {
      await fetch(`/api/characters/${slug}/lives/${currentLife.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentHp: current, maxHp: max }),
      })
    } catch (err) {
      console.error('Failed to update HP:', err)
    }
  }

  const handleLevelChange = async (newLevel: number) => {
    setLevel(newLevel)
    if (!currentLife || !character) return

    // Recalculate stats with ASI for new level
    const baseStats = (currentLife.baseStats || currentLife.stats) as Stats
    const newStats = applyASIs(baseStats, currentLife.class, newLevel)

    const conMod = getStatModifier(newStats.con)
    const newMaxHp = calculateMaxHp(currentLife.class, newLevel, conMod)
    const newCurrentHp = Math.min(currentLife.currentHp, newMaxHp)

    setCurrentLife({
      ...currentLife,
      level: newLevel,
      stats: newStats,
      maxHp: newMaxHp,
      currentHp: newCurrentHp
    })

    try {
      // Update character level
      await fetch(`/api/characters/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: newLevel }),
      })

      // Update life stats
      await fetch(`/api/characters/${slug}/lives/${currentLife.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: newLevel,
          stats: newStats,
          maxHp: newMaxHp,
          currentHp: newCurrentHp
        }),
      })
    } catch (err) {
      console.error('Failed to update level:', err)
    }
  }

  const handleSelectLife = (life: Life) => {
    setCurrentLife(life)
    setLevel(life.level)
  }

  const handleClearHistory = async () => {
    if (!character) return
    if (!confirm('Are you sure you want to clear all past lives? This cannot be undone.')) {
      return
    }
    try {
      await fetch(`/api/characters/${slug}/lives`, { method: 'DELETE' })
      setAllLives([])
      setCurrentLife(null)
    } catch (err) {
      console.error('Failed to clear history:', err)
    }
  }

  const handleDeleteCharacter = async () => {
    if (!character) return
    if (!confirm(`Are you sure you want to delete ${character.name}? This cannot be undone.`)) {
      return
    }
    try {
      await fetch(`/api/characters/${slug}`, { method: 'DELETE' })
      router.push('/')
    } catch (err) {
      console.error('Failed to delete character:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-gold-400 text-xl">Loading...</div>
      </div>
    )
  }

  if (error || !character) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900">
        <div className="text-red-400 text-xl mb-4">{error || 'Character not found'}</div>
        <Link href="/" className="text-gold-400 hover:underline">
          Back to Character Hub
        </Link>
      </div>
    )
  }

  const stats = currentLife?.stats as Stats | undefined
  const baseStats = (currentLife?.baseStats || currentLife?.stats) as Stats | undefined
  const proficiencyBonus = calculateProficiencyBonus(level)
  const skillProficiencies = currentLife?.skillProficiencies || []

  return (
    <div className={`min-h-screen bg-slate-900 text-white ${isRegenerating ? 'animate-regenerate-glow' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <span>&larr;</span> Back to Hub
          </Link>
          <button
            onClick={handleDeleteCharacter}
            className="text-red-400 hover:text-red-300 text-sm transition-colors"
          >
            Delete Character
          </button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
            {character.name}
          </h1>
          {currentLife && (
            <p className="text-slate-400 mt-2">
              Life #{currentLife.lifeNumber}
            </p>
          )}

          {/* Regenerate Button and Unique Subclasses Toggle */}
          <div className="mt-6 flex flex-col items-center gap-4">
            <RegenerateButton onClick={handleRegenerate} isLoading={isRegenerating} />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={uniqueSubclasses}
                    onChange={(e) => setUniqueSubclasses(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-700 rounded-full peer peer-checked:bg-gold-500 transition-colors"></div>
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                </div>
                <span className="text-sm text-slate-400">
                  Unique Subclasses
                </span>
              </label>
              {uniqueSubclasses && (
                <span className="text-xs text-slate-500">
                  ({allLives.length} used)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Life History & Skills */}
          <div className="lg:col-span-1 space-y-6">
            <LifeHistory
              lives={allLives}
              currentLifeId={currentLife?.id || null}
              onSelectLife={handleSelectLife}
              onClearHistory={handleClearHistory}
            />

            {/* Skills/Proficiencies */}
            {currentLife && stats && (
              <ProficiencyList
                stats={stats}
                proficiencies={skillProficiencies}
                proficiencyBonus={proficiencyBonus}
              />
            )}
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
                        {currentLife.subclassChoice && (
                          <span className="text-gold-400 ml-1">
                            — {currentLife.subclassChoice}
                          </span>
                        )}
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
                    {formatModifier(proficiencyBonus)}
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
                      baseValue={baseStats?.[stat as keyof typeof baseStats]}
                      animate={isRegenerating}
                    />
                  ))}
                </div>

                {/* Form Summary & Race Traits Tabbed Box */}
                <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                  {/* Tab Navigation */}
                  <div className="flex border-b border-slate-700">
                    <button
                      onClick={() => setFormTab('summary')}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        formTab === 'summary'
                          ? 'text-gold-400 bg-slate-700/50 border-b-2 border-gold-400'
                          : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
                      }`}
                    >
                      Form Summary
                    </button>
                    {hydratedData?.raceInfo && hydratedData.raceInfo.traits.length > 0 && (
                      <button
                        onClick={() => setFormTab('traits')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                          formTab === 'traits'
                            ? 'text-gold-400 bg-slate-700/50 border-b-2 border-gold-400'
                            : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
                        }`}
                      >
                        {hydratedData.raceInfo.name} Traits
                      </button>
                    )}
                  </div>

                  {/* Tab Content */}
                  <div className="p-5">
                    {formTab === 'summary' && (
                      <FormSummary
                        race={currentLife.race}
                        className={currentLife.class}
                        subclass={currentLife.subclass}
                        effect={currentLife.effect}
                        story={currentLife.story}
                      />
                    )}

                    {formTab === 'traits' && hydratedData?.raceInfo && hydratedData.raceInfo.traits.length > 0 && (
                      <FeatureDisplay
                        title={`${hydratedData.raceInfo.name.toUpperCase()} TRAITS`}
                        features={hydratedData.raceInfo.traits.map((trait) => ({
                          name: trait.name,
                          level: 1,
                          description: trait.description,
                        }))}
                        currentLevel={level}
                        noContainer
                      />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 text-center">
                <p className="text-slate-400 text-lg mb-6">
                  No active life. Begin your journey with a regeneration.
                </p>
              </div>
            )}

          </div>

          {/* Right Sidebar - Story, Features, Spells */}
          <div className="lg:col-span-1 space-y-4">
            {currentLife && (
              <>
                {/* Tab Navigation */}
                <div className="flex border-b border-slate-700">
                  <button
                    onClick={() => setActiveTab('story')}
                    className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                      activeTab === 'story'
                        ? 'text-gold-400 border-b-2 border-gold-400'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    Story
                  </button>
                  <button
                    onClick={() => setActiveTab('features')}
                    className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                      activeTab === 'features'
                        ? 'text-gold-400 border-b-2 border-gold-400'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    Features
                  </button>
                  {hydratedData?.isSpellcaster && (
                    <button
                      onClick={() => setActiveTab('spells')}
                      className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                        activeTab === 'spells'
                          ? 'text-gold-400 border-b-2 border-gold-400'
                          : 'text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      Spells
                    </button>
                  )}
                </div>

                {/* Tab Content */}
                {activeTab === 'story' && (
                  <StoryDisplay story={currentLife.story} effect={currentLife.effect} />
                )}

                {activeTab === 'features' && hydratedData && (
                  <div className="space-y-4">
                    {/* Class Features */}
                    {hydratedData.classInfo && (
                      <FeatureDisplay
                        title={`${hydratedData.classInfo.name.toUpperCase()} FEATURES`}
                        features={hydratedData.classInfo.features}
                        currentLevel={level}
                      />
                    )}

                    {/* Subclass Features */}
                    {hydratedData.subclassInfo && hydratedData.subclassInfo.features.length > 0 && (
                      <FeatureDisplay
                        title={`${hydratedData.subclassInfo.name.toUpperCase()} FEATURES`}
                        features={hydratedData.subclassInfo.features}
                        currentLevel={level}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'spells' && hydratedData?.spells && hydratedData.spellcastingAbility && (
                  <SpellList
                    spells={hydratedData.spells}
                    maxSpellLevel={hydratedData.maxSpellLevel || 0}
                    spellcastingAbility={hydratedData.spellcastingAbility}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
