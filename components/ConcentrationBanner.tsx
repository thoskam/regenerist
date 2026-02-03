'use client'

interface ConcentrationBannerProps {
  spellName: string
  onBreak: () => void
}

export default function ConcentrationBanner({ spellName, onBreak }: ConcentrationBannerProps) {
  return (
    <div className="bg-purple-900/40 border border-purple-500 rounded-lg px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-purple-200">
        <span className="text-sm">⟳ Concentrating on:</span>
        <span className="font-semibold text-white">{spellName}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-300">
          Taking damage requires a Constitution save (DC 10 or half damage, whichever is higher)
        </span>
        <button
          onClick={onBreak}
          className="whitespace-nowrap text-sm px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded"
          type="button"
        >
          Break Concentration
        </button>
      </div>
    </div>
  )
}
