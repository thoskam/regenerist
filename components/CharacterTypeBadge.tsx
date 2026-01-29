'use client'

interface CharacterTypeBadgeProps {
  isRegenerist: boolean
}

export default function CharacterTypeBadge({ isRegenerist }: CharacterTypeBadgeProps) {
  if (isRegenerist) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 bg-amber-900/50 border border-amber-700 rounded text-xs font-semibold text-amber-300">
        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
        [REG]
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-xs font-semibold text-slate-300">
      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
      [STD]
    </div>
  )
}
