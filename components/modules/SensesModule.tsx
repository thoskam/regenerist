'use client'

import DraggableModule from '@/components/layout/DraggableModule'
import type { HydratedRaceInfo } from '@/lib/types/5etools'

interface SensesModuleProps {
  raceInfo: HydratedRaceInfo | null
}

const SENSE_KEYWORDS = ['darkvision', 'blindsight', 'tremorsense', 'truesight']

function extractSenses(raceInfo: HydratedRaceInfo | null) {
  if (!raceInfo) return []
  const senses: string[] = []
  for (const trait of raceInfo.traits) {
    const text = `${trait.name} ${trait.description}`.toLowerCase()
    for (const sense of SENSE_KEYWORDS) {
      if (text.includes(sense) && !senses.includes(sense)) {
        senses.push(sense)
      }
    }
  }
  return senses
}

export default function SensesModule({ raceInfo }: SensesModuleProps) {
  const senses = extractSenses(raceInfo)

  return (
    <DraggableModule moduleId="senses">
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h3 className="text-xs text-slate-400 font-semibold tracking-wider mb-3">SENSES</h3>
        {senses.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {senses.map((sense) => (
              <span key={sense} className="px-2 py-1 rounded bg-slate-700 text-sm text-slate-200">
                {sense.charAt(0).toUpperCase() + sense.slice(1)}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No special senses listed.</p>
        )}
      </div>
    </DraggableModule>
  )
}
