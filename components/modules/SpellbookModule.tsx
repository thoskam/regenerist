'use client'

import { useState, useCallback, useMemo } from 'react'
import DraggableModule from '@/components/layout/DraggableModule'
import SpellList from '@/components/SpellList'
import type { HydratedCharacterData } from '@/lib/types/5etools'
import type { Stats } from '@/lib/types'
import {
  isPreparedCaster,
  calculateMaxPreparedSpells,
  getAlwaysPreparedSpells,
  getPreparationAbility,
} from '@/lib/spellPreparation'

interface SpellbookModuleProps {
  hydratedData: HydratedCharacterData | null
  stats: Stats
  proficiencyBonus: number
  slug: string
  lifeId: number
  className: string
  subclassName: string
  level: number
  onRefresh: () => void
}

function getSpellHeader(className: string, isPrepared: boolean): string {
  if (className.toLowerCase() === 'wizard') return 'Spellbook'
  if (isPrepared) return 'Prepared Spells'
  return 'Spells Known'
}

export default function SpellbookModule({
  hydratedData,
  stats,
  proficiencyBonus,
  slug,
  lifeId,
  className,
  subclassName,
  level,
  onRefresh,
}: SpellbookModuleProps) {
  // Track prepared spells locally for optimistic updates
  const [localPreparedSpells, setLocalPreparedSpells] = useState<string[] | null>(null)

  if (!hydratedData?.isSpellcaster || !hydratedData.spellcastingAbility) return null

  // Calculate preparation info
  const isPrepared = isPreparedCaster(className)
  const prepAbility = getPreparationAbility(className)
  const prepModifier = prepAbility ? Math.floor((stats[prepAbility as keyof Stats] - 10) / 2) : 0
  const maxPreparedSpells = isPrepared ? calculateMaxPreparedSpells(className, level, prepModifier) : 0
  const alwaysPreparedSpells = isPrepared ? getAlwaysPreparedSpells(className, subclassName, level) : []

  // Get prepared spells from spellbook or use local state for optimistic updates
  const spellbookData = hydratedData.selectedSpellbook as {
    spells: { name: string }[]
    archivistNote: string
    preparedSpells?: string[]
  } | null

  const preparedSpells = localPreparedSpells ?? spellbookData?.preparedSpells ?? []

  // Handle prepared spells change
  const handlePreparedSpellsChange = useCallback(async (newPreparedSpells: string[]) => {
    // Optimistic update
    setLocalPreparedSpells(newPreparedSpells)

    try {
      const res = await fetch(`/api/characters/${slug}/lives/${lifeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spellbook: {
            ...spellbookData,
            spellNames: spellbookData?.spells.map(s => s.name) || [],
            preparedSpells: newPreparedSpells,
          },
        }),
      })

      if (res.ok) {
        // Clear local state and refresh to get server state
        setLocalPreparedSpells(null)
        onRefresh()
      } else {
        // Revert on error
        setLocalPreparedSpells(null)
      }
    } catch {
      // Revert on error
      setLocalPreparedSpells(null)
    }
  }, [slug, lifeId, spellbookData, onRefresh])

  return (
    <DraggableModule moduleId="spellbook">
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-300">
            {getSpellHeader(className, isPrepared)}
          </h3>
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
            // Preparation props
            className={className}
            isPreparedCaster={isPrepared}
            preparedSpells={preparedSpells}
            alwaysPreparedSpells={alwaysPreparedSpells}
            maxPreparedSpells={maxPreparedSpells}
            onPreparedSpellsChange={handlePreparedSpellsChange}
          />
        </div>
      </div>
    </DraggableModule>
  )
}
