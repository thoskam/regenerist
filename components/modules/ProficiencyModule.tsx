'use client'

import DraggableModule from '@/components/layout/DraggableModule'
import { formatModifier } from '@/lib/calculations'

interface ProficiencyModuleProps {
  proficiencyBonus: number
  regenPhase: 'idle' | 'fading-out' | 'loading' | 'flashing-in'
}

export default function ProficiencyModule({ proficiencyBonus, regenPhase }: ProficiencyModuleProps) {
  return (
    <DraggableModule moduleId="proficiency">
      <div
        className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-center"
        style={regenPhase === 'loading' ? { animation: 'grid-pulse 1.2s ease-in-out infinite 0.3s' } : undefined}
      >
        <span className="text-xs text-slate-400 font-semibold tracking-wider block">PROFICIENCY BONUS</span>
        <span className="text-2xl font-bold text-gold-400">{formatModifier(proficiencyBonus)}</span>
      </div>
    </DraggableModule>
  )
}
