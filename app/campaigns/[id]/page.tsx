'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import InviteLinkBox from '@/components/InviteLinkBox'
import CampaignMemberList from '@/components/CampaignMemberList'
import PartyOverview from '@/components/PartyOverview'

interface User {
  id: string
  name: string | null
  image: string | null
}

interface Member {
  id: string
  userId: string
  role: string
  user: User
}

interface Life {
  name: string
  race: string
  class: string
  subclass: string
  level: number
  currentHp: number
  maxHp: number
  stats: {
    str: number
    dex: number
    con: number
    int: number
    wis: number
    cha: number
  }
}

interface Character {
  id: number
  name: string
  slug: string
  level: number
  lives: Life[]
  user: User | null
}

interface CharacterLink {
  id: string
  character: Character
}

interface Campaign {
  id: string
  name: string
  inviteCode: string
  dmUserId: string
  dm: User
  members: Member[]
  characters: CharacterLink[]
  userIsDM: boolean
}

interface UserCharacter {
  id: number
  name: string
  slug: string
}

export default function CampaignDashboard() {
  const { data: session, status } = useSession()
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [userCharacters, setUserCharacters] = useState<UserCharacter[]>([])
  const [showAddCharacter, setShowAddCharacter] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`)
      if (res.ok) {
        const data = await res.json()
        setCampaign(data)
        setEditedName(data.name)
      } else if (res.status === 403) {
        setError('You are not a member of this campaign')
      } else if (res.status === 404) {
        setError('Campaign not found')
      } else {
        setError('Failed to load campaign')
      }
    } catch (err) {
      console.error('Failed to fetch campaign:', err)
      setError('Failed to load campaign')
    } finally {
      setIsLoading(false)
    }
  }, [campaignId])

  const fetchUserCharacters = useCallback(async () => {
    try {
      const res = await fetch('/api/characters?filter=mine')
      if (res.ok) {
        const data = await res.json()
        setUserCharacters(data)
      }
    } catch (err) {
      console.error('Failed to fetch characters:', err)
    }
  }, [])

  useEffect(() => {
    if (session) {
      fetchCampaign()
      fetchUserCharacters()
    }
  }, [session, fetchCampaign, fetchUserCharacters])

  const handleUpdateName = async () => {
    if (!campaign || !editedName.trim()) return

    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editedName.trim() }),
      })
      if (res.ok) {
        setCampaign({ ...campaign, name: editedName.trim() })
        setIsEditingName(false)
      }
    } catch (err) {
      console.error('Failed to update name:', err)
    }
  }

  const handleRegenerateInvite = async () => {
    if (!campaign) return

    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateInviteCode: true }),
      })
      if (res.ok) {
        const data = await res.json()
        setCampaign({ ...campaign, inviteCode: data.inviteCode })
      }
    } catch (err) {
      console.error('Failed to regenerate invite:', err)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!campaign) return
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/members/${userId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        if (userId === session?.user?.id) {
          router.push('/campaigns')
        } else {
          setCampaign({
            ...campaign,
            members: campaign.members.filter((m) => m.userId !== userId),
          })
        }
      }
    } catch (err) {
      console.error('Failed to remove member:', err)
    }
  }

  const handlePromoteMember = async (userId: string) => {
    if (!campaign) return
    if (!confirm('Are you sure you want to make this player the DM? You will become a player.')) return

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/members/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'dm' }),
      })
      if (res.ok) {
        fetchCampaign()
      }
    } catch (err) {
      console.error('Failed to promote member:', err)
    }
  }

  const handleAddCharacter = async (characterId: number) => {
    if (!campaign) return

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
      })
      if (res.ok) {
        fetchCampaign()
        setShowAddCharacter(false)
      }
    } catch (err) {
      console.error('Failed to add character:', err)
    }
  }

  const handleRemoveCharacter = async (characterId: number) => {
    if (!campaign) return
    if (!confirm('Remove this character from the campaign?')) return

    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/characters?characterId=${characterId}&campaignId=${campaignId}`,
        { method: 'DELETE' }
      )
      if (res.ok) {
        setCampaign({
          ...campaign,
          characters: campaign.characters.filter((c) => c.character.id !== characterId),
        })
      }
    } catch (err) {
      console.error('Failed to remove character:', err)
    }
  }

  const handleDeleteCampaign = async () => {
    if (!campaign) return
    if (!confirm(`Are you sure you want to delete "${campaign.name}"? This cannot be undone.`)) return

    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/campaigns')
      }
    } catch (err) {
      console.error('Failed to delete campaign:', err)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-gold-400 text-xl">Loading...</div>
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900">
        <div className="text-red-400 text-xl mb-4">{error || 'Campaign not found'}</div>
        <Link href="/campaigns" className="text-gold-400 hover:underline">
          Back to Campaigns
        </Link>
      </div>
    )
  }

  // Characters not yet in campaign
  const availableCharacters = userCharacters.filter(
    (c) => !campaign.characters.some((cc) => cc.character.id === c.id)
  )

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/campaigns"
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <span>&larr;</span> Back to Campaigns
          </Link>
          {campaign.userIsDM && (
            <button
              onClick={handleDeleteCampaign}
              className="text-red-400 hover:text-red-300 text-sm transition-colors"
            >
              Delete Campaign
            </button>
          )}
        </div>

        {/* Campaign Name */}
        <div className="mb-8">
          {isEditingName && campaign.userIsDM ? (
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="text-3xl font-bold bg-slate-800 border border-slate-600 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-gold-500"
                autoFocus
              />
              <button
                onClick={handleUpdateName}
                className="px-3 py-1 bg-gold-500 rounded text-slate-900 text-sm font-medium"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditingName(false)
                  setEditedName(campaign.name)
                }}
                className="px-3 py-1 bg-slate-700 rounded text-slate-300 text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <h1
              className={`text-3xl font-bold text-gold-400 ${campaign.userIsDM ? 'cursor-pointer hover:text-gold-300' : ''}`}
              onClick={() => campaign.userIsDM && setIsEditingName(true)}
            >
              {campaign.name}
              {campaign.userIsDM && (
                <span className="ml-2 text-slate-500 text-base">✎</span>
              )}
            </h1>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Party Overview */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Party Overview</h2>
                <button
                  onClick={() => setShowAddCharacter(!showAddCharacter)}
                  className="text-sm text-gold-400 hover:text-gold-300"
                >
                  + Add Character
                </button>
              </div>

              {showAddCharacter && (
                <div className="mb-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                  <p className="text-sm text-slate-400 mb-2">Select a character to add:</p>
                  {availableCharacters.length === 0 ? (
                    <p className="text-slate-500 text-sm">
                      No available characters. Create one first or all your characters are already in this campaign.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {availableCharacters.map((char) => (
                        <button
                          key={char.id}
                          onClick={() => handleAddCharacter(char.id)}
                          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white transition-colors"
                        >
                          {char.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <PartyOverview characters={campaign.characters} />

              {campaign.characters.length > 0 && (campaign.userIsDM || campaign.characters.some(c => c.character.user?.id === session?.user?.id)) && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-xs text-slate-500 mb-2">Remove characters:</p>
                  <div className="flex flex-wrap gap-2">
                    {campaign.characters
                      .filter((c) => campaign.userIsDM || c.character.user?.id === session?.user?.id)
                      .map((c) => (
                        <button
                          key={c.character.id}
                          onClick={() => handleRemoveCharacter(c.character.id)}
                          className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                        >
                          Remove {c.character.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Members & Invite */}
          <div className="space-y-6">
            {/* Invite Link (DM only) */}
            {campaign.userIsDM && (
              <InviteLinkBox
                inviteCode={campaign.inviteCode}
                onRegenerate={handleRegenerateInvite}
              />
            )}

            {/* Members */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Members ({campaign.members.length})
              </h2>
              <CampaignMemberList
                members={campaign.members}
                dmUserId={campaign.dmUserId}
                currentUserId={session?.user?.id || ''}
                userIsDM={campaign.userIsDM}
                onRemove={handleRemoveMember}
                onPromote={handlePromoteMember}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
