'use client'

import { useState } from 'react'
import DraggableModule from '@/components/layout/DraggableModule'
import ActionsTab from '@/components/ActionsTab'
import FeatureDisplay from '@/components/FeatureDisplay'
import type { HydratedCharacterData, HydratedActiveState } from '@/lib/types/5etools'
import type { CharacterAction } from '@/lib/actions/types'
import type { Stats } from '@/lib/types'

interface StoryTabsModuleProps {
  actions: CharacterAction[]
  hydratedData: HydratedCharacterData | null
  stats: Stats
  slug: string
  lifeId: number
  characterId: string
  characterName: string
  level: number
  activeState: HydratedActiveState | null
  onUseAction: (action: CharacterAction) => void
  onRefresh: () => void
}

export default function StoryTabsModule({
  actions,
  hydratedData,
  stats,
  slug,
  lifeId,
  characterId,
  characterName,
  level,
  activeState,
  onUseAction,
  onRefresh,
}: StoryTabsModuleProps) {
  const [activeTab, setActiveTab] = useState<'actions' | 'features'>('actions')

  return (
    <DraggableModule moduleId="story-tabs">
      <div className="space-y-4">
        <div className="flex border-b border-slate-700">
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
        </div>

        {activeTab === 'actions' && (
          <ActionsTab
            actions={actions}
            activeState={activeState}
            onUseAction={onUseAction}
            characterId={characterId}
            characterName={characterName}
          />
        )}

        {activeTab === 'features' && hydratedData && (
          <div className="space-y-4">
            {hydratedData.classInfo && (
              <FeatureDisplay
                title={`${hydratedData.classInfo.name.toUpperCase()} FEATURES`}
                features={hydratedData.classInfo.features.filter(
                  (feature) => feature.name.toLowerCase() !== 'ability score improvement'
                )}
                currentLevel={level}
              />
            )}
          </div>
        )}

      </div>
    </DraggableModule>
  )
}
