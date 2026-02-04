'use client'

import DraggableModule from '@/components/layout/DraggableModule'
import type { HydratedRaceInfo } from '@/lib/types/5etools'

interface LanguagesModuleProps {
  raceInfo: HydratedRaceInfo | null
}

function getLanguagesText(raceInfo: HydratedRaceInfo | null) {
  if (!raceInfo) return null
  const trait = raceInfo.traits.find((t) => t.name.toLowerCase().includes('language'))
  return trait?.description || null
}

export default function LanguagesModule({ raceInfo }: LanguagesModuleProps) {
  const languagesText = getLanguagesText(raceInfo)

  return (
    <DraggableModule moduleId="languages">
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h3 className="text-xs text-slate-400 font-semibold tracking-wider mb-3">LANGUAGES</h3>
        {languagesText ? (
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{languagesText}</p>
        ) : (
          <p className="text-sm text-slate-500">No language details available.</p>
        )}
      </div>
    </DraggableModule>
  )
}
