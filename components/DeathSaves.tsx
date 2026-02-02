'use client'

interface DeathSavesProps {
  successes: number
  failures: number
  currentHp: number
  onUpdate: (successes: number, failures: number) => void
}

export default function DeathSaves({ successes, failures, currentHp, onUpdate }: DeathSavesProps) {
  if (currentHp > 0) return null

  const isStabilized = successes >= 3
  const isDead = failures >= 3

  return (
    <div
      className={`border rounded-lg p-4 ${
        isDead
          ? 'bg-red-900/30 border-red-600'
          : isStabilized
            ? 'bg-green-900/30 border-green-600'
            : 'bg-slate-800 border-amber-600'
      }`}
    >
      <h3 className="font-bold mb-3 flex items-center gap-2">
        💀 Death Saving Throws
        {isDead && <span className="text-red-400">(DEAD)</span>}
        {isStabilized && <span className="text-green-400">(Stabilized)</span>}
      </h3>

      <div className="flex gap-8">
        <div>
          <span className="text-sm text-slate-400 block mb-2">Successes</span>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <button
                key={`success-${i}`}
                onClick={() => !isStabilized && !isDead && onUpdate(successes + 1, failures)}
                disabled={isStabilized || isDead}
                className={`w-8 h-8 rounded-full border-2 ${
                  i < successes ? 'bg-green-500 border-green-400' : 'bg-slate-700 border-slate-500'
                }`}
              />
            ))}
          </div>
        </div>

        <div>
          <span className="text-sm text-slate-400 block mb-2">Failures</span>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <button
                key={`failure-${i}`}
                onClick={() => !isStabilized && !isDead && onUpdate(successes, failures + 1)}
                disabled={isStabilized || isDead}
                className={`w-8 h-8 rounded-full border-2 ${
                  i < failures ? 'bg-red-500 border-red-400' : 'bg-slate-700 border-slate-500'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {(isStabilized || isDead) && (
        <button onClick={() => onUpdate(0, 0)} className="mt-3 text-sm text-slate-400 hover:text-white">
          Reset Death Saves
        </button>
      )}
    </div>
  )
}
