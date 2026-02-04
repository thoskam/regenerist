'use client'

import DraggableModule from '@/components/layout/DraggableModule'
import { calculateAC, calculateInitiative, calculateSpeed } from '@/lib/calculations'
import type { Stats } from '@/lib/types'
import { getStatModifier } from '@/lib/statMapper'
import InitiativeRoller from '@/components/combat/InitiativeRoller'
import ACDisplay from '@/components/stats/ACDisplay'
import type { CalculatedStats } from '@/lib/modifiers/types'

interface CombatStatsModuleProps {
  stats: Stats
  className: string
  race: string
  regenPhase: 'idle' | 'fading-out' | 'loading' | 'flashing-in'
  characterId: string
  characterName: string
  calculatedStats?: CalculatedStats | null
}

export default function CombatStatsModule({
  stats,
  className,
  race,
  regenPhase,
  characterId,
  characterName,
  calculatedStats,
}: CombatStatsModuleProps) {
  const acTotal = calculatedStats?.ac.total
  const acBreakdown = calculatedStats?.ac.breakdown
  const initiativeTotal = calculatedStats?.initiative
  const speedTotal = calculatedStats?.speed

  return (
    <DraggableModule moduleId="combat-stats">
      <div className="grid grid-cols-3 gap-4">
        <div
          className="text-center"
          style={regenPhase === 'loading' ? { animation: 'grid-pulse 1.2s ease-in-out infinite' } : undefined}
        >
          {acTotal !== undefined && acBreakdown ? (
            <ACDisplay total={acTotal} breakdown={acBreakdown} />
          ) : (
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-center">
              <span className="text-xs text-slate-400 font-semibold tracking-wider block">AC</span>
              <span className="text-3xl font-bold text-white">{calculateAC(stats, className)}</span>
            </div>
          )}
        </div>
        <div style={regenPhase === 'loading' ? { animation: 'grid-pulse 1.2s ease-in-out infinite 0.1s' } : undefined}>
          <InitiativeRoller
            dexModifier={getStatModifier(stats.dex)}
            bonuses={
              initiativeTotal !== undefined
                ? initiativeTotal - getStatModifier(stats.dex)
                : calculateInitiative(stats) - getStatModifier(stats.dex)
            }
            characterId={characterId}
            characterName={characterName}
          />
        </div>
        <div
          className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-center"
          style={regenPhase === 'loading' ? { animation: 'grid-pulse 1.2s ease-in-out infinite 0.2s' } : undefined}
        >
          <span className="text-xs text-slate-400 font-semibold tracking-wider block">SPEED</span>
          <span className="text-3xl font-bold text-white">{speedTotal ?? calculateSpeed(race)} ft</span>
        </div>
      </div>
    </DraggableModule>
  )
}
