'use client'

import type { HydratedActiveState } from '@/lib/types/5etools'

interface RestTrackerProps {
  activeState: HydratedActiveState
}

export default function RestTracker({ activeState }: RestTrackerProps) {
  return (
    <div className="text-sm text-slate-400 flex gap-2">
      <span>Short Rests: {activeState.shortRestsTaken}</span>
      <span className="text-slate-600">|</span>
      <span>Long Rests: {activeState.longRestsTaken}</span>
    </div>
  )
}
