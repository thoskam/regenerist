'use client'

import { Eye, Search, Brain } from 'lucide-react'

interface PassiveScoresProps {
  perception: number
  investigation: number
  insight: number
}

export default function PassiveScores({ perception, investigation, insight }: PassiveScoresProps) {
  const passives = [
    { label: 'Perception', value: perception, icon: Eye, color: 'text-green-400' },
    { label: 'Investigation', value: investigation, icon: Search, color: 'text-blue-400' },
    { label: 'Insight', value: insight, icon: Brain, color: 'text-purple-400' },
  ]

  return (
    <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
      <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Passive Scores</h3>
      <div className="grid grid-cols-3 gap-2">
        {passives.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="text-center">
            <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
            <div className="text-lg font-bold text-white">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
