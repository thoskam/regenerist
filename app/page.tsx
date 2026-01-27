'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Character, Life } from '@/lib/types'

interface CharacterWithCurrentLife extends Character {
  currentLife: Life | null
  totalLives: number
}

export default function CharacterHub() {
  const [characters, setCharacters] = useState<CharacterWithCurrentLife[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCharacterName, setNewCharacterName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetchCharacters()
  }, [])

  const fetchCharacters = async () => {
    try {
      const res = await fetch('/api/characters')
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
    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCharacterName.trim() }),
      })
      if (res.ok) {
        const newCharacter = await res.json()
        setCharacters(prev => [...prev, { ...newCharacter, currentLife: null, totalLives: 0 }])
        setNewCharacterName('')
        setShowCreateModal(false)
      }
    } catch (error) {
      console.error('Failed to create character:', error)
    } finally {
      setIsCreating(false)
    }
  }


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-gold-400 text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent mb-4">
            THE REGENERIST
          </h1>
          <p className="text-slate-400 text-lg">
            D&D 5e Character Management for the Ever-Changing Soul
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold text-white">Your Characters</h2>
          <div className="flex gap-4">
            <Link
              href="/admin"
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
            >
              Admin
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gold-500 hover:bg-gold-400 rounded-lg text-slate-900 font-semibold transition-colors"
            >
              + New Character
            </button>
          </div>
        </div>

        {/* Character Grid */}
        {characters.length === 0 ? (
          <div className="bg-slate-800 rounded-lg p-12 border border-slate-700 text-center">
            <p className="text-slate-400 text-lg mb-6">
              No characters yet. Create your first regenerating soul!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gold-500 hover:bg-gold-400 rounded-lg text-slate-900 font-semibold transition-colors"
            >
              Create Character
            </button>
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
                        <h3 className="text-xl font-bold text-white group-hover:text-gold-400 transition-colors">
                          {character.name}
                        </h3>
                        <p className="text-sm text-slate-500">Level {character.level}</p>
                      </div>
                      <div className="bg-slate-700 rounded-full px-3 py-1 text-xs text-slate-400">
                        {totalLives} {totalLives === 1 ? 'life' : 'lives'}
                      </div>
                    </div>

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
                        <p className="text-gold-400 text-xs mt-1">
                          Click to regenerate!
                        </p>
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
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
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
