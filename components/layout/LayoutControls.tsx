'use client'

import { useState } from 'react'
import { useLayout } from '@/lib/layout/LayoutContext'
import { MODULE_REGISTRY, ALL_MODULE_IDS } from '@/lib/layout/moduleRegistry'
import { Settings, RotateCcw, Save, Eye, EyeOff } from 'lucide-react'
import LayoutPresets from './LayoutPresets'

export default function LayoutControls() {
  const {
    layout,
    isEditMode,
    setEditMode,
    resetLayout,
    saveLayout,
    hasUnsavedChanges,
    toggleModuleVisibility,
    revertLayout,
  } = useLayout()

  const [showModuleList, setShowModuleList] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    await saveLayout()
    setIsSaving(false)
    setEditMode(false)
  }

  const handleCancel = () => {
    revertLayout()
    setEditMode(false)
  }

  if (!isEditMode) {
    return (
      <button
        onClick={() => setEditMode(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg"
        title="Customize Layout"
      >
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">Edit Layout</span>
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-amber-400 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Editing Layout
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModuleList(!showModuleList)}
            className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded"
          >
            {showModuleList ? 'Hide' : 'Show'} Modules
          </button>
          <button
            onClick={resetLayout}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
            title="Reset to Default"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-400">Drag modules to rearrange. Click module headers to collapse.</p>

      <LayoutPresets />

      {showModuleList && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-800 rounded-lg">
          {ALL_MODULE_IDS.map((moduleId) => {
            const definition = MODULE_REGISTRY[moduleId]
            const isVisible = layout[moduleId]?.visible ?? true

            if (!definition.canHide) return null

            return (
              <button
                key={moduleId}
                onClick={() => toggleModuleVisibility(moduleId)}
                className={`flex items-center gap-2 p-2 rounded text-sm text-left ${
                  isVisible ? 'bg-slate-700' : 'bg-slate-900 text-slate-500'
                }`}
              >
                {isVisible ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4" />}
                {definition.name}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700">
        <button onClick={handleCancel} className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || !hasUnsavedChanges}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded font-medium ${
            hasUnsavedChanges
              ? 'bg-amber-600 hover:bg-amber-500'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Layout'}
        </button>
      </div>
    </div>
  )
}
