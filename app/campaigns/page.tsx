'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CampaignCard from '@/components/CampaignCard'

interface DM {
  id: string
  name: string | null
  image: string | null
}

interface Campaign {
  id: string
  name: string
  dm: DM
  userRole: 'dm' | 'player'
  _count: {
    members: number
    characters: number
  }
}

export default function CampaignsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchCampaigns()
    }
  }, [session])

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns')
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data)
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-gold-400 text-xl">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const dmCampaigns = campaigns.filter((c) => c.userRole === 'dm')
  const playerCampaigns = campaigns.filter((c) => c.userRole === 'player')

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gold-400">My Campaigns</h1>
          <Link
            href="/campaigns/new"
            className="px-4 py-2 bg-gold-500 hover:bg-gold-400 rounded-lg text-slate-900 font-semibold transition-colors"
          >
            + New Campaign
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <div className="bg-slate-800 rounded-lg p-12 border border-slate-700 text-center">
            <p className="text-slate-400 text-lg mb-6">
              You haven&apos;t joined any campaigns yet.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/campaigns/new"
                className="px-6 py-3 bg-gold-500 hover:bg-gold-400 rounded-lg text-slate-900 font-semibold transition-colors"
              >
                Create a Campaign
              </Link>
              <span className="text-slate-500">or</span>
              <span className="text-slate-400">join one with an invite link</span>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* DM Campaigns */}
            {dmCampaigns.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  Campaigns I Run ({dmCampaigns.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dmCampaigns.map((campaign) => (
                    <CampaignCard
                      key={campaign.id}
                      id={campaign.id}
                      name={campaign.name}
                      dm={campaign.dm}
                      memberCount={campaign._count.members}
                      characterCount={campaign._count.characters}
                      userRole={campaign.userRole}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Player Campaigns */}
            {playerCampaigns.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  Campaigns I Play In ({playerCampaigns.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playerCampaigns.map((campaign) => (
                    <CampaignCard
                      key={campaign.id}
                      id={campaign.id}
                      name={campaign.name}
                      dm={campaign.dm}
                      memberCount={campaign._count.members}
                      characterCount={campaign._count.characters}
                      userRole={campaign.userRole}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
