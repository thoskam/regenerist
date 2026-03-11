'use client'

import { useEffect, useState } from 'react'

type Theme = 'dark' | 'papyrus'

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null
    if (saved === 'papyrus') {
      setTheme('papyrus')
      document.documentElement.setAttribute('data-theme', 'papyrus')
    }
  }, [])

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'papyrus' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    if (next === 'papyrus') {
      document.documentElement.setAttribute('data-theme', 'papyrus')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }

  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Switch to Papyrus theme' : 'Switch to Dark theme'}
      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors text-base leading-none"
    >
      {theme === 'dark' ? '📜' : '🌙'}
    </button>
  )
}
