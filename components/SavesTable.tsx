'use client'

import { Stats } from '@/lib/types'
import { formatModifier } from '@/lib/calculations'
import { StatName, getStatModifier } from '@/lib/statMapper'

interface SavesTableProps {
  stats: Stats
  savingThrowProficiencies: string[]
  proficiencyBonus: number
}

const SAVE_ORDER: StatName[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

const SAVE_LABELS: Record<StatName, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
}

export default function SavesTable({
  stats,
  savingThrowProficiencies,
  proficiencyBonus,
}: SavesTableProps) {
  const calculateSaveModifier = (ability: StatName): number => {
    const statMod = getStatModifier(stats[ability])
    const isProficient = savingThrowProficiencies.includes(ability)
    return statMod + (isProficient ? proficiencyBonus : 0)
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <h3 className="text-xs text-slate-400 font-semibold tracking-wider mb-3">SAVING THROWS</h3>

      <div className="grid grid-cols-2 gap-2">
        {SAVE_ORDER.map((ability) => {
          const isProficient = savingThrowProficiencies.includes(ability)
          const modifier = calculateSaveModifier(ability)

          return (
            <div
              key={ability}
              className={`flex items-center justify-between py-1.5 px-2 rounded ${
                isProficient ? 'bg-gold-500/10' : 'bg-slate-900/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isProficient ? 'bg-gold-400' : 'bg-slate-600'
                  }`}
                />
                <span
                  className={`text-sm ${
                    isProficient ? 'text-gold-400 font-medium' : 'text-slate-400'
                  }`}
                >
                  {SAVE_LABELS[ability]}
                </span>
              </div>
              <span
                className={`text-sm font-mono ${
                  isProficient ? 'text-gold-400 font-semibold' : 'text-slate-500'
                }`}
              >
                {formatModifier(modifier)}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-3 pt-2 border-t border-slate-700">
        <div className="text-xs text-slate-500">
          Proficient:{' '}
          <span className="text-slate-400">
            {savingThrowProficiencies.map(s => SAVE_LABELS[s as StatName]).join(', ') || 'None'}
          </span>
        </div>
      </div>
    </div>
  )
}
