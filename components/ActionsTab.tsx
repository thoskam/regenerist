'use client'

import { useMemo, useState } from 'react'
import type { CharacterAction, ActionTiming } from '@/lib/actions/types'
import type { HydratedActiveState } from '@/lib/types/5etools'
import ActionCard from './ActionCard'

interface ActionsTabProps {
  actions: CharacterAction[]
  activeState: HydratedActiveState | null
  onUseAction: (action: CharacterAction) => void
  characterId: string
  characterName: string
}

const sections: Array<{ key: ActionTiming; title: string }> = [
  { key: 'action', title: '⚔️ Actions' },
  { key: 'bonus', title: '⚡ Bonus Actions' },
  { key: 'reaction', title: '🛡️ Reactions' },
  { key: 'special', title: '✨ Special' },
]

export default function ActionsTab({
  actions,
  activeState,
  onUseAction,
  characterId,
  characterName,
}: ActionsTabProps) {
  const [filter, setFilter] = useState<ActionTiming | 'all' | 'attack'>('all')
  const [standardOpen, setStandardOpen] = useState(false)
  const [expandedActions, setExpandedActions] = useState<Record<string, boolean>>({})
  const [expandAll, setExpandAll] = useState(false)

  const grouped = useMemo(() => groupActionsByTiming(actions), [actions])
  const standardActions = useMemo(
    () => (grouped.action || []).filter((action) => action.isStandard),
    [grouped]
  )
  const attackActions = useMemo(() => actions.filter((action) => action.isAttack), [actions])

  return (
    <div className="space-y-6 p-2 sm:p-3">
      <div className="flex gap-2 flex-wrap items-center">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded text-sm ${filter === 'all' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('attack')}
          className={`px-3 py-1 rounded text-sm ${filter === 'attack' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300'}`}
        >
          Attacks
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
        <button
          onClick={() => setFilter('special')}
          className={`px-3 py-1 rounded text-sm ${filter === 'special' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300'}`}
        >
          Special
        </button>
        <button
          onClick={() => setExpandAll((prev) => !prev)}
          className="ml-auto px-3 py-1 rounded text-sm bg-slate-700 text-slate-300 hover:bg-slate-600"
          type="button"
        >
          {expandAll ? 'Collapse All' : 'Expand All'}
        </button>

      </div>

      {(filter === 'all' || filter === 'attack') && attackActions.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-3">⚔️ Attacks</h3>
          <div className="grid gap-3">
            {attackActions.map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                activeState={activeState}
                onUse={() => onUseAction(action)}
                characterId={characterId}
                characterName={characterName}
                isCollapsed={!expandAll && !expandedActions[action.id]}
                onToggle={() =>
                  setExpandedActions((prev) => ({
                    ...prev,
                    [action.id]: !prev[action.id],
                  }))
                }
              />
            ))}
          </div>
        </div>
      )}

      {sections.map((section) => {
        if (filter !== 'all' && filter !== section.key) return null
        const sectionActions = (grouped[section.key as ActionTiming] || []).filter(
          (action) => !action.isStandard && !action.isAttack
        )
        if (sectionActions.length === 0) return null

        return (
          <div key={section.key}>
            <h3 className="text-lg font-bold mb-3">{section.title}</h3>
            <div className="grid gap-3">
              {sectionActions.map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  activeState={activeState}
                  onUse={() => onUseAction(action)}
                  characterId={characterId}
                  characterName={characterName}
                  isCollapsed={!expandAll && !expandedActions[action.id]}
                  onToggle={() =>
                    setExpandedActions((prev) => ({
                      ...prev,
                      [action.id]: !prev[action.id],
                    }))
                  }
                />
              ))}
            </div>
          </div>
        )
      })}

      {filter === 'all' && standardActions.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setStandardOpen((prev) => !prev)}
            className="text-lg font-bold mb-3 flex items-center gap-2 text-slate-300 hover:text-white"
          >
            📋 Standard Actions
            <span className="text-xs text-slate-500">({standardActions.length})</span>
            <span className="text-sm text-slate-400">{standardOpen ? '▲' : '▼'}</span>
          </button>
          {standardOpen && (
            <div className="grid gap-3">
              {standardActions.map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  activeState={activeState}
                  onUse={() => onUseAction(action)}
                  characterId={characterId}
                  characterName={characterName}
                  isCollapsed={!expandAll && !expandedActions[action.id]}
                  onToggle={() =>
                    setExpandedActions((prev) => ({
                      ...prev,
                      [action.id]: !prev[action.id],
                    }))
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
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
