'use client'

import { getStatModifier } from '@/lib/statMapper'
import { formatModifier } from '@/lib/calculations'

interface StatBlockProps {
  name: string
  value: number
  baseValue?: number
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

export default function StatBlock({ name, value, baseValue, animate = false }: StatBlockProps) {
  const modifier = getStatModifier(value)
  const hasBonus = baseValue !== undefined && baseValue !== value
  const bonusAmount = hasBonus ? value - baseValue : 0

  return (
    <div className={`flex flex-col items-center bg-slate-800 rounded-lg p-3 border border-slate-700 ${animate ? 'animate-stat-change' : ''}`}>
      <span className="text-xs text-slate-400 font-semibold tracking-wider">
        {STAT_LABELS[name] || name.toUpperCase()}
      </span>
      {hasBonus && (
        <span className="text-xs text-slate-500">
          {baseValue} <span className="text-green-400">+{bonusAmount}</span>
        </span>
      )}
      <span className={`text-2xl font-bold ${hasBonus ? 'text-green-400' : 'text-white'}`}>{value}</span>
      <span className="text-sm text-gold-400 font-medium">
        {formatModifier(modifier)}
      </span>
    </div>
  )
}
