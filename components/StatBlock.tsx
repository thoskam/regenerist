'use client'

import { getStatModifier } from '@/lib/statMapper'
import { formatModifier } from '@/lib/calculations'

interface StatBlockProps {
  name: string
  value: number
  animate?: boolean
}

const STAT_LABELS: Record<string, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
}

export default function StatBlock({ name, value, animate = false }: StatBlockProps) {
  const modifier = getStatModifier(value)

  return (
    <div className={`flex flex-col items-center bg-slate-800 rounded-lg p-3 border border-slate-700 ${animate ? 'animate-stat-change' : ''}`}>
      <span className="text-xs text-slate-400 font-semibold tracking-wider">
        {STAT_LABELS[name] || name.toUpperCase()}
      </span>
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className="text-sm text-gold-400 font-medium">
        {formatModifier(modifier)}
      </span>
    </div>
  )
}
