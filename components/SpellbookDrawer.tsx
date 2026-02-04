'use client'

import SpellList from '@/components/SpellList'
import type { HydratedCharacterData } from '@/lib/types/5etools'
import type { Stats } from '@/lib/types'

interface SpellbookDrawerProps {
  hydratedData: HydratedCharacterData | null
  stats: Stats
  proficiencyBonus: number
  slug: string
  lifeId: number
  className: string
  onRefresh: () => void
  isOpen: boolean
  onClose: () => void
  characterId: string
  characterName: string
}

function getSpellHeader(className: string): string {
  return className.toLowerCase() === 'wizard' ? 'Spellbook' : 'Spells Available'
}

export default function SpellbookDrawer({
  hydratedData,
  stats,
  proficiencyBonus,
  slug,
  lifeId,
  className,
  onRefresh,
  isOpen,
  onClose,
  characterId,
  characterName,
}: SpellbookDrawerProps) {
  if (!hydratedData?.isSpellcaster || !hydratedData.spellcastingAbility) return null

  return (
    <>
      {isOpen && (
        <button
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
          aria-label="Close spellbook"
          type="button"
        />
      )}
      <aside
        className={`fixed top-0 right-0 h-full w-1/3 max-w-[520px] min-w-[320px] bg-slate-900 border-l border-slate-700 z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-300">{getSpellHeader(className)}</h3>
          <button
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-white"
            type="button"
          >
            Close
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100%-56px)]">
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
            characterId={characterId}
            characterName={characterName}
          />
        </div>
      </aside>
    </>
  )
}
