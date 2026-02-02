'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface ProfileData {
  id: string
  name: string | null
  email: string | null
  image: string | null
  createdAt: string
  characterCount: number
  campaignsOwnedCount: number
  campaignMembershipsCount: number
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchProfile()
    }
  }, [session])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile')
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
        setDisplayName(data.name || '')
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage('')

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: displayName }),
      })

      if (res.ok) {
        setSaveMessage('Profile updated successfully!')
        setTimeout(() => setSaveMessage(''), 3000)
      } else {
        setSaveMessage('Failed to update profile')
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
      setSaveMessage('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-gold-400 text-xl">Loading...</div>
      </div>
    )
  }

  if (!session || !profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gold-400 mb-8">Profile</h1>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          {/* Avatar and Basic Info */}
          <div className="flex items-center gap-6 mb-8">
            {profile.image ? (
              <Image
                src={profile.image}
                alt={profile.name || 'User avatar'}
                width={96}
                height={96}
                className="rounded-full"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center text-3xl text-slate-400">
                {(profile.name || profile.email || '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-slate-400 text-sm">Email</p>
              <p className="text-white">{profile.email || 'No email'}</p>
              <p className="text-slate-500 text-xs mt-2">
                Member since {new Date(profile.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Display Name */}
          <div className="mb-6">
            <label className="block text-sm text-slate-400 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-gold-500"
              placeholder="Enter display name..."
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-900/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gold-400">{profile.characterCount}</p>
              <p className="text-sm text-slate-400">Characters</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gold-400">{profile.campaignsOwnedCount}</p>
              <p className="text-sm text-slate-400">Campaigns (DM)</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gold-400">{profile.campaignMembershipsCount}</p>
              <p className="text-sm text-slate-400">Campaigns (Player)</p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-gold-500 hover:bg-gold-400 disabled:bg-slate-600 rounded-lg text-slate-900 font-semibold transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            {saveMessage && (
              <span className={`text-sm ${saveMessage.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                {saveMessage}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
