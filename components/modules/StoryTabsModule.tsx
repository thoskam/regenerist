'use client'

import { useState } from 'react'
import DraggableModule from '@/components/layout/DraggableModule'
import StoryDisplay from '@/components/StoryDisplay'
import ActionsTab from '@/components/ActionsTab'
import FeatureDisplay from '@/components/FeatureDisplay'
import SpellList from '@/components/SpellList'
import type { HydratedCharacterData, HydratedActiveState } from '@/lib/types/5etools'
import type { CharacterAction } from '@/lib/actions/types'
import type { Stats } from '@/lib/types'

interface StoryTabsModuleProps {
  story: string
  effect: string
  actions: CharacterAction[]
  hydratedData: HydratedCharacterData | null
  stats: Stats
  proficiencyBonus: number
  slug: string
  lifeId: number
  level: number
  activeState: HydratedActiveState | null
  onUseAction: (action: CharacterAction) => void
  onRefresh: () => void
}

export default function StoryTabsModule({
  story,
  effect,
  actions,
  hydratedData,
  stats,
  proficiencyBonus,
  slug,
  lifeId,
  level,
  activeState,
  onUseAction,
  onRefresh,
}: StoryTabsModuleProps) {
  const [activeTab, setActiveTab] = useState<'story' | 'actions' | 'features' | 'spells'>('story')

  return (
    <DraggableModule moduleId="story-tabs">
      <div className="space-y-4">
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('story')}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'story'
                ? 'text-gold-400 border-b-2 border-gold-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Story
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'actions'
                ? 'text-gold-400 border-b-2 border-gold-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Actions
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'features'
                ? 'text-gold-400 border-b-2 border-gold-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Features
          </button>
          {hydratedData?.isSpellcaster && (
            <button
              onClick={() => setActiveTab('spells')}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'spells'
                  ? 'text-gold-400 border-b-2 border-gold-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Spells
            </button>
          )}
        </div>

        {activeTab === 'story' && <StoryDisplay story={story} effect={effect} />}

        {activeTab === 'actions' && (
          <ActionsTab actions={actions} activeState={activeState} onUseAction={onUseAction} />
        )}

        {activeTab === 'features' && hydratedData && (
          <div className="space-y-4">
            {hydratedData.classInfo && (
              <FeatureDisplay
                title={`${hydratedData.classInfo.name.toUpperCase()} FEATURES`}
                features={hydratedData.classInfo.features}
                currentLevel={level}
              />
            )}
          </div>
        )}

        {activeTab === 'spells' && hydratedData?.isSpellcaster && hydratedData.spellcastingAbility && (
          <SpellList
            selectedSpellbook={hydratedData.selectedSpellbook}
            allAvailableSpells={hydratedData.spells || undefined}
            maxSpellLevel={hydratedData.maxSpellLevel || 0}
            spellcastingAbility={hydratedData.spellcastingAbility}
            stats={stats}
            proficiencyBonus={proficiencyBonus}
            slug={slug}
            lifeId={lifeId}
            onSpellbookUpdate={onRefresh}
          />
        )}
      </div>
    </DraggableModule>
  )
}
