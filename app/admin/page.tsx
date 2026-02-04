'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Character, Quirk } from '@/lib/types'

interface AdminCharacter extends Character {
  owner?: { id: string; name: string | null; email?: string | null; image?: string | null } | null
}

type Tab = 'characters' | 'quirks'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('characters')
  const [characters, setCharacters] = useState<AdminCharacter[]>([])
  const [quirks, setQuirks] = useState<Quirk[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Character form state
  const [showCharacterModal, setShowCharacterModal] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null)
  const [characterForm, setCharacterForm] = useState({ name: '', level: 1, isRegenerist: true })

  // Quirk form state
  const [showQuirkModal, setShowQuirkModal] = useState(false)
  const [editingQuirk, setEditingQuirk] = useState<Quirk | null>(null)
  const [quirkForm, setQuirkForm] = useState({ name: '', description: '', isActive: true })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [charsRes, quirksRes] = await Promise.all([
        fetch('/api/admin/characters'),
        fetch('/api/quirks'),
      ])
      const [charsData, quirksData] = await Promise.all([
        charsRes.json(),
        quirksRes.json(),
      ])
      setCharacters(charsData)
      setQuirks(quirksData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Character CRUD
  const handleSaveCharacter = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingCharacter) {
        const res = await fetch(`/api/characters/${editingCharacter.slug}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(characterForm),
        })
        if (res.ok) {
          const updated = await res.json()
          setCharacters(prev =>
            prev.map(c => (c.id === updated.id ? { ...c, ...updated } : c))
          )
        }
      } else {
        const res = await fetch('/api/characters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(characterForm),
        })
        if (res.ok) {
          const newChar = await res.json()
          setCharacters(prev => [...prev, newChar])
        }
      }
      closeCharacterModal()
    } catch (error) {
      console.error('Failed to save character:', error)
    }
  }

  const handleDeleteCharacter = async (character: Character) => {
    if (!confirm(`Delete ${character.name}? This will also delete all their lives.`)) return
    try {
      await fetch(`/api/characters/${character.slug}`, { method: 'DELETE' })
      setCharacters(prev => prev.filter(c => c.id !== character.id))
    } catch (error) {
      console.error('Failed to delete character:', error)
    }
  }

  const openCharacterModal = (character?: Character) => {
    if (character) {
      setEditingCharacter(character)
      setCharacterForm({ name: character.name, level: character.level, isRegenerist: (character as any).isRegenerist ?? true })
    } else {
      setEditingCharacter(null)
      setCharacterForm({ name: '', level: 1, isRegenerist: true })
    }
    setShowCharacterModal(true)
  }

  const closeCharacterModal = () => {
    setShowCharacterModal(false)
    setEditingCharacter(null)
    setCharacterForm({ name: '', level: 1, isRegenerist: true })
  }

  // Quirk CRUD
  const handleSaveQuirk = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingQuirk) {
        const res = await fetch(`/api/quirks/${editingQuirk.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(quirkForm),
        })
        if (res.ok) {
          const updated = await res.json()
          setQuirks(prev =>
            prev.map(q => (q.id === updated.id ? updated : q))
          )
        }
      } else {
        const res = await fetch('/api/quirks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(quirkForm),
        })
        if (res.ok) {
          const newQuirk = await res.json()
          setQuirks(prev => [...prev, newQuirk])
        }
      }
      closeQuirkModal()
    } catch (error) {
      console.error('Failed to save quirk:', error)
    }
  }

  const handleDeleteQuirk = async (quirk: Quirk) => {
    if (!confirm(`Delete quirk "${quirk.name}"?`)) return
    try {
      await fetch(`/api/quirks/${quirk.id}`, { method: 'DELETE' })
      setQuirks(prev => prev.filter(q => q.id !== quirk.id))
    } catch (error) {
      console.error('Failed to delete quirk:', error)
    }
  }

  const handleToggleQuirk = async (quirk: Quirk) => {
    try {
      const res = await fetch(`/api/quirks/${quirk.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !quirk.isActive }),
      })
      if (res.ok) {
        const updated = await res.json()
        setQuirks(prev =>
          prev.map(q => (q.id === updated.id ? updated : q))
        )
      }
    } catch (error) {
      console.error('Failed to toggle quirk:', error)
    }
  }

  const openQuirkModal = (quirk?: Quirk) => {
    if (quirk) {
      setEditingQuirk(quirk)
      setQuirkForm({ name: quirk.name, description: quirk.description, isActive: quirk.isActive })
    } else {
      setEditingQuirk(null)
      setQuirkForm({ name: '', description: '', isActive: true })
    }
    setShowQuirkModal(true)
  }

  const closeQuirkModal = () => {
    setShowQuirkModal(false)
    setEditingQuirk(null)
    setQuirkForm({ name: '', description: '', isActive: true })
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/"
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 mb-2"
            >
              <span>&larr;</span> Back to Hub
            </Link>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('characters')}
            className={`px-4 py-2 -mb-px border-b-2 transition-colors ${
              activeTab === 'characters'
                ? 'border-gold-500 text-gold-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Characters ({characters.length})
          </button>
          <button
            onClick={() => setActiveTab('quirks')}
            className={`px-4 py-2 -mb-px border-b-2 transition-colors ${
              activeTab === 'quirks'
                ? 'border-gold-500 text-gold-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Quirks ({quirks.length})
          </button>
        </div>

        {/* Characters Tab */}
        {activeTab === 'characters' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Manage Characters</h2>
              <button
                onClick={() => openCharacterModal()}
                className="px-4 py-2 bg-gold-500 hover:bg-gold-400 rounded-lg text-slate-900 font-semibold transition-colors"
              >
                + New Character
              </button>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Name</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Slug</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Level</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Owner</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Created</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {characters.map((character) => (
                    <tr key={character.id} className="border-t border-slate-700 hover:bg-slate-750">
                      <td className="px-4 py-3 font-medium">{character.name}</td>
                      <td className="px-4 py-3 text-slate-400 text-sm">{character.slug}</td>
                      <td className="px-4 py-3">{character.level}</td>
                      <td className="px-4 py-3 text-slate-400 text-sm">
                        {character.owner?.name || 'Unassigned'}
                        {character.owner?.email ? ` (${character.owner.email})` : ''}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-sm">
                        {new Date(character.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openCharacterModal(character)}
                          className="text-blue-400 hover:text-blue-300 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCharacter(character)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {characters.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No characters yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Quirks Tab */}
        {activeTab === 'quirks' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Manage Quirks</h2>
              <button
                onClick={() => openQuirkModal()}
                className="px-4 py-2 bg-gold-500 hover:bg-gold-400 rounded-lg text-slate-900 font-semibold transition-colors"
              >
                + New Quirk
              </button>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Name</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-300">Description</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quirks.map((quirk) => (
                    <tr key={quirk.id} className={`border-t border-slate-700 hover:bg-slate-750 ${!quirk.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleQuirk(quirk)}
                          className={`w-3 h-3 rounded-full ${quirk.isActive ? 'bg-green-500' : 'bg-slate-500'}`}
                          title={quirk.isActive ? 'Active - click to disable' : 'Disabled - click to enable'}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">{quirk.name}</td>
                      <td className="px-4 py-3 text-slate-400 text-sm max-w-md truncate">
                        {quirk.description}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openQuirkModal(quirk)}
                          className="text-blue-400 hover:text-blue-300 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteQuirk(quirk)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {quirks.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                        No quirks yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Character Modal */}
        {showCharacterModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-4">
                {editingCharacter ? 'Edit Character' : 'Create Character'}
              </h3>
              <form onSubmit={handleSaveCharacter}>
                <div className="mb-4">
                  <label className="block text-sm text-slate-400 mb-2">Name</label>
                  <input
                    type="text"
                    value={characterForm.name}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-gold-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm text-slate-400 mb-2">Level</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={characterForm.level}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div className="mb-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={characterForm.isRegenerist}
                        onChange={(e) => setCharacterForm(prev => ({ ...prev, isRegenerist: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-700 rounded-full peer peer-checked:bg-gold-500 transition-colors"></div>
                      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                    </div>
                    <span className="text-sm text-slate-400">Enable Regenerist Logic</span>
                  </label>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={closeCharacterModal}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gold-500 hover:bg-gold-400 rounded-lg text-slate-900 font-semibold transition-colors"
                  >
                    {editingCharacter ? 'Save' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quirk Modal */}
        {showQuirkModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-lg border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-4">
                {editingQuirk ? 'Edit Quirk' : 'Create Quirk'}
              </h3>
              <form onSubmit={handleSaveQuirk}>
                <div className="mb-4">
                  <label className="block text-sm text-slate-400 mb-2">Name</label>
                  <input
                    type="text"
                    value={quirkForm.name}
                    onChange={(e) => setQuirkForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-gold-500"
                    placeholder="e.g., Memory Gaps"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm text-slate-400 mb-2">Description</label>
                  <textarea
                    value={quirkForm.description}
                    onChange={(e) => setQuirkForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-gold-500 min-h-[100px]"
                    placeholder="e.g., You have trouble remembering details from your past lives..."
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={quirkForm.isActive}
                      onChange={(e) => setQuirkForm(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-gold-500 focus:ring-gold-500"
                    />
                    <span className="text-sm text-slate-400">Active (can be selected during regeneration)</span>
                  </label>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={closeQuirkModal}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gold-500 hover:bg-gold-400 rounded-lg text-slate-900 font-semibold transition-colors"
                  >
                    {editingQuirk ? 'Save' : 'Create'}
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
