'use client'

interface LevelSelectorProps {
  level: number
  onChange: (level: number) => void
}

export default function LevelSelector({ level, onChange }: LevelSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-slate-400 font-semibold tracking-wider">LEVEL</label>
      <select
        value={level}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="bg-slate-800 border border-slate-700 text-white text-xl font-bold rounded-lg px-3 py-2 focus:ring-2 focus:ring-gold-500 focus:border-transparent"
      >
        {Array.from({ length: 20 }, (_, i) => i + 1).map((lvl) => (
          <option key={lvl} value={lvl}>
            {lvl}
          </option>
        ))}
      </select>
    </div>
  )
}
