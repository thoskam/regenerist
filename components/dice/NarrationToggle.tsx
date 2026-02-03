'use client'

import { Sparkles } from 'lucide-react'
import { useRoll } from '@/lib/dice/RollContext'

export default function NarrationToggle() {
  const { settings, updateSettings } = useRoll()

  return (
    <button
      onClick={() => updateSettings({ enableAINarration: !settings.enableAINarration })}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
        settings.enableAINarration
          ? 'bg-purple-600 text-white'
          : 'bg-slate-700 text-slate-400 hover:text-white'
      }`}
      title="AI Narration for critical rolls"
      type="button"
    >
      <Sparkles className="w-4 h-4" />
      <span className="hidden sm:inline">Narrator</span>
    </button>
  )
}
