'use client'

import DraggableModule from '@/components/layout/DraggableModule'
import SpellList from '@/components/SpellList'
import type { HydratedCharacterData } from '@/lib/types/5etools'
import type { Stats } from '@/lib/types'

interface SpellbookModuleProps {
  hydratedData: HydratedCharacterData | null
  stats: Stats
  proficiencyBonus: number
  slug: string
  lifeId: number
  className: string
  onRefresh: () => void
}

function getSpellHeader(className: string): string {
  return className.toLowerCase() === 'wizard' ? 'Spellbook' : 'Spells Available'
}

export default function SpellbookModule({
  hydratedData,
  stats,
  proficiencyBonus,
  slug,
  lifeId,
  className,
  onRefresh,
}: SpellbookModuleProps) {
  if (!hydratedData?.isSpellcaster || !hydratedData.spellcastingAbility) return null

  return (
    <DraggableModule moduleId="spellbook">
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-300">{getSpellHeader(className)}</h3>
        </div>
        <div className="p-4">
          <SpellList
            selectedSpellbook={hydratedData.selectedSpellbook}
            allAvailableSpells={hydratedData.spells || undefined}
            maxSpellLevel={hydratedData.maxSpellLevel || 0}
            spellcastingAbility={hydratedData.spellcastingAbility}
            stats={stats}
            proficiencyBonus={proficiencyBonus}
            activeState={hydratedData.activeState}
            slug={slug}
            lifeId={lifeId}
            onSpellbookUpdate={onRefresh}
            onCast={onRefresh}
          />
        </div>
      </div>
    </DraggableModule>
  )
}
