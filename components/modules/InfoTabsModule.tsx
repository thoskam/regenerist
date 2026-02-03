'use client'

import { useState } from 'react'
import DraggableModule from '@/components/layout/DraggableModule'
import FormSummary from '@/components/FormSummary'
import FeatureDisplay from '@/components/FeatureDisplay'
import ChoicesDisplay from '@/components/ChoicesDisplay'
import type { HydratedRaceInfo, HydratedSubclassInfo } from '@/lib/types/5etools'

interface InfoTabsModuleProps {
  race: string
  className: string
  subclass: string
  effect: string
  story: string | null
  subclassChoice: string | null
  level: number
  raceInfo: HydratedRaceInfo | null
  subclassInfo: HydratedSubclassInfo | null
}

export default function InfoTabsModule({
  race,
  className,
  subclass,
  effect,
  story,
  subclassChoice,
  level,
  raceInfo,
  subclassInfo,
}: InfoTabsModuleProps) {
  const [formTab, setFormTab] = useState<'summary' | 'traits' | 'choices'>('summary')

  return (
    <DraggableModule moduleId="info-tabs">
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setFormTab('summary')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              formTab === 'summary'
                ? 'text-gold-400 bg-slate-700/50 border-b-2 border-gold-400'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
            }`}
          >
            Summary
          </button>
          {raceInfo && raceInfo.traits.length > 0 && (
            <button
              onClick={() => setFormTab('traits')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                formTab === 'traits'
                  ? 'text-gold-400 bg-slate-700/50 border-b-2 border-gold-400'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
              }`}
            >
              {raceInfo.name} Traits
            </button>
          )}
          {(subclassChoice || (subclassInfo && subclassInfo.features.length > 0)) && (
            <button
              onClick={() => setFormTab('choices')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                formTab === 'choices'
                  ? 'text-gold-400 bg-slate-700/50 border-b-2 border-gold-400'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
              }`}
            >
              {subclass}
            </button>
          )}
        </div>

        <div className="p-5">
          {formTab === 'summary' && (
            <FormSummary
              race={race}
              className={className}
              subclass={subclass}
              effect={effect}
              story={story ?? ''}
            />
          )}

          {formTab === 'traits' && raceInfo && raceInfo.traits.length > 0 && (
            <FeatureDisplay
              title={`${raceInfo.name.toUpperCase()} TRAITS`}
              features={raceInfo.traits.map((trait) => ({
                name: trait.name,
                level: 1,
                description: trait.description,
              }))}
              currentLevel={level}
              noContainer
            />
          )}

          {formTab === 'choices' && (
            <ChoicesDisplay
              className={className}
              subclass={subclass}
              subclassChoice={subclassChoice}
              level={level}
              subclassFeatures={subclassInfo?.features || []}
              subclassName={subclassInfo?.name}
            />
          )}
        </div>
      </div>
    </DraggableModule>
  )
}
