'use client'

import { useState } from 'react'

interface VisibilitySelectorProps {
  value: string
  onChange: (visibility: string) => void
  disabled?: boolean
}

const visibilityOptions = [
  { value: 'private', label: 'Private', icon: '🔒', description: 'Only you can see' },
  { value: 'campaign', label: 'Campaign', icon: '👥', description: 'Visible to campaign members' },
  { value: 'public', label: 'Public', icon: '🌐', description: 'Anyone can see' },
]

export default function VisibilitySelector({
  value,
  onChange,
  disabled = false,
}: VisibilitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const current = visibilityOptions.find((opt) => opt.value === value) || visibilityOptions[0]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
          disabled
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
        }`}
      >
        <span>{current.icon}</span>
        <span>{current.label}</span>
        {!disabled && (
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-20">
            {visibilityOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  opt.value === value ? 'bg-slate-700/50' : ''
                }`}
              >
                <span>{opt.icon}</span>
                <div>
                  <p className="text-sm text-white">{opt.label}</p>
                  <p className="text-xs text-slate-500">{opt.description}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
