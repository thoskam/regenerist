'use client'

import DraggableModule from '@/components/layout/DraggableModule'
import { calculateAC, calculateInitiative, calculateSpeed, formatModifier } from '@/lib/calculations'
import type { Stats } from '@/lib/types'

interface CombatStatsModuleProps {
  stats: Stats
  className: string
  race: string
  regenPhase: 'idle' | 'fading-out' | 'loading' | 'flashing-in'
}

export default function CombatStatsModule({ stats, className, race, regenPhase }: CombatStatsModuleProps) {
  return (
    <DraggableModule moduleId="combat-stats">
      <div className="grid grid-cols-3 gap-4">
        <div
          className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-center"
          style={regenPhase === 'loading' ? { animation: 'grid-pulse 1.2s ease-in-out infinite' } : undefined}
        >
          <span className="text-xs text-slate-400 font-semibold tracking-wider block">AC</span>
          <span className="text-3xl font-bold text-white">{calculateAC(stats, className)}</span>
        </div>
        <div
          className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-center"
          style={regenPhase === 'loading' ? { animation: 'grid-pulse 1.2s ease-in-out infinite 0.1s' } : undefined}
        >
          <span className="text-xs text-slate-400 font-semibold tracking-wider block">INITIATIVE</span>
          <span className="text-3xl font-bold text-white">{formatModifier(calculateInitiative(stats))}</span>
        </div>
        <div
          className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-center"
          style={regenPhase === 'loading' ? { animation: 'grid-pulse 1.2s ease-in-out infinite 0.2s' } : undefined}
        >
          <span className="text-xs text-slate-400 font-semibold tracking-wider block">SPEED</span>
          <span className="text-3xl font-bold text-white">{calculateSpeed(race)} ft</span>
        </div>
      </div>
    </DraggableModule>
  )
}
