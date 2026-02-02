'use client'

import { useLayout } from '@/lib/layout/LayoutContext'
import type { LayoutConfig } from '@/lib/layout/types'
import { Zap, BookOpen, Minimize2 } from 'lucide-react'

const PRESETS: Record<string, { name: string; icon: typeof Zap; layout: Partial<LayoutConfig> }> = {
  combat: {
    name: 'Combat Mode',
    icon: Zap,
    layout: {
      'hit-points': { column: 0, order: 0, visible: true, collapsed: false },
      'combat-stats': { column: 0, order: 1, visible: true, collapsed: false },
      resources: { column: 0, order: 2, visible: true, collapsed: false },
      conditions: { column: 0, order: 3, visible: true, collapsed: false },
      'story-tabs': { column: 1, order: 0, visible: true, collapsed: false },
      'ability-scores': { column: 1, order: 1, visible: true, collapsed: false },
      'saving-throws': { column: 1, order: 2, visible: true, collapsed: false },
      'death-saves': { column: 2, order: 0, visible: true, collapsed: false },
      exhaustion: { column: 2, order: 1, visible: true, collapsed: false },
      concentration: { column: 2, order: 2, visible: true, collapsed: false },
      chronicle: { column: 2, order: 10, visible: false, collapsed: false },
      quirks: { column: 2, order: 11, visible: false, collapsed: false },
      skills: { column: 2, order: 12, visible: true, collapsed: true },
    },
  },
  roleplay: {
    name: 'Roleplay Mode',
    icon: BookOpen,
    layout: {
      chronicle: { column: 0, order: 0, visible: true, collapsed: false },
      quirks: { column: 0, order: 1, visible: true, collapsed: false },
      skills: { column: 0, order: 2, visible: true, collapsed: false },
      'info-tabs': { column: 1, order: 0, visible: true, collapsed: false },
      'story-tabs': { column: 1, order: 1, visible: true, collapsed: false },
      'ability-scores': { column: 2, order: 0, visible: true, collapsed: false },
      resources: { column: 2, order: 1, visible: true, collapsed: true },
      conditions: { column: 2, order: 2, visible: true, collapsed: true },
    },
  },
  compact: {
    name: 'Compact',
    icon: Minimize2,
    layout: {
      skills: { column: 0, order: 0, visible: true, collapsed: true },
      'saving-throws': { column: 0, order: 1, visible: true, collapsed: true },
      resources: { column: 0, order: 2, visible: true, collapsed: true },
      'combat-stats': { column: 1, order: 0, visible: true, collapsed: false },
      'hit-points': { column: 1, order: 1, visible: true, collapsed: false },
      'ability-scores': { column: 1, order: 2, visible: true, collapsed: false },
      'story-tabs': { column: 2, order: 0, visible: true, collapsed: false },
      chronicle: { column: 2, order: 1, visible: false, collapsed: false },
      quirks: { column: 2, order: 2, visible: false, collapsed: false },
      'info-tabs': { column: 1, order: 3, visible: true, collapsed: true },
    },
  },
}

export default function LayoutPresets() {
  const { setLayout, isEditMode } = useLayout()

  if (!isEditMode) return null

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey]
    setLayout((prev) => ({ ...prev, ...preset.layout } as LayoutConfig))
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <span className="text-sm text-slate-400 self-center">Presets:</span>
      {Object.entries(PRESETS).map(([key, preset]) => {
        const Icon = preset.icon
        return (
          <button
            key={key}
            onClick={() => applyPreset(key)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded"
          >
            <Icon className="w-4 h-4" />
            {preset.name}
          </button>
        )
      })}
    </div>
  )
}
