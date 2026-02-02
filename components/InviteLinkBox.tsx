'use client'

import { useState } from 'react'

interface InviteLinkBoxProps {
  inviteCode: string
  onRegenerate?: () => Promise<void>
  showRegenerate?: boolean
}

export default function InviteLinkBox({
  inviteCode,
  onRegenerate,
  showRegenerate = true,
}: InviteLinkBoxProps) {
  const [copied, setCopied] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/campaigns/join/${inviteCode}`
    : `/campaigns/join/${inviteCode}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleRegenerate = async () => {
    if (!onRegenerate) return
    setIsRegenerating(true)
    try {
      await onRegenerate()
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
      <label className="block text-sm text-slate-400 mb-2">Invite Link</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inviteUrl}
          readOnly
          className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-300 text-sm"
        />
        <button
          onClick={handleCopy}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            copied
              ? 'bg-green-600 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
          }`}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {showRegenerate && onRegenerate && (
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="mt-2 text-xs text-slate-500 hover:text-slate-400 transition-colors"
        >
          {isRegenerating ? 'Regenerating...' : 'Regenerate invite code'}
        </button>
      )}
    </div>
  )
}
