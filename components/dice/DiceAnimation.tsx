'use client'

import { useEffect, useState } from 'react'

interface DiceAnimationProps {
  finalValue: number
  dieType: string
  isAnimating: boolean
  isCritical?: boolean
}

export default function DiceAnimation({
  finalValue,
  dieType,
  isAnimating,
  isCritical = false,
}: DiceAnimationProps) {
  const [displayValue, setDisplayValue] = useState(finalValue)

  useEffect(() => {
    if (isAnimating) {
      const maxVal = parseInt(dieType.replace('d', ''), 10)
      let frame = 0
      const totalFrames = 10

      const interval = setInterval(() => {
        if (frame < totalFrames) {
          setDisplayValue(Math.floor(Math.random() * maxVal) + 1)
          frame += 1
        } else {
          setDisplayValue(finalValue)
          clearInterval(interval)
        }
      }, 50)

      return () => clearInterval(interval)
    }

    setDisplayValue(finalValue)
    return undefined
  }, [finalValue, dieType, isAnimating])

  return (
    <div
      className={`w-12 h-12 flex items-center justify-center rounded-lg border-2 font-mono font-bold text-xl transition-all duration-150 ${
        isAnimating ? 'animate-bounce' : ''
      } ${
        isCritical ? 'bg-yellow-500 border-yellow-400 text-yellow-900' : 'bg-slate-700 border-slate-600'
      }`}
    >
      {displayValue}
    </div>
  )
}
