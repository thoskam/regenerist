'use client'

interface ConcentrationTrackerProps {
  spellName: string | null
  onBreak: () => void
}

export default function ConcentrationTracker({ spellName, onBreak }: ConcentrationTrackerProps) {
  if (!spellName) return null

  return (
    <div className="bg-purple-900/30 border border-purple-500 rounded-lg p-3">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-purple-400 text-sm">⟳ Concentrating on:</span>
          <span className="ml-2 font-medium">{spellName}</span>
        </div>
        <button onClick={onBreak} className="text-sm px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded">
          Break Concentration
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-2">
        Taking damage requires a Constitution save (DC 10 or half damage, whichever is higher)
      </p>
    </div>
  )
}
