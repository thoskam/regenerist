'use client'

import { MessageSquare } from 'lucide-react'
import { useRoll } from '@/lib/dice/RollContext'
import AdvantageToggle from './AdvantageToggle'
import NarrationToggle from './NarrationToggle'

interface DiceControlsProps {
  campaignId?: string
  discordEnabled?: boolean
}

export default function DiceControls({ campaignId, discordEnabled }: DiceControlsProps) {
  const { settings, updateSettings, setCampaignId } = useRoll()

  return (
    <div className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg">
      <AdvantageToggle />

      <div className="w-px h-6 bg-slate-700" />

      <NarrationToggle />

      {campaignId && discordEnabled && (
        <>
          <div className="w-px h-6 bg-slate-700" />
          <button
            onClick={() => {
              setCampaignId(campaignId)
              updateSettings({ autoSendToDiscord: !settings.autoSendToDiscord })
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
              settings.autoSendToDiscord
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Auto-send rolls to Discord"
            type="button"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Discord</span>
          </button>
        </>
      )}
    </div>
  )
}
