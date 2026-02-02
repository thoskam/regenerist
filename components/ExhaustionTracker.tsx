'use client'

const exhaustionLevels = [
  { level: 1, effect: 'Disadvantage on ability checks' },
  { level: 2, effect: 'Speed halved' },
  { level: 3, effect: 'Disadvantage on attack rolls and saving throws' },
  { level: 4, effect: 'Hit point maximum halved' },
  { level: 5, effect: 'Speed reduced to 0' },
  { level: 6, effect: 'Death' },
]

interface ExhaustionTrackerProps {
  level: number
  onUpdate: (level: number) => void
}

export default function ExhaustionTracker({ level, onUpdate }: ExhaustionTrackerProps) {
  return (
    <div className="border border-slate-600 rounded-lg p-4">
      <h3 className="font-bold mb-3">😴 Exhaustion</h3>

      <div className="flex gap-1 mb-3 flex-wrap">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <button
            key={i}
            onClick={() => onUpdate(i)}
            className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${
              i === 0
                ? level === 0
                  ? 'bg-green-600'
                  : 'bg-slate-700 hover:bg-slate-600'
                : i <= level
                  ? i === 6
                    ? 'bg-red-600'
                    : 'bg-amber-600'
                  : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            {i === 0 ? '✓' : i}
          </button>
        ))}
      </div>

      {level > 0 && (
        <div className="text-sm space-y-1">
          {exhaustionLevels.slice(0, level).map(({ level: lvl, effect }) => (
            <div key={lvl} className={lvl === 6 ? 'text-red-400 font-bold' : 'text-amber-400'}>
              Level {lvl}: {effect}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
