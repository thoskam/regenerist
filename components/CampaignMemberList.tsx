'use client'

import UserAvatar from './UserAvatar'

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

interface CampaignMemberListProps {
  members: Member[]
  dmUserId: string
  currentUserId: string
  userIsDM: boolean
  onRemove?: (userId: string) => Promise<void>
  onPromote?: (userId: string) => Promise<void>
}

export default function CampaignMemberList({
  members,
  dmUserId,
  currentUserId,
  userIsDM,
  onRemove,
  onPromote,
}: CampaignMemberListProps) {
  return (
    <div className="space-y-2">
      {members.map((member) => {
        const isDM = member.userId === dmUserId
        const isSelf = member.userId === currentUserId
        const canRemove = userIsDM && !isDM || isSelf && !isDM
        const canPromote = userIsDM && !isDM

        return (
          <div
            key={member.id}
            className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3"
          >
            <div className="flex items-center gap-3">
              <UserAvatar src={member.user.image} name={member.user.name} size="md" />
              <div>
                <p className="text-white font-medium">
                  {member.user.name || 'Unknown'}
                  {isSelf && <span className="text-slate-500 text-sm ml-2">(you)</span>}
                </p>
                <p className="text-xs text-slate-500">
                  {isDM ? 'Dungeon Master' : 'Player'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isDM && (
                <span className="px-2 py-1 bg-gold-500/20 text-gold-400 rounded text-xs font-medium">
                  DM
                </span>
              )}
              {canPromote && onPromote && (
                <button
                  onClick={() => onPromote(member.userId)}
                  className="text-xs text-slate-500 hover:text-gold-400 transition-colors"
                  title="Make DM"
                >
                  Promote
                </button>
              )}
              {canRemove && onRemove && (
                <button
                  onClick={() => onRemove(member.userId)}
                  className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                >
                  {isSelf ? 'Leave' : 'Remove'}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
