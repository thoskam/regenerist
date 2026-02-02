'use client'

import Link from 'next/link'
import UserAvatar from './UserAvatar'

interface DM {
  id: string
  name: string | null
  image: string | null
}

interface CampaignCardProps {
  id: string
  name: string
  dm: DM
  memberCount: number
  characterCount: number
  userRole: 'dm' | 'player'
}

export default function CampaignCard({
  id,
  name,
  dm,
  memberCount,
  characterCount,
  userRole,
}: CampaignCardProps) {
  return (
    <Link
      href={`/campaigns/${id}`}
      className="block bg-slate-800 rounded-lg border border-slate-700 hover:border-gold-500/50 transition-all hover:shadow-lg hover:shadow-gold-500/10 p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xl font-bold text-white">{name}</h3>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            userRole === 'dm'
              ? 'bg-gold-500/20 text-gold-400'
              : 'bg-slate-700 text-slate-400'
          }`}
        >
          {userRole === 'dm' ? 'DM' : 'Player'}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-4 text-sm text-slate-400">
        <UserAvatar src={dm.image} name={dm.name} size="sm" />
        <span>DM: {dm.name || 'Unknown'}</span>
      </div>

      <div className="flex items-center gap-4 text-sm text-slate-500">
        <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
        <span>{characterCount} {characterCount === 1 ? 'character' : 'characters'}</span>
      </div>
    </Link>
  )
}
