'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useLayout } from '@/lib/layout/LayoutContext'
import type { ModuleId } from '@/lib/layout/types'
import { MODULE_REGISTRY } from '@/lib/layout/moduleRegistry'
import { ChevronUp, ChevronDown, GripVertical } from 'lucide-react'

interface DraggableModuleProps {
  moduleId: ModuleId
  children: React.ReactNode
}

export default function DraggableModule({ moduleId, children }: DraggableModuleProps) {
  const { layout, isEditMode, toggleModuleCollapsed } = useLayout()
  const moduleConfig = layout[moduleId]
  const moduleDefinition = MODULE_REGISTRY[moduleId]

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: moduleId,
    disabled: !isEditMode,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  if (!moduleConfig?.visible) return null

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`draggable-module sortable-item relative rounded-lg border ${
        isEditMode ? 'border-dashed border-amber-500/50 bg-slate-800/50' : 'border-slate-700 bg-slate-800'
      } ${isDragging ? 'z-50 shadow-2xl dragging' : ''}`}
    >
      {isEditMode && (
        <div
          className="flex items-center justify-between px-3 py-2 bg-slate-700/50 rounded-t-lg border-b border-slate-600 cursor-move"
          {...attributes}
          {...listeners}
        >
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-300">{moduleDefinition.name}</span>
          </div>

          <div className="flex items-center gap-1">
            {moduleDefinition.canCollapse && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleModuleCollapsed(moduleId)
                }}
                className="p-1 hover:bg-slate-600 rounded"
                title={moduleConfig.collapsed ? 'Expand' : 'Collapse'}
              >
                {moduleConfig.collapsed ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                )}
              </button>
            )}
          </div>
        </div>
      )}

      <div className={`module-content ${moduleConfig.collapsed && isEditMode ? 'collapsed' : ''}`}>
        {children}
      </div>

      {moduleConfig.collapsed && !isEditMode && (
        <button
          onClick={() => toggleModuleCollapsed(moduleId)}
          className="w-full py-2 text-sm text-slate-400 hover:text-white flex items-center justify-center gap-1"
        >
          <ChevronDown className="w-4 h-4" />
          {moduleDefinition.name}
        </button>
      )}
    </div>
  )
}
