'use client'

import { useState } from 'react'
import type { HydratedActiveState } from '@/lib/types/5etools'
import ShortRestModal from './ShortRestModal'
import LongRestModal from './LongRestModal'

interface RestButtonsProps {
  characterSlug: string
  activeState: HydratedActiveState
  maxHp: number
  conModifier: number
  onRestComplete: () => void
}

export default function RestButtons({
  characterSlug,
  activeState,
  maxHp,
  conModifier,
  onRestComplete,
}: RestButtonsProps) {
  const [showShortRest, setShowShortRest] = useState(false)
  const [showLongRest, setShowLongRest] = useState(false)

  return (
    <div className="flex gap-3 flex-wrap">
      <button
        onClick={() => setShowShortRest(true)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium flex items-center gap-2"
      >
        <span>☕</span>
        Short Rest
      </button>

      <button
        onClick={() => setShowLongRest(true)}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium flex items-center gap-2"
      >
        <span>🌙</span>
        Long Rest
      </button>

      {showShortRest && (
        <ShortRestModal
          characterSlug={characterSlug}
          hitDice={activeState.hitDice}
          currentHp={activeState.currentHp}
          maxHp={maxHp}
          conModifier={conModifier}
          onClose={() => setShowShortRest(false)}
          onComplete={() => {
            setShowShortRest(false)
            onRestComplete()
          }}
        />
      )}

      {showLongRest && (
        <LongRestModal
          characterSlug={characterSlug}
          maxHp={maxHp}
          onClose={() => setShowLongRest(false)}
          onComplete={() => {
            setShowLongRest(false)
            onRestComplete()
          }}
        />
      )}
    </div>
  )
}
