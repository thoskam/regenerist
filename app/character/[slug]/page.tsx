'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import LevelSelector from '@/components/LevelSelector'
import RegenerateButton from '@/components/RegenerateButton'
import LifeHistory from '@/components/LifeHistory'
import ModuleRenderer, { type CharacterData } from '@/components/modules/ModuleRenderer'
import LayoutGrid from '@/components/layout/LayoutGrid'
import LayoutControls from '@/components/layout/LayoutControls'
import MobileLayoutEditor from '@/components/layout/MobileLayoutEditor'
import { ModuleErrorBoundary } from '@/components/layout/ModuleErrorBoundary'
import StaticCharacterEditor, { EditorData } from '@/components/StaticCharacterEditor'
import VisibilitySelector from '@/components/VisibilitySelector'
import UserAvatar from '@/components/UserAvatar'
import { Character, Life, Stats } from '@/lib/types'
import { HydratedCharacterData } from '@/lib/types/5etools'
import { LayoutProvider } from '@/lib/layout/LayoutContext'
import { generateDefaultLayout } from '@/lib/layout/defaultLayout'
import type { LayoutConfig, ModuleId } from '@/lib/layout/types'
import type { CharacterAction } from '@/lib/actions/types'
import { calculateProficiencyBonus, calculateMaxHp } from '@/lib/calculations'
import { getStatModifier } from '@/lib/statMapper'
import { applyASIs } from '@/lib/asiCalculator'
import { MODULE_REGISTRY } from '@/lib/layout/moduleRegistry'
import { useMediaQuery } from '@/hooks/useMediaQuery'

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
  const [actions, setActions] = useState<CharacterAction[]>([])
  const [initialLayout, setInitialLayout] = useState<LayoutConfig | null>(null)
  const isMobile = useMediaQuery('(max-width: 767px)')
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

  useEffect(() => {
    const fetchLayout = async () => {
      try {
        const res = await fetch(`/api/characters/${slug}/layout`)
        if (res.ok) {
          const data = await res.json()
          setInitialLayout(data.layout || generateDefaultLayout())
          return
        }
      } catch (err) {
        console.error('Failed to fetch layout:', err)
      }
      setInitialLayout(generateDefaultLayout())
    }

    fetchLayout()
  }, [slug])

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

  const fetchActions = useCallback(async () => {
    if (!character || !currentLife) {
      setActions([])
      return
    }

    try {
      const res = await fetch(`/api/characters/${slug}/actions`)
      if (res.ok) {
        const data = await res.json()
        setActions(data.actions || [])
      }
    } catch (err) {
      console.error('Failed to fetch actions:', err)
    }
  }, [slug, character, currentLife])

  useEffect(() => {
    fetchActions()
  }, [fetchActions])

  const handleUseAction = async (action: CharacterAction) => {
    if (!currentLife) return

    try {
      if (action.isLimited && action.featureKey) {
        await fetch(`/api/characters/${slug}/active-state/features`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ featureKey: action.featureKey, action: 'use', amount: 1 }),
        })
      }

      if (action.isSpell && action.spellLevel && action.spellLevel > 0) {
        const activeState = hydratedData?.activeState
        const isWarlock = currentLife.class.toLowerCase() === 'warlock'

        if (isWarlock && activeState?.pactSlotsMax && activeState.pactSlotLevel === action.spellLevel) {
          await fetch(`/api/characters/${slug}/active-state`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pactSlotsUsed: Math.min(activeState.pactSlotsMax, activeState.pactSlotsUsed + 1) }),
          })
        } else {
          await fetch(`/api/characters/${slug}/active-state/spell-slots`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level: action.spellLevel, action: 'use', amount: 1 }),
          })
        }
      }
    } catch (err) {
      console.error('Failed to use action:', err)
    } finally {
      await fetchHydratedData()
      await fetchActions()
    }
  }


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
  const activeState = hydratedData?.activeState ?? null

  const refreshAll = async () => {
    await fetchCharacter()
    await fetchHydratedData()
    await fetchActions()
  }

  const characterData: CharacterData | null =
    currentLife && stats
      ? {
          slug,
          lifeId: currentLife.id,
          className: currentLife.class,
          subclass: currentLife.subclass,
          race: currentLife.race,
          level,
          currentHp: activeState?.currentHp ?? currentLife.currentHp,
          maxHp: currentLife.maxHp,
          stats,
          baseStats,
          story: currentLife.story,
          effect: currentLife.effect,
          subclassChoice: currentLife.subclassChoice,
          isOwner,
          isRegenerist: character.isRegenerist,
          proficiencyBonus,
          skillProficiencies,
          hydratedData,
          actions,
          activeState,
          regenPhase,
          isRegenerating,
          onUseAction: handleUseAction,
          onRefresh: refreshAll,
        }
      : null

  const renderModule = (moduleId: ModuleId, characterData: CharacterData) => (
    <ModuleRenderer moduleId={moduleId} characterData={characterData} />
  )

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

        <div className="text-center mb-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
            {character.name}
          </h1>
          {currentLife && character.isRegenerist && (
            <p className="text-slate-400 mt-2">
              Life #{currentLife.lifeNumber}
            </p>
          )}

          {/* Regenerate Button and Controls (owner only) */}
          {isOwner && (
            <div className="mt-4 flex flex-col items-center gap-4">
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
            </div>
          )}
        </div>

        {/* Main Content */}
        {initialLayout ? (
          <LayoutProvider characterSlug={slug} initialLayout={initialLayout}>
            <div className="space-y-4">
              {isOwner && (
                <div className="flex items-center justify-between gap-4">
                  <LayoutControls />
                  {character && !character.isRegenerist && currentLife && (
                    <button
                      onClick={() => setShowEditor(true)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg"
                    >
                      ✎ Edit Character
                    </button>
                  )}
                </div>
              )}
              {character.isRegenerist && (
                <LifeHistory
                  lives={allLives}
                  currentLifeId={currentLife?.id || null}
                  onSelectLife={handleSelectLife}
                  onClearHistory={handleClearHistory}
                />
              )}

              {isOwner && isMobile && <MobileLayoutEditor />}

              {currentLife ? (
                <div
                  className={`${
                    regenPhase === 'fading-out'
                      ? 'animate-regenerate-out'
                      : regenPhase === 'flashing-in'
                        ? 'animate-regenerate-in'
                        : ''
                  }`}
                >
                  {characterData && (
                    <LayoutGrid
                      renderModule={(moduleId) => (
                        <ModuleErrorBoundary moduleName={MODULE_REGISTRY[moduleId].name}>
                          {renderModule(moduleId, characterData)}
                        </ModuleErrorBoundary>
                      )}
                    />
                  )}
                </div>
              ) : (
                <div className="bg-slate-800 rounded-lg p-8 border border-slate-700 text-center">
                  <p className="text-slate-400 text-lg mb-6">
                    No active life. Begin your journey with a regeneration.
                  </p>
                </div>
              )}
            </div>
          </LayoutProvider>
        ) : (
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 text-center text-slate-400">
            Loading layout...
          </div>
        )}
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
