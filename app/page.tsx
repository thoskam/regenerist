'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signIn } from 'next-auth/react'
import { Character, Life } from '@/lib/types'
import CharacterTypeBadge from '@/components/CharacterTypeBadge'
import UserAvatar from '@/components/UserAvatar'

interface Owner {
  id: string
  name: string | null
  image: string | null
}

interface CharacterWithCurrentLife extends Character {
  currentLife: Life | null
  totalLives: number
  isRegenerist: boolean
  visibility?: string
  owner?: Owner | null
}

export default function CharacterHub() {
  const { data: session, status } = useSession()
  const [characters, setCharacters] = useState<CharacterWithCurrentLife[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'mine' | 'public'>('mine')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCharacterName, setNewCharacterName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isRegeneristMode, setIsRegeneristMode] = useState(true)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      fetchCharacters(filter)
    } else {
      setIsLoading(false)
    }
  }, [session, filter])

  const fetchCharacters = async (filterType: 'mine' | 'public') => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/characters?filter=${filterType}`)
      const data = await res.json()
      setCharacters(data)
    } catch (error) {
      console.error('Failed to fetch characters:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCharacterName.trim()) return

    setIsCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCharacterName.trim(),
          isRegenerist: isRegeneristMode,
        }),
      })
      if (res.ok) {
        const newCharacter = await res.json()
        if (filter === 'mine') {
          setCharacters(prev => [{ ...newCharacter, currentLife: null, totalLives: 0, isRegenerist: isRegeneristMode }, ...prev])
        }
        setNewCharacterName('')
        setIsRegeneristMode(true)
        setCreateError(null)
        setShowCreateModal(false)
      } else {
        const data = await res.json()
        setCreateError(data.error || 'Failed to create character')
      }
    } catch (error) {
      console.error('Failed to create character:', error)
      setCreateError('Failed to create character')
    } finally {
      setIsCreating(false)
    }
  }

  const getVisibilityIcon = (visibility?: string) => {
    switch (visibility) {
      case 'public':
        return '🌐'
      case 'campaign':
        return '👥'
      default:
        return '🔒'
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-gold-400 text-xl">Loading...</div>
      </div>
    )
  }

  // Not authenticated - show landing page
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent mb-6">
              LAND OF DRAGONS
            </h1>
            <p className="text-slate-400 text-xl mb-8">
              D&D 5e Character Management
            </p>
            <p className="text-slate-500 max-w-2xl mx-auto mb-12">
              Create characters with 5e races, classes, and abilities. 
            </p>
            <button
              onClick={() => signIn()}
              className="px-8 py-4 bg-gold-500 hover:bg-gold-400 rounded-lg text-slate-900 font-bold text-lg transition-colors"
            >
              Sign In to Get Started
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-gold-400 font-semibold mb-2">Master Your Hero</h3>
              <p className="text-slate-400 text-sm">
                A fully interactive character sheet built for 5e. Track your stats, health, and progression with a streamlined, high-performance interface.
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-gold-400 font-semibold mb-2">Tactical Intelligence</h3>
              <p className="text-slate-400 text-sm">
                Powered by "The Archivist" AI. Get instant rules clarifications, thematic spell suggestions, and cinematic descriptions for your epic moments.
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-gold-400 font-semibold mb-2">Complete 5e Library</h3>
              <p className="text-slate-400 text-sm">
                Complete D&D 5e mechanics including spells, features, and proper stat calculations.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent mb-4">
            THE LAND OF DRAGONS
          </h1>
          <p className="text-slate-400 text-lg">
            D&D 5e Character Management 
          </p>
        </div>

        {/* Filter Tabs + Action Bar */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('mine')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'mine'
                  ? 'bg-gold-500 text-slate-900'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              My Characters
            </button>
            <button
              onClick={() => setFilter('public')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'public'
                  ? 'bg-gold-500 text-slate-900'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Public
            </button>
          </div>
          <div className="flex gap-4">
            <Link
              href="/admin"
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
            >
              Admin
            </Link>
            <button
              onClick={() => { setShowCreateModal(true); setCreateError(null) }}
              className="px-4 py-2 bg-gold-500 hover:bg-gold-400 rounded-lg text-slate-900 font-semibold transition-colors"
            >
              + New Character
            </button>
          </div>
        </div>

        {/* Character Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gold-400">Loading characters...</div>
          </div>
        ) : characters.length === 0 ? (
          <div className="bg-slate-800 rounded-lg p-12 border border-slate-700 text-center">
            {filter === 'mine' ? (
              <>
                <p className="text-slate-400 text-lg mb-6">
                  No characters yet. Create your first regenerating soul!
                </p>
                <button
                  onClick={() => { setShowCreateModal(true); setCreateError(null) }}
                  className="px-6 py-3 bg-gold-500 hover:bg-gold-400 rounded-lg text-slate-900 font-semibold transition-colors"
                >
                  Create Character
                </button>
              </>
            ) : (
              <p className="text-slate-400 text-lg">
                No public characters available.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {characters.map((character) => {
              const { currentLife, totalLives } = character

              return (
                <Link
                  key={character.id}
                  href={`/character/${character.slug}`}
                  className="group bg-slate-800 rounded-lg border border-slate-700 hover:border-gold-500/50 transition-all hover:shadow-lg hover:shadow-gold-500/10"
                >
                  <div className="p-6">
                    {/* Character Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-white group-hover:text-gold-400 transition-colors">
                            {character.name}
                          </h3>
                          <CharacterTypeBadge isRegenerist={character.isRegenerist} />
                          {filter === 'mine' && (
                            <span className="text-xs" title={character.visibility || 'private'}>
                              {getVisibilityIcon(character.visibility)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">Level {character.level}</p>
                      </div>
                      <div className="bg-slate-700 rounded-full px-3 py-1 text-xs text-slate-400">
                        {totalLives} {totalLives === 1 ? 'life' : 'lives'}
                      </div>
                    </div>

                    {/* Owner (for public characters) */}
                    {filter === 'public' && character.owner && (
                      <div className="flex items-center gap-2 mb-3 text-xs text-slate-500">
                        <UserAvatar src={character.owner.image} name={character.owner.name} size="sm" />
                        <span>{character.owner.name || 'Anonymous'}</span>
                      </div>
                    )}

                    {/* Current Life Preview */}
                    {currentLife ? (
                      <div className="bg-slate-900/50 rounded-lg p-4">
                        <p className="text-gold-400 font-medium mb-1">{currentLife.name}</p>
                        <p className="text-sm text-slate-400">{currentLife.race}</p>
                        <p className="text-sm text-slate-500">
                          {currentLife.class} ({currentLife.subclass})
                        </p>
                        <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                          <span>HP: {currentLife.currentHp}/{currentLife.maxHp}</span>
                          <span>Life #{currentLife.lifeNumber}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                        <p className="text-slate-500 text-sm">
                          No incarnation yet
                        </p>
                        {filter === 'mine' && (
                          <p className="text-gold-400 text-xs mt-1">
                            Click to regenerate!
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-4">Create New Character</h3>
              {createError && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
                  {createError}
                </div>
              )}
              <form onSubmit={handleCreateCharacter}>
                <div className="mb-4">
                  <label className="block text-sm text-slate-400 mb-2">
                    Character Name
                  </label>
                  <input
                    type="text"
                    value={newCharacterName}
                    onChange={(e) => setNewCharacterName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-gold-500"
                    placeholder="Enter character name..."
                    autoFocus
                  />
                </div>

                <div className="mb-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={isRegeneristMode}
                        onChange={(e) => setIsRegeneristMode(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-700 rounded-full peer peer-checked:bg-gold-500 transition-colors"></div>
                      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-300">Regenerist Mode</p>
                      <p className="text-xs text-slate-500">{isRegeneristMode ? 'Auto-generates lives with AI stories' : 'Manual static character'}</p>
                    </div>
                  </label>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setIsRegeneristMode(true)
                      setCreateError(null)
                    }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !newCharacterName.trim()}
                    className="px-4 py-2 bg-gold-500 hover:bg-gold-400 disabled:bg-slate-600 disabled:text-slate-400 rounded-lg text-slate-900 font-semibold transition-colors"
                  >
                    {isCreating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
