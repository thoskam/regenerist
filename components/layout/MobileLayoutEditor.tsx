'use client'

import { useLayout } from '@/lib/layout/LayoutContext'
import { MODULE_REGISTRY, ALL_MODULE_IDS } from '@/lib/layout/moduleRegistry'
import { ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react'

export default function MobileLayoutEditor() {
  const { layout, isEditMode, moveModule, toggleModuleVisibility } = useLayout()

  if (!isEditMode) return null

  const sortedModules = ALL_MODULE_IDS
    .map((id) => ({
      id,
      definition: MODULE_REGISTRY[id],
      position: layout[id],
      sortKey: (layout[id]?.column ?? 0) * 100 + (layout[id]?.order ?? 0),
    }))
    .sort((a, b) => a.sortKey - b.sortKey)

  const moveUp = (moduleId: string, currentIndex: number) => {
    if (currentIndex === 0) return
    const prevModule = sortedModules[currentIndex - 1]
    if (!prevModule?.position) return
    moveModule(moduleId as never, prevModule.position.column, prevModule.position.order)
  }

  const moveDown = (moduleId: string, currentIndex: number) => {
    if (currentIndex === sortedModules.length - 1) return
    const nextModule = sortedModules[currentIndex + 1]
    if (!nextModule?.position) return
    moveModule(moduleId as never, nextModule.position.column, nextModule.position.order + 1)
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4 mb-4">
      <h3 className="font-medium text-amber-400 mb-3">Reorder Modules</h3>
      <p className="text-sm text-slate-400 mb-4">Use arrows to reorder. Tap eye to show/hide.</p>

      <div className="space-y-2">
        {sortedModules.map((module, index) => (
          <div
            key={module.id}
            className={`flex items-center justify-between p-3 rounded ${
              module.position?.visible ? 'bg-slate-700' : 'bg-slate-900 opacity-50'
            }`}
          >
            <span className="font-medium">{module.definition.name}</span>

            <div className="flex items-center gap-2">
              {module.definition.canHide && (
                <button
                  onClick={() => toggleModuleVisibility(module.id)}
                  className="p-2 hover:bg-slate-600 rounded"
                >
                  {module.position?.visible ? (
                    <Eye className="w-4 h-4 text-green-400" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-500" />
                  )}
                </button>
              )}

              <button
                onClick={() => moveUp(module.id, index)}
                disabled={index === 0}
                className="p-2 hover:bg-slate-600 rounded disabled:opacity-30"
              >
                <ChevronUp className="w-4 h-4" />
              </button>

              <button
                onClick={() => moveDown(module.id, index)}
                disabled={index === sortedModules.length - 1}
                className="p-2 hover:bg-slate-600 rounded disabled:opacity-30"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
