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
import SavesTable from '@/components/SavesTable'
import FeatureDisplay from '@/components/FeatureDisplay'
import ChoicesDisplay from '@/components/ChoicesDisplay'
import SpellList from '@/components/SpellList'
import StaticCharacterEditor, { EditorData } from '@/components/StaticCharacterEditor'
import VisibilitySelector from '@/components/VisibilitySelector'
import UserAvatar from '@/components/UserAvatar'
import { Character, Life, Stats } from '@/lib/types'
import { HydratedCharacterData } from '@/lib/types/5etools'
import { calculateProficiencyBonus, calculateAC, calculateInitiative, calculateSpeed, formatModifier, calculateMaxHp } from '@/lib/calculations'
import { getStatModifier } from '@/lib/statMapper'
import { applyASIs } from '@/lib/asiCalculator'

interface Owner {
  id: string
  name: string | null
  image: string | null
}

interface CharacterWithLives extends Character {
  lives: Life[]
  isRegenerist: boolean
  isOwner?: boolean
  owner?: Owner | null
  visibility?: string
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
  const [formTab, setFormTab] = useState<'summary' | 'traits' | 'choices'>('summary')
  const [regenPhase, setRegenPhase] = useState<'idle' | 'fading-out' | 'loading' | 'flashing-in'>('idle')
  const [showFlash, setShowFlash] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const handleEditCharacter = async (data: EditorData) => {
    if (!currentLife || !character) return

    setIsSavingEdit(true)
    try {
      const response = await fetch(`/api/characters/${slug}/lives/${currentLife.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          race: data.race,
          class: data.class,
          subclass: data.subclass,
          level: data.level,
          stats: data.stats,
          story: data.story,
          effect: data.effect,
        }),
      })

      if (response.ok) {
        const updatedLife = await response.json()
        setCurrentLife(updatedLife)
        setLevel(data.level)

        // Update character level if needed
        if (data.level !== character.level) {
          await fetch(`/api/characters/${slug}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level: data.level }),
          })
          setCharacter({ ...character, level: data.level })
        }

        // Refresh hydrated data to update features for new class/level
        await fetchHydratedData()

        setShowEditor(false)
      } else {
        console.error('Failed to save character')
      }
    } catch (err) {
      console.error('Failed to save character:', err)
    } finally {
      setIsSavingEdit(false)
    }
  }

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
    setRegenPhase('fading-out')

    // Start fade out, then fetch new data
    await new Promise(resolve => setTimeout(resolve, 800))

    // Enter loading phase - boxes pulse while waiting for API
    setRegenPhase('loading')

    try {
      // Fetch new life data and ensure minimum loading time for animation
      const [res] = await Promise.all([
        fetch(`/api/characters/${slug}/regenerate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uniqueSubclasses }),
        }),
        new Promise(resolve => setTimeout(resolve, 1500)) // Minimum 1.5s loading animation
      ])
      const newLife = await res.json()

      // Trigger the flash effect
      setShowFlash(true)
      setRegenPhase('flashing-in')

      // Update data
      setCurrentLife(newLife)
      setLevel(newLife.level)
      setAllLives((prev) => [newLife, ...prev.map(l => ({ ...l, isActive: false }))])

      // Clear flash after animation
      setTimeout(() => setShowFlash(false), 800)

      // Reset to idle after flash-in completes
      setTimeout(() => {
        setRegenPhase('idle')
        setIsRegenerating(false)
      }, 1200)
    } catch (err) {
      console.error('Failed to regenerate:', err)
      setRegenPhase('idle')
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

    // For Regenerist characters, auto-apply ASIs
    // For Static characters, keep stats unchanged (user controls via point buy)
    let newStats: Stats
    if (character.isRegenerist) {
      const baseStats = (currentLife.baseStats || currentLife.stats) as Stats
      newStats = applyASIs(baseStats, currentLife.class, newLevel)
    } else {
      newStats = currentLife.stats as Stats
    }

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

      // Update life - only include stats for Regenerist characters
      const lifeUpdate: Record<string, unknown> = {
        level: newLevel,
        maxHp: newMaxHp,
        currentHp: newCurrentHp
      }
      if (character.isRegenerist) {
        lifeUpdate.stats = newStats
      }

      await fetch(`/api/characters/${slug}/lives/${currentLife.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lifeUpdate),
      })

      // Refresh hydrated data to update features
      await fetchHydratedData()
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

  const handleVisibilityChange = async (visibility: string) => {
    if (!character) return
    try {
      const res = await fetch(`/api/characters/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      })
      if (res.ok) {
        setCharacter({ ...character, visibility })
      }
    } catch (err) {
      console.error('Failed to update visibility:', err)
    }
  }

  const isOwner = character?.isOwner ?? false

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
          <div className="flex items-center gap-4">
            {isOwner && (
              <>
                <VisibilitySelector
                  value={character.visibility || 'private'}
                  onChange={handleVisibilityChange}
                />
                <button
                  onClick={handleDeleteCharacter}
                  className="text-red-400 hover:text-red-300 text-sm transition-colors"
                >
                  Delete Character
                </button>
              </>
            )}
          </div>
        </div>

        {/* Owner Info (for viewing others' characters) */}
        {!isOwner && character.owner && (
          <div className="flex items-center justify-center gap-2 mb-4 text-sm text-slate-400">
            <span>Owned by</span>
            <UserAvatar src={character.owner.image} name={character.owner.name} size="sm" />
            <span className="text-slate-300">{character.owner.name || 'Anonymous'}</span>
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
            {character.name}
          </h1>
          {currentLife && (
            <p className="text-slate-400 mt-2">
              Life #{currentLife.lifeNumber}
            </p>
          )}

          {/* Regenerate Button and Controls (owner only) */}
          {isOwner && (
            <div className="mt-6 flex flex-col items-center gap-4">
              {character && character.isRegenerist && (
                <>
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
                </>
              )}
              {character && !character.isRegenerist && currentLife && (
                <button
                  onClick={() => setShowEditor(true)}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 font-semibold transition-colors"
                >
                  ✎ Edit Character
                </button>
              )}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Life History & Skills */}
          <div className={`lg:col-span-1 space-y-6 ${
            regenPhase === 'fading-out' ? 'animate-regenerate-out' :
            regenPhase === 'flashing-in' ? 'animate-regenerate-in' : ''
          }`}>
            {character && character.isRegenerist && (
              <LifeHistory
                lives={allLives}
                currentLifeId={currentLife?.id || null}
                onSelectLife={handleSelectLife}
                onClearHistory={handleClearHistory}
              />
            )}

            {/* Skills/Proficiencies */}
            {currentLife && stats && (
              <ProficiencyList
                stats={stats}
                proficiencies={skillProficiencies}
                proficiencyBonus={proficiencyBonus}
              />
            )}

            {/* Saving Throws */}
            {currentLife && stats && (
              <SavesTable
                stats={stats}
                savingThrowProficiencies={hydratedData?.savingThrowProficiencies || []}
                proficiencyBonus={proficiencyBonus}
              />
            )}
          </div>

          {/* Main Character Sheet */}
          <div className="lg:col-span-2 space-y-6">
            {currentLife ? (
              <div className={`space-y-6 ${
                regenPhase === 'fading-out' ? 'animate-regenerate-out' :
                regenPhase === 'flashing-in' ? 'animate-regenerate-in' : ''
              }`}>
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
                  <div
                    className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-center"
                    style={regenPhase === 'loading' ? { animation: 'grid-pulse 1.2s ease-in-out infinite' } : undefined}
                  >
                    <span className="text-xs text-slate-400 font-semibold tracking-wider block">AC</span>
                    <span className="text-3xl font-bold text-white">
                      {stats ? calculateAC(stats, currentLife.class) : 10}
                    </span>
                  </div>
                  <div
                    className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-center"
                    style={regenPhase === 'loading' ? { animation: 'grid-pulse 1.2s ease-in-out infinite 0.1s' } : undefined}
                  >
                    <span className="text-xs text-slate-400 font-semibold tracking-wider block">INITIATIVE</span>
                    <span className="text-3xl font-bold text-white">
                      {stats ? formatModifier(calculateInitiative(stats)) : '+0'}
                    </span>
                  </div>
                  <div
                    className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-center"
                    style={regenPhase === 'loading' ? { animation: 'grid-pulse 1.2s ease-in-out infinite 0.2s' } : undefined}
                  >
                    <span className="text-xs text-slate-400 font-semibold tracking-wider block">SPEED</span>
                    <span className="text-3xl font-bold text-white">
                      {calculateSpeed(currentLife.race)} ft
                    </span>
                  </div>
                </div>

                {/* Proficiency Bonus */}
                <div
                  className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-center"
                  style={regenPhase === 'loading' ? { animation: 'grid-pulse 1.2s ease-in-out infinite 0.3s' } : undefined}
                >
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
                  {stats && ['str', 'dex', 'con', 'int', 'wis', 'cha'].map((stat, index) => (
                    <StatBlock
                      key={stat}
                      name={stat}
                      value={stats[stat as keyof typeof stats]}
                      baseValue={baseStats?.[stat as keyof typeof baseStats]}
                      animate={isRegenerating}
                      pulseStyle={regenPhase === 'loading' ? { animation: `grid-pulse 1.2s ease-in-out infinite ${index * 0.1}s` } : undefined}
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
                      Summary
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
                    {(currentLife.subclassChoice || (hydratedData?.subclassInfo && hydratedData.subclassInfo.features.length > 0)) && (
                      <button
                        onClick={() => setFormTab('choices')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                          formTab === 'choices'
                            ? 'text-gold-400 bg-slate-700/50 border-b-2 border-gold-400'
                            : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
                        }`}
                      >
                        {currentLife.subclass}
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

                    {formTab === 'choices' && (
                      <ChoicesDisplay
                        className={currentLife.class}
                        subclass={currentLife.subclass}
                        subclassChoice={currentLife.subclassChoice}
                        level={level}
                        subclassFeatures={hydratedData?.subclassInfo?.features || []}
                        subclassName={hydratedData?.subclassInfo?.name}
                      />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 text-center">
                <p className="text-slate-400 text-lg mb-6">
                  No active life. Begin your journey with a regeneration.
                </p>
              </div>
            )}

          </div>

          {/* Right Sidebar - Story, Features, Spells */}
          <div className={`lg:col-span-1 space-y-4 ${
            regenPhase === 'fading-out' ? 'animate-regenerate-out' :
            regenPhase === 'flashing-in' ? 'animate-regenerate-in' : ''
          }`}>
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
                    {/* Class Features (subclass features are now in the Choices tab) */}
                    {hydratedData.classInfo && (
                      <FeatureDisplay
                        title={`${hydratedData.classInfo.name.toUpperCase()} FEATURES`}
                        features={hydratedData.classInfo.features}
                        currentLevel={level}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'spells' && hydratedData?.isSpellcaster && hydratedData.spellcastingAbility && stats && (
                  <SpellList
                    selectedSpellbook={hydratedData.selectedSpellbook}
                    allAvailableSpells={hydratedData.spells || undefined}
                    maxSpellLevel={hydratedData.maxSpellLevel || 0}
                    spellcastingAbility={hydratedData.spellcastingAbility}
                    stats={stats}
                    proficiencyBonus={proficiencyBonus}
                    slug={slug}
                    lifeId={currentLife?.id}
                    onSpellbookUpdate={() => fetchHydratedData()}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Regeneration flash overlay */}
      {showFlash && <div className="regeneration-flash" />}

      {/* Static Character Editor Modal */}
      {showEditor && character && !character.isRegenerist && currentLife && (
        <StaticCharacterEditor
          characterName={character.name}
          currentRace={currentLife.race}
          currentClass={currentLife.class}
          currentSubclass={currentLife.subclass}
          currentLevel={currentLife.level}
          currentStats={currentLife.stats as Stats}
          currentStory={currentLife.story}
          currentEffect={currentLife.effect}
          onSave={handleEditCharacter}
          onCancel={() => setShowEditor(false)}
          isLoading={isSavingEdit}
        />
      )}
    </div>
  )
}
