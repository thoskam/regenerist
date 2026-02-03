'use client'

import { ChevronUp, ChevronDown, Minus } from 'lucide-react'
import { useRoll } from '@/lib/dice/RollContext'
import type { AdvantageState } from '@/lib/dice/types'

export default function AdvantageToggle() {
  const { globalAdvantage, setGlobalAdvantage } = useRoll()

  const options: { state: AdvantageState; label: string; icon: typeof ChevronUp; color: string }[] = [
    {
      state: 'disadvantage',
      label: 'Disadv',
      icon: ChevronDown,
      color: 'text-red-400 bg-red-900/30 border-red-600',
    },
    {
      state: 'normal',
      label: 'Normal',
      icon: Minus,
      color: 'text-slate-400 bg-slate-800 border-slate-600',
    },
    {
      state: 'advantage',
      label: 'Adv',
      icon: ChevronUp,
      color: 'text-green-400 bg-green-900/30 border-green-600',
    },
  ]

  return (
    <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg">
      {options.map(({ state, label, icon: Icon, color }) => (
        <button
          key={state}
          onClick={() => setGlobalAdvantage(state)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-all ${
            globalAdvantage === state ? `${color} border` : 'text-slate-500 hover:text-slate-300'
          }`}
          type="button"
        >
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}
