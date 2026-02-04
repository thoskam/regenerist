'use client'

import RollableAbility from '@/components/abilities/RollableAbility'
import { getStatModifier } from '@/lib/statMapper'
import type { Stats } from '@/lib/types'
import type { CalculatedStats } from '@/lib/modifiers/types'

interface GlobalHUDProps {
  stats: Stats
  baseStats?: Stats | null
  currentHp: number
  maxHp: number
  tempHp?: number
  ac?: number
  initiative?: number
  speed?: number
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

export default function GlobalHUD({
  stats,
  baseStats,
  currentHp,
  maxHp,
  tempHp = 0,
  ac,
  initiative,
  speed,
  characterId,
  characterName,
}: GlobalHUDProps) {
  return (
    <div className="sticky top-16 z-30 bg-slate-950/95 border-b border-slate-800 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 py-2 space-y-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-2">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">HP</div>
            <div className="text-xl font-bold text-white">
              {currentHp}
              <span className="text-slate-500"> / {maxHp}</span>
            </div>
            {tempHp > 0 && <div className="text-[10px] text-cyan-400">+{tempHp} temp</div>}
          </div>
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-2">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">AC</div>
            <div className="text-xl font-bold text-gold-400">{ac ?? '--'}</div>
          </div>
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-2">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Initiative</div>
            <div className="text-xl font-bold text-white">
              {initiative !== undefined ? (initiative >= 0 ? `+${initiative}` : initiative) : '--'}
            </div>
          </div>
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-2">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Speed</div>
            <div className="text-xl font-bold text-white">{speed ?? '--'} ft</div>
          </div>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((stat) => (
            <RollableAbility
              key={stat}
              abilityName={STAT_NAMES[stat]}
              abilityAbbr={STAT_LABELS[stat]}
              score={stats[stat]}
              baseValue={baseStats?.[stat]}
              modifier={getStatModifier(stats[stat])}
              characterId={characterId}
              characterName={characterName}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
