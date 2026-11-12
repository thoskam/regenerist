'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import StatBlock from '@/components/StatBlock'
import HPTracker from '@/components/HPTracker'
import GameplayTracker from '@/components/GameplayTracker'
import AttackPanel from '@/components/AttackPanel'
import { adjustHitPoints, GameplayState } from '@/lib/gameplay'
import LevelSelector from '@/components/LevelSelector'
import RegenerateButton from '@/components/RegenerateButton'
import StoryDisplay from '@/components/StoryDisplay'
import LifeHistory from '@/components/LifeHistory'
import FormSummary from '@/components/FormSummary'
import ProficiencyList from '@/components/ProficiencyList'
import FeatureDisplay from '@/components/FeatureDisplay'
import SpellList from '@/components/SpellList'
import StaticCharacterEditor, { EditorData } from '@/components/StaticCharacterEditor'
import { Character, Life, Stats } from '@/lib/types'
import { HydratedCharacterData } from '@/lib/types/5etools'
import { calculateProficiencyBonus, calculateAC, calculateInitiative, calculateSpeed, formatModifier } from '@/lib/calculations'

interface CharacterWithLives extends Character {
  lives: Life[]
  isRegenerist: boolean
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
  const [regenPhase, setRegenPhase] = useState<'idle' | 'fading-out' | 'loading' | 'flashing-in'>('idle')
  const [showFlash, setShowFlash] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [combatNotice, setCombatNotice] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [hydrationError, setHydrationError] = useState<string | null>(null)
  const savingLock = useRef(false)
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve())
  const hydrationRequest = useRef(0)

  const saveLife = (patch: Record<string, unknown>) => {
    if (!currentLife || savingLock.current) return Promise.resolve(false)
    savingLock.current = true
    const lifeId = currentLife.id
    if (patch.gameplayState && typeof patch.gameplayState === 'object') {
      const previous = currentLife.gameplayState || {}
      patch = { ...patch, gameplayState: Object.fromEntries(Object.entries(patch.gameplayState).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(previous[key]))) }
    }
    setSaveError(null)
    setIsSaving(true)
    const operation = saveQueue.current.then(async () => {
      const res = await fetch(`/api/characters/${slug}/lives/${lifeId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Changes could not be saved. Try again.')
      setAllLives(prev => prev.map(life => life.id === lifeId ? data : life))
      setCurrentLife(prev => prev?.id === lifeId ? data : prev)
      if (data.isActive) setCharacter(prev => prev ? { ...prev, level: data.level } : prev)

      return true
    }).catch(err => { setSaveError(err instanceof Error ? err.message : 'Save failed'); return false })
    saveQueue.current = operation
    void operation.finally(() => { if (saveQueue.current === operation) { savingLock.current = false; setIsSaving(false) } })
    return operation
  }

  const selectedLifeId = currentLife?.id
  const selectedLifeLevel = currentLife?.level
  const selectedLifeClass = currentLife?.class
  const selectedLifeSubclass = currentLife?.subclass
  const selectedLifeRace = currentLife?.race
  // Resource/HP saves return fresh JSON objects but do not change these rule inputs.
  const hydrationKey = JSON.stringify([selectedLifeLevel, selectedLifeClass, selectedLifeSubclass,
    selectedLifeRace, currentLife?.subclassChoice, currentLife?.spellbook])

  useEffect(() => { if (selectedLifeLevel !== undefined) setLevel(selectedLifeLevel) }, [selectedLifeLevel])
  useEffect(() => {
    setActiveTab(previous => previous === 'spells' ? 'features' : previous)
    setFormTab('summary')
  }, [selectedLifeId, selectedLifeClass, selectedLifeSubclass, selectedLifeRace])

  const handleEditCharacter = async (data: EditorData) => {
    if (!currentLife || !character) return

    setIsSavingEdit(true)
    const saved = await saveLife({ ...data })
    setIsSavingEdit(false)
    if (saved) setShowEditor(false)
    else throw new Error('Character could not be saved. Check the sheet error and retry.')
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
      setLevel(data.lives?.find((l: Life) => l.isActive)?.level || data.level)

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
    const requestId = ++hydrationRequest.current
    if (!selectedLifeId) {
      setHydratedData(null)
      setHydrationError(null)
      return
    }

    setHydratedData(null)
    setHydrationError(null)
    try {
      const res = await fetch(`/api/characters/${slug}/hydrate?lifeId=${selectedLifeId}`)
      if (!res.ok) throw new Error('Features and spells could not be loaded.')
      if (res.ok) {
        const data = await res.json()
        if (requestId === hydrationRequest.current) setHydratedData(data)
      }
    } catch (err) {
      if (requestId === hydrationRequest.current) setHydrationError('Features and spells could not be loaded.')
    }
  }, [slug, selectedLifeId])

  useEffect(() => {
    fetchHydratedData()
  }, [fetchHydratedData, hydrationKey])

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
      if (!res.ok) throw new Error(newLife.error || 'Regeneration failed')

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
      setSaveError(err instanceof Error ? err.message : 'Regeneration failed')
      setRegenPhase('idle')
      setIsRegenerating(false)
    }
  }

  const handleHpChange = (current: number, max: number) => saveLife({ currentHp: current, maxHp: max })
  const handleHpAdjust = (delta: number) => {
    if (!currentLife) return
    const state = (currentLife.gameplayState || {}) as GameplayState
    const result = adjustHitPoints(currentLife.currentHp, currentLife.maxHp, delta, state)
    setCombatNotice(result.massiveDamage ? 'Massive damage: instant death. Resolve regeneration with your DM.' : result.concentrationDC ? `Concentration check: Constitution DC ${result.concentrationDC}. End concentration if the save fails.` : null)
    void saveLife({ currentHp: result.currentHp, gameplayState: result.gameplayState })
  }

  const handleLevelChange = (newLevel: number) => saveLife({ level: newLevel })

  const handleSelectLife = (life: Life) => {
    hydrationRequest.current += 1
    setHydratedData(null)
    setCurrentLife(life)
    setLevel(life.level)
    setActiveTab('story')
    setFormTab('summary')
    setCombatNotice(null)
  }

  const handleClearHistory = async () => {
    if (!character) return
    if (!confirm('Are you sure you want to clear all past lives? This cannot be undone.')) {
      return
    }
    try {
      const res = await fetch(`/api/characters/${slug}/lives`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to clear history')
      await fetchCharacter()
    } catch (err) {
      setSaveError('Failed to clear history. Please try again.')
    }
  }

  const handleDeleteCharacter = async () => {
    if (!character) return
    if (!confirm(`Are you sure you want to delete ${character.name}? This cannot be undone.`)) {
      return
    }
    try {
      const res = await fetch(`/api/characters/${slug}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete character')
      router.push('/regenerist')
    } catch (err) {
      setSaveError('Failed to delete character. Please try again.')
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
        <Link href="/regenerist" className="text-gold-400 hover:underline">
          Back to Character Hub
        </Link>
      </div>
    )
  }

  const gameplayState = (currentLife?.gameplayState || {}) as GameplayState
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
            href="/regenerist"
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

          {/* Regenerate Button and Controls */}
          <div className="mt-6 flex flex-col items-center gap-4">
            {character && character.isRegenerist && (
              <>
                <fieldset disabled={isSaving}><RegenerateButton onClick={handleRegenerate} isLoading={isRegenerating} /></fieldset>
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
        </div>

        {hydrationError && <div role="alert" className="mb-4 rounded bg-amber-950 p-3 text-amber-200">{hydrationError} <button onClick={fetchHydratedData} className="underline">Retry loading rules</button></div>}
        {combatNotice && <p role="status" className="mb-4 rounded bg-amber-950 p-3 text-amber-200">{combatNotice}</p>}
        {saveError && <div role="alert" className="mb-4 rounded border border-red-600 bg-red-950 p-3 text-red-200">{saveError}</div>}
        {isSaving && <p role="status" className="mb-3 text-sm text-gold-400">Saving changes…</p>}
        {currentLife && !currentLife.isActive && <p className="mb-4 rounded bg-amber-950 p-3 text-amber-200">Viewing archived life #{currentLife.lifeNumber}. Regeneration uses your active character’s level.</p>}
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
                    <fieldset disabled={isSaving || isRegenerating}><LevelSelector level={level} onChange={handleLevelChange} /></fieldset>
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
                      {stats ? calculateAC(stats, currentLife.class, { armor: gameplayState.armor, shield: gameplayState.shield, bonus: gameplayState.acBonus, race: currentLife.race, subclass: currentLife.subclass }) : 10}
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
                      {calculateSpeed(currentLife.race, currentLife.class, level, { armor: gameplayState.armor, shield: gameplayState.shield, strength: stats?.str })} ft
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
                  key={currentLife.id}
                  disabled={isSaving || isRegenerating}
                  currentHp={currentLife.currentHp}
                  maxHp={currentLife.maxHp}
                  onHpChange={handleHpChange}
                  onAdjust={handleHpAdjust}
                />

                <AttackPanel key={`attack-${currentLife.id}`} life={currentLife} state={gameplayState} data={hydratedData} disabled={isSaving || isRegenerating} onSave={saveLife} />
                <GameplayTracker key={currentLife.id} life={currentLife} state={gameplayState} data={hydratedData} disabled={isSaving || isRegenerating} onSave={saveLife} />

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

                {activeTab === 'spells' && hydratedData?.isSpellcaster && hydratedData.spellcastingAbility && stats && (
                  <SpellList
                    key={currentLife.id}
                    selectedSpellbook={hydratedData.selectedSpellbook}
                    allAvailableSpells={hydratedData.spells || undefined}
                    maxSpellLevel={hydratedData.maxSpellLevel || 0}
                    spellcastingAbility={hydratedData.spellcastingAbility}
                    stats={stats}
                    proficiencyBonus={proficiencyBonus}
                    slug={slug}
                    lifeId={currentLife?.id}
                    onSave={saveLife}
                    disabled={isSaving || isRegenerating}
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
          onSave={handleEditCharacter}
          onCancel={() => setShowEditor(false)}
          isLoading={isSavingEdit}
        />
      )}
    </div>
  )
}
