'use client'

import { useState } from 'react'
import { useRoll20 } from '@/hooks/useRoll20'

interface RollButtonProps {
  formula: string        // e.g. "1d20+3"
  label: string          // e.g. "STR Check"
  children?: React.ReactNode
  className?: string
  size?: 'sm' | 'md'
}

export default function RollButton({ formula, label, children, className = '', size = 'sm' }: RollButtonProps) {
  const { status, sendRoll } = useRoll20()
  const [flash, setFlash] = useState(false)

  if (!status.available) return null  // Extension not installed — hide button

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const sent = sendRoll({ formula, label })
    if (sent) {
      setFlash(true)
      setTimeout(() => setFlash(false), 600)
    }
  }

  const sizeClass = size === 'sm'
    ? 'px-1.5 py-0.5 text-xs'
    : 'px-2 py-1 text-sm'

  const baseClass = `inline-flex items-center gap-1 rounded font-medium transition-all cursor-pointer select-none ${sizeClass}`
  const colorClass = flash
    ? 'bg-green-600 text-white'
    : status.connected
    ? 'bg-amber-700/60 hover:bg-amber-600/80 text-amber-200'
    : 'bg-slate-700/60 text-slate-500 cursor-not-allowed'

  return (
    <button
      onClick={handleClick}
      disabled={!status.connected}
      title={status.connected ? `Roll ${formula} to Roll20` : 'Roll20 not connected'}
      className={`${baseClass} ${colorClass} ${className}`}
    >
      🎲 {children ?? formula}
    </button>
  )
}
