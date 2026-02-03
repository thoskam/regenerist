'use client'

import { Life } from '@/lib/types'

interface LifeHistoryDrawerProps {
  lives: Life[]
  currentLifeId: number | null
  onSelectLife: (life: Life) => void
  onClearHistory: () => void
  isOpen: boolean
  onClose: () => void
}

export default function LifeHistoryDrawer({
  lives,
  currentLifeId,
  onSelectLife,
  onClearHistory,
  isOpen,
  onClose,
}: LifeHistoryDrawerProps) {
  return (
    <>
      {isOpen && (
        <button
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
          aria-label="Close past lives drawer"
          type="button"
        />
      )}
      <aside
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-slate-900 border-l border-slate-700 z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-300">Past Lives</h3>
          <button
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-white"
            type="button"
          >
            Close
          </button>
        </div>

        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-800">
          <span className="text-xs text-slate-500">{lives.length} lives</span>
          <button
            onClick={onClearHistory}
            className="text-xs text-red-400 hover:text-red-300"
            type="button"
          >
            Clear All
          </button>
        </div>

        <div className="p-4 space-y-2 overflow-y-auto h-[calc(100%-104px)]">
          {lives.length === 0 ? (
            <p className="text-slate-500 text-sm italic">No past lives recorded yet.</p>
          ) : (
            lives.map((life) => (
              <button
                key={life.id}
                onClick={() => {
                  onSelectLife(life)
                  onClose()
                }}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  life.id === currentLifeId
                    ? 'bg-gold-500/20 border border-gold-500/50'
                    : 'bg-slate-800/70 hover:bg-slate-800 border border-transparent'
                }`}
                type="button"
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
            ))
          )}
        </div>
      </aside>
    </>
  )
}
