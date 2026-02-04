'use client'

import {
  Award,
  Eye,
  History,
  Languages,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'
import type { ModuleId } from '@/lib/layout/types'

const MODULE_ICONS: Record<
  ModuleId,
  {
    label: string
    Icon: typeof Award
    baseBg: string
    hoverText: string
  }
> = {
  skills: { label: 'Proficiencies', Icon: Award, baseBg: 'bg-amber-900/30', hoverText: 'hover:text-amber-200' },
  'saving-throws': { label: 'Saving Throws', Icon: ShieldCheck, baseBg: 'bg-emerald-900/30', hoverText: 'hover:text-emerald-200' },
  proficiency: { label: 'Proficiency Bonus', Icon: Award, baseBg: 'bg-amber-900/30', hoverText: 'hover:text-amber-200' },
  'info-tabs': { label: 'Character Info', Icon: ScrollText, baseBg: 'bg-slate-800', hoverText: 'hover:text-cyan-200' },
  chronicle: { label: "Archivist's Chronicle", Icon: History, baseBg: 'bg-indigo-900/30', hoverText: 'hover:text-indigo-200' },
  conditions: { label: 'Conditions', Icon: Zap, baseBg: 'bg-red-900/30', hoverText: 'hover:text-red-200' },
  languages: { label: 'Languages', Icon: Languages, baseBg: 'bg-blue-900/30', hoverText: 'hover:text-blue-200' },
  senses: { label: 'Senses', Icon: Eye, baseBg: 'bg-teal-900/30', hoverText: 'hover:text-teal-200' },
  resources: { label: 'Resources', Icon: ScrollText, baseBg: 'bg-slate-800', hoverText: 'hover:text-cyan-200' },
  'combat-stats': { label: 'Combat', Icon: ShieldCheck, baseBg: 'bg-slate-800', hoverText: 'hover:text-cyan-200' },
  'hit-points': { label: 'Hit Points', Icon: ShieldCheck, baseBg: 'bg-slate-800', hoverText: 'hover:text-cyan-200' },
  'ability-scores': { label: 'Ability Scores', Icon: Award, baseBg: 'bg-slate-800', hoverText: 'hover:text-cyan-200' },
  'story-tabs': { label: 'Actions', Icon: ShieldCheck, baseBg: 'bg-slate-800', hoverText: 'hover:text-cyan-200' },
  spellbook: { label: 'Spellbook', Icon: Sparkles, baseBg: 'bg-indigo-900/40', hoverText: 'hover:text-indigo-200' },
  quirks: { label: 'Quirks', Icon: History, baseBg: 'bg-slate-800', hoverText: 'hover:text-cyan-200' },
  'temp-hp': { label: 'Temp HP', Icon: ShieldCheck, baseBg: 'bg-slate-800', hoverText: 'hover:text-cyan-200' },
  exhaustion: { label: 'Exhaustion', Icon: Zap, baseBg: 'bg-red-900/30', hoverText: 'hover:text-red-200' },
  'death-saves': { label: 'Death Saves', Icon: ShieldCheck, baseBg: 'bg-slate-800', hoverText: 'hover:text-cyan-200' },
  concentration: { label: 'Concentration', Icon: Sparkles, baseBg: 'bg-indigo-900/30', hoverText: 'hover:text-indigo-200' },
  inventory: { label: 'Inventory', Icon: ScrollText, baseBg: 'bg-slate-800', hoverText: 'hover:text-cyan-200' },
}

interface UtilityBarProps {
  items: ModuleId[]
  activeModule: ModuleId | null
  onSelect: (moduleId: ModuleId) => void
}

export default function UtilityBar({ items, activeModule, onSelect }: UtilityBarProps) {
  if (items.length === 0) return null

  return (
    <div className="fixed right-2 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-4">
      {items.map((id) => {
        const config = MODULE_ICONS[id]
        const Icon = config?.Icon || Award
        const label = config?.label || id
        const baseBg = config?.baseBg || 'bg-slate-900'
        const hoverText = config?.hoverText || 'hover:text-white'
        const isActive = activeModule === id
        return (
          <div key={id} className="relative group">
            <button
              onClick={() => onSelect(id)}
              className={`w-14 h-14 rounded-xl border flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-gold-500/30 border-gold-400 text-gold-300 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                  : `${baseBg} border-slate-700 text-slate-300 ${hoverText} hover:border-cyan-300 hover:scale-110`
              }`}
              type="button"
            >
              <Icon className="w-6 h-6" strokeWidth={1.8} />
            </button>
            <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 text-slate-100 text-xs px-2 py-1 rounded border border-slate-700 whitespace-nowrap">
              Open {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
