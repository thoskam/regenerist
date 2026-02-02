'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import UserAvatar from '@/components/UserAvatar'

interface DM {
  id: string
  name: string | null
  image: string | null
}

interface CampaignInfo {
  id: string
  name: string
  dm: DM
  memberCount: number
  isMember: boolean
}

export default function JoinCampaignPage() {
  const { data: session, status } = useSession()
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const [campaign, setCampaign] = useState<CampaignInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCampaignInfo()
  }, [code])

  const fetchCampaignInfo = async () => {
    try {
      const res = await fetch(`/api/campaigns/join/${code}`)
      if (res.ok) {
        const data = await res.json()
        setCampaign(data)
      } else if (res.status === 404) {
        setError('Invalid invite link')
      } else {
        setError('Failed to load campaign')
      }
    } catch (err) {
      console.error('Failed to fetch campaign:', err)
      setError('Failed to load campaign')
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!session) {
      signIn()
      return
    }

    setIsJoining(true)
    setError(null)

    try {
      const res = await fetch(`/api/campaigns/join/${code}`, {
        method: 'POST',
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/campaigns/${data.campaign.id}`)
      } else {
        const data = await res.json()
        if (data.campaign) {
          // Already a member - redirect to campaign
          router.push(`/campaigns/${data.campaign.id}`)
        } else {
          setError(data.error || 'Failed to join campaign')
        }
      }
    } catch (err) {
      console.error('Failed to join campaign:', err)
      setError('Failed to join campaign')
    } finally {
      setIsJoining(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-gold-400 text-xl">Loading...</div>
      </div>
    )
  }

  if (error && !campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900">
        <div className="text-red-400 text-xl mb-4">{error}</div>
        <Link href="/" className="text-gold-400 hover:underline">
          Back to Home
        </Link>
      </div>
    )
  }

  if (!campaign) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-gold-400 mb-2">Join Campaign</h1>
        <p className="text-slate-400 mb-6">You&apos;ve been invited to join:</p>

        <div className="bg-slate-900/50 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">{campaign.name}</h2>
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <UserAvatar src={campaign.dm.image} name={campaign.dm.name} size="md" />
            <span>DM: {campaign.dm.name || 'Unknown'}</span>
          </div>
          <p className="text-sm text-slate-500 mt-2">
            {campaign.memberCount} {campaign.memberCount === 1 ? 'member' : 'members'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {campaign.isMember ? (
          <div className="space-y-3">
            <p className="text-slate-400">You&apos;re already a member of this campaign!</p>
            <Link
              href={`/campaigns/${campaign.id}`}
              className="block w-full px-6 py-3 bg-gold-500 hover:bg-gold-400 rounded-lg text-slate-900 font-semibold transition-colors"
            >
              Go to Campaign
            </Link>
          </div>
        ) : status === 'unauthenticated' ? (
          <button
            onClick={() => signIn()}
            className="w-full px-6 py-3 bg-gold-500 hover:bg-gold-400 rounded-lg text-slate-900 font-semibold transition-colors"
          >
            Sign In to Join
          </button>
        ) : (
          <button
            onClick={handleJoin}
            disabled={isJoining}
            className="w-full px-6 py-3 bg-gold-500 hover:bg-gold-400 disabled:bg-slate-600 rounded-lg text-slate-900 font-semibold transition-colors"
          >
            {isJoining ? 'Joining...' : 'Join Campaign'}
          </button>
        )}

        <Link
          href="/"
          className="block mt-4 text-slate-500 hover:text-slate-400 text-sm transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
