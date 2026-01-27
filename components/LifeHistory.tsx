'use client'

import { Life } from '@/lib/types'

interface LifeHistoryProps {
  lives: Life[]
  currentLifeId: number | null
  onSelectLife: (life: Life) => void
  onClearHistory: () => void
}

export default function LifeHistory({ lives, currentLifeId, onSelectLife, onClearHistory }: LifeHistoryProps) {
  if (lives.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h3 className="text-xs text-slate-400 font-semibold tracking-wider mb-4">PAST LIVES</h3>
        <p className="text-slate-500 text-sm italic">No past lives recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs text-slate-400 font-semibold tracking-wider">PAST LIVES</h3>
        <button
          onClick={onClearHistory}
          className="text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          Clear All
        </button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {lives.map((life) => (
          <button
            key={life.id}
            onClick={() => onSelectLife(life)}
            className={`
              w-full text-left p-3 rounded-lg transition-colors
              ${life.id === currentLifeId
                ? 'bg-gold-500/20 border border-gold-500/50'
                : 'bg-slate-700/50 hover:bg-slate-700 border border-transparent'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Life #{life.lifeNumber}</span>
              {life.isActive && (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </div>
            <p className="text-white font-medium">{life.name}</p>
            <p className="text-sm text-slate-400">
              {life.race} {life.class}
            </p>
            <p className="text-xs text-slate-500">{life.subclass}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
