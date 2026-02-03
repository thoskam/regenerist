'use client'

import { useState } from 'react'
import { History, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useRoll } from '@/lib/dice/RollContext'
import type { RollResult } from '@/lib/dice/types'

export default function RollHistoryPanel() {
  const { rollHistory, clearHistory, showRollResult } = useRoll()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  if (rollHistory.length === 0) {
    return null
  }

  const recentRolls = isExpanded ? rollHistory : rollHistory.slice(0, 5)

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mb-2 p-3 bg-slate-800 hover:bg-slate-700 rounded-full shadow-lg flex items-center gap-2"
        type="button"
      >
        <History className="w-5 h-5" />
        {rollHistory.length > 0 && (
          <span className="bg-purple-600 text-xs px-2 py-0.5 rounded-full">
            {rollHistory.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 w-80 max-h-96 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-slate-700">
            <h3 className="font-medium flex items-center gap-2">
              <History className="w-4 h-4" />
              Roll History
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={clearHistory}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400"
                title="Clear History"
                type="button"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-400"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-72">
            {recentRolls.map((roll) => (
              <RollHistoryItem key={roll.id} roll={roll} onClick={() => showRollResult(roll)} />
            ))}
          </div>

          {rollHistory.length > 5 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full p-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center gap-1"
              type="button"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show All ({rollHistory.length})
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function RollHistoryItem({ roll, onClick }: { roll: RollResult; onClick: () => void }) {
  const timeAgo = getTimeAgo(roll.timestamp)

  return (
    <button
      onClick={onClick}
      className="w-full p-3 hover:bg-slate-700/50 border-b border-slate-700/50 last:border-b-0 text-left transition-colors"
      type="button"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm truncate text-slate-200">{roll.rollName}</span>
        <span
          className={`text-lg font-bold font-mono ${
            roll.isCriticalSuccess
              ? 'text-yellow-400'
              : roll.isCriticalFailure
                ? 'text-red-400'
                : roll.isSuccess === true
                  ? 'text-green-400'
                  : roll.isSuccess === false
                    ? 'text-slate-400'
                    : 'text-slate-200'
          }`}
        >
          {roll.total}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{roll.characterName}</span>
        <div className="flex items-center gap-2">
          {roll.isCriticalSuccess && <span className="text-yellow-400">NAT 20</span>}
          {roll.isCriticalFailure && <span className="text-red-400">NAT 1</span>}
          <span>{timeAgo}</span>
        </div>
      </div>
    </button>
  )
}

function getTimeAgo(date: Date | string): string {
  const base = new Date(date).getTime()
  const seconds = Math.floor((Date.now() - base) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
