'use client'

import { useMemo, useState } from 'react'
import type { CharacterAction, ActionTiming } from '@/lib/actions/types'
import type { HydratedActiveState } from '@/lib/types/5etools'
import ActionCard from './ActionCard'

interface ActionsTabProps {
  actions: CharacterAction[]
  activeState: HydratedActiveState | null
  onUseAction: (action: CharacterAction) => void
}

const sections: Array<{ key: ActionTiming; title: string }> = [
  { key: 'action', title: '⚔️ Actions' },
  { key: 'bonus', title: '⚡ Bonus Actions' },
  { key: 'reaction', title: '🛡️ Reactions' },
  { key: 'special', title: '✨ Special' },
]

export default function ActionsTab({ actions, activeState, onUseAction }: ActionsTabProps) {
  const [filter, setFilter] = useState<ActionTiming | 'all'>('all')
  const [showStandard, setShowStandard] = useState(false)

  const grouped = useMemo(() => groupActionsByTiming(actions), [actions])

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap items-center">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded text-sm ${filter === 'all' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('action')}
          className={`px-3 py-1 rounded text-sm ${filter === 'action' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300'}`}
        >
          Actions
        </button>
        <button
          onClick={() => setFilter('bonus')}
          className={`px-3 py-1 rounded text-sm ${filter === 'bonus' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300'}`}
        >
          Bonus
        </button>
        <button
          onClick={() => setFilter('reaction')}
          className={`px-3 py-1 rounded text-sm ${filter === 'reaction' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300'}`}
        >
          Reactions
        </button>

        <label className="ml-auto flex items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={showStandard}
            onChange={(e) => setShowStandard(e.target.checked)}
          />
          Show Standard Actions
        </label>
      </div>

      {sections.map((section) => {
        if (filter !== 'all' && filter !== section.key) return null
        const sectionActions = (grouped[section.key] || []).filter(
          (action) => showStandard || action.source !== 'standard'
        )
        if (sectionActions.length === 0) return null

        return (
          <div key={section.key}>
            <h3 className="text-lg font-bold mb-3">{section.title}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {sectionActions.map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  activeState={activeState}
                  onUse={() => onUseAction(action)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function groupActionsByTiming(actions: CharacterAction[]) {
  const grouped: Record<ActionTiming, CharacterAction[]> = {
    action: [],
    bonus: [],
    reaction: [],
    free: [],
    movement: [],
    special: [],
  }

  for (const action of actions) {
    grouped[action.timing].push(action)
  }

  return grouped
}
