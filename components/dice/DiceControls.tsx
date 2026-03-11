'use client'

import { useRoll } from '@/lib/dice/RollContext'
import AdvantageToggle from './AdvantageToggle'
import NarrationToggle from './NarrationToggle'

interface DiceControlsProps {
  campaignId?: string
}

export default function DiceControls({ campaignId: _campaignId }: DiceControlsProps) {
  const { settings, updateSettings, roll20Connected } = useRoll()

  return (
    <div className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg">
      <AdvantageToggle />

      <div className="w-px h-6 bg-slate-700" />

      <NarrationToggle />

      {/* Roll20 toggle — only shown when extension is connected */}
      {roll20Connected && (
        <>
          <div className="w-px h-6 bg-slate-700" />
          <button
            onClick={() => updateSettings({ autoSendToRoll20: !settings.autoSendToRoll20 })}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
              settings.autoSendToRoll20
                ? 'bg-red-800 text-white'
                : 'bg-slate-700 text-slate-400 hover:text-white'
            }`}
            title={settings.autoSendToRoll20 ? 'Auto-sending rolls to Roll20' : 'Click to auto-send rolls to Roll20'}
            type="button"
          >
            🎲 <span className="hidden sm:inline">Roll20</span>
          </button>
        </>
      )}
    </div>
  )
}
