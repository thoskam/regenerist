'use client'

import { useState, useRef, useEffect } from 'react'

interface SkillInfo {
  name: string
  ability: string
  description: string
}

interface SkillTooltipProps {
  skillName: string
  children: React.ReactNode
  className?: string
}

// Module-level cache for skill data
const skillCache = new Map<string, SkillInfo>()

export default function SkillTooltip({ skillName, children, className = '' }: SkillTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [skillInfo, setSkillInfo] = useState<SkillInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [position, setPosition] = useState<'above' | 'below'>('below')
  const tooltipRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (isOpen && !skillInfo && !isLoading) {
      // Check cache first
      const cached = skillCache.get(skillName)
      if (cached) {
        setSkillInfo(cached)
        return
      }

      setIsLoading(true)
      fetch(`/api/skills/${encodeURIComponent(skillName)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.name) {
            skillCache.set(skillName, data)
            setSkillInfo(data)
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false))
    }
  }, [isOpen, skillInfo, skillName, isLoading])

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      // Show above if not enough space below and more space above
      setPosition(spaceBelow < 200 && spaceAbove > spaceBelow ? 'above' : 'below')
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <span className={`relative inline-block ${className}`} ref={tooltipRef}>
      <span
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer hover:underline hover:decoration-dotted"
      >
        {children}
      </span>

      {isOpen && (
        <div
          className={`absolute z-50 left-0 w-72 p-3 bg-slate-700 border border-slate-600 rounded-lg shadow-xl ${
            position === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {isLoading ? (
            <div className="text-slate-400 text-sm">Loading...</div>
          ) : skillInfo ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gold-400">{skillInfo.name}</h4>
                <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {skillInfo.ability}
                </span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {skillInfo.description}
              </p>
            </>
          ) : (
            <div className="text-slate-400 text-sm">Failed to load skill info</div>
          )}
        </div>
      )}
    </span>
  )
}
