'use client'

import DraggableModule from '@/components/layout/DraggableModule'
import { getStatModifier } from '@/lib/statMapper'
import RollableAbility from '@/components/abilities/RollableAbility'
import type { Stats } from '@/lib/types'

interface AbilityScoresModuleProps {
  stats: Stats
  baseStats?: Stats | null
  isRegenerating: boolean
  regenPhase: 'idle' | 'fading-out' | 'loading' | 'flashing-in'
  characterId: string
  characterName: string
}

const STAT_LABELS: Record<keyof Stats, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
}

const STAT_NAMES: Record<keyof Stats, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
}

export default function AbilityScoresModule({
  stats,
  baseStats,
  isRegenerating,
  regenPhase,
  characterId,
  characterName,
}: AbilityScoresModuleProps) {
  return (
    <DraggableModule moduleId="ability-scores">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((stat, index) => (
          <RollableAbility
            key={stat}
            abilityName={STAT_NAMES[stat]}
            abilityAbbr={STAT_LABELS[stat]}
            score={stats[stat]}
            baseValue={baseStats?.[stat]}
            modifier={getStatModifier(stats[stat])}
            animate={isRegenerating}
            pulseStyle={
              regenPhase === 'loading'
                ? { animation: `grid-pulse 1.2s ease-in-out infinite ${index * 0.1}s` }
                : undefined
            }
            characterId={characterId}
            characterName={characterName}
          />
        ))}
      </div>
    </DraggableModule>
  )
}
