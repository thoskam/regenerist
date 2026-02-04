'use client'

import { useState } from 'react'
import { Shield, ChevronDown } from 'lucide-react'
import type { Modifier } from '@/lib/modifiers/types'

interface ACDisplayProps {
  total: number
  breakdown: Modifier[]
}

export default function ACDisplay({ total, breakdown }: ACDisplayProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="flex flex-col items-center p-4 bg-slate-800 rounded-lg border border-slate-600 hover:border-slate-500 transition-all w-full"
        type="button"
      >
        <span className="text-xs text-slate-400 uppercase tracking-wider">AC</span>
        <div className="flex items-center gap-1">
          <Shield className="w-5 h-5 text-slate-400" />
          <span className="text-3xl font-bold text-white">{total}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 mt-1 transition-transform ${
            showBreakdown ? 'rotate-180' : ''
          }`}
        />
      </button>

      {showBreakdown && (
        <div className="absolute top-full left-0 right-0 mt-1 p-3 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-10">
          <h4 className="text-xs text-slate-400 uppercase mb-2">AC Breakdown</h4>
          <div className="space-y-1">
            {breakdown.map((mod) => (
              <div key={mod.id} className="flex justify-between text-sm">
                <span className="text-slate-400">{mod.sourceName}</span>
                <span className={mod.value >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {mod.value >= 0 ? '+' : ''}{mod.value}
                </span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-bold border-t border-slate-700 pt-1 mt-1">
              <span className="text-slate-200">Total</span>
              <span className="text-slate-200">{total}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
