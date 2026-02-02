'use client'

import DraggableModule from '@/components/layout/DraggableModule'
import StatBlock from '@/components/StatBlock'
import type { Stats } from '@/lib/types'

interface AbilityScoresModuleProps {
  stats: Stats
  baseStats?: Stats | null
  isRegenerating: boolean
  regenPhase: 'idle' | 'fading-out' | 'loading' | 'flashing-in'
}

export default function AbilityScoresModule({ stats, baseStats, isRegenerating, regenPhase }: AbilityScoresModuleProps) {
  return (
    <DraggableModule moduleId="ability-scores">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((stat, index) => (
          <StatBlock
            key={stat}
            name={stat}
            value={stats[stat]}
            baseValue={baseStats?.[stat]}
            animate={isRegenerating}
            pulseStyle={
              regenPhase === 'loading'
                ? { animation: `grid-pulse 1.2s ease-in-out infinite ${index * 0.1}s` }
                : undefined
            }
          />
        ))}
      </div>
    </DraggableModule>
  )
}
