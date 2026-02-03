'use client'

import { Stats } from '@/lib/types'
import { formatModifier } from '@/lib/calculations'
import { StatName, getStatModifier } from '@/lib/statMapper'
import RollableSave from '@/components/saves/RollableSave'

interface SavesTableProps {
  stats: Stats
  savingThrowProficiencies: string[]
  proficiencyBonus: number
  characterId: string
  characterName: string
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
  characterId,
  characterName,
}: SavesTableProps) {
  const calculateSaveModifier = (ability: StatName): number => {
    const statMod = getStatModifier(stats[ability])
    const isProficient = savingThrowProficiencies.includes(ability)
    return statMod + (isProficient ? proficiencyBonus : 0)
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <h3 className="text-xs text-slate-400 font-semibold tracking-wider mb-3">SAVING THROWS</h3>

      <div className="grid grid-cols-2 gap-1">
        {SAVE_ORDER.map((ability) => {
          const isProficient = savingThrowProficiencies.includes(ability)
          const modifier = calculateSaveModifier(ability)
          const abilityModifier = getStatModifier(stats[ability])

          return (
            <div key={ability}>
              <RollableSave
                saveName={SAVE_LABELS[ability]}
                modifier={modifier}
                isProficient={isProficient}
                proficiencyBonus={proficiencyBonus}
                abilityModifier={abilityModifier}
                characterId={characterId}
                characterName={characterName}
              />
              <span className="sr-only">{formatModifier(modifier)}</span>
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
