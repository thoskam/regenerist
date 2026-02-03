'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'

interface RollNarrationProps {
  narration: string
  isCritical: boolean
}

export default function RollNarration({ narration, isCritical }: RollNarrationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [displayedText, setDisplayedText] = useState('')

  useEffect(() => {
    if (narration) {
      setIsVisible(true)
      setDisplayedText('')

      let index = 0
      const interval = setInterval(() => {
        if (index < narration.length) {
          setDisplayedText(narration.slice(0, index + 1))
          index += 1
        } else {
          clearInterval(interval)
        }
      }, 30)

      return () => clearInterval(interval)
    }

    setIsVisible(false)
    return undefined
  }, [narration])

  if (!narration || !isVisible) return null

  return (
    <div
      className={`p-4 rounded-lg border italic text-center ${
        isCritical
          ? 'bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border-yellow-600/50'
          : 'bg-slate-800/50 border-slate-700'
      }`}
    >
      {isCritical && <Sparkles className="w-5 h-5 text-yellow-400 mx-auto mb-2" />}
      <p className="text-lg text-slate-200">
        "{displayedText}"
        <span className="animate-pulse">|</span>
      </p>
      <p className="text-xs text-slate-500 mt-2">— The Narrator</p>
    </div>
  )
}
