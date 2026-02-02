'use client'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useState } from 'react'
import { useLayout } from '@/lib/layout/LayoutContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { ModuleId } from '@/lib/layout/types'
import DroppableColumn from './DroppableColumn'

interface LayoutGridProps {
  renderModule: (moduleId: ModuleId) => React.ReactNode
}

export default function LayoutGrid({ renderModule }: LayoutGridProps) {
  const { layout, isEditMode, moveModule } = useLayout()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
  const [activeId, setActiveId] = useState<ModuleId | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as ModuleId)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeModuleId = active.id as ModuleId
    const overId = over.id as string

    let targetColumn: number
    let targetOrder: number

    if (overId.startsWith('column-')) {
      targetColumn = parseInt(overId.replace('column-', ''), 10)
      targetOrder = 0
    } else {
      const overModuleId = overId as ModuleId
      targetColumn = layout[overModuleId].column
      targetOrder = layout[overModuleId].order
    }

    if (
      layout[activeModuleId].column !== targetColumn ||
      layout[activeModuleId].order !== targetOrder
    ) {
      moveModule(activeModuleId, targetColumn, targetOrder)
    }
  }

  const getResponsiveColumn = (moduleId: ModuleId): number => {
    const savedColumn = layout[moduleId]?.column ?? 0
    if (isMobile) return 0
    if (isTablet) return savedColumn === 0 ? 0 : 1
    return savedColumn
  }

  const getSortedModules = () =>
    Object.entries(layout)
      .filter(([, pos]) => pos.visible)
      .sort((a, b) => {
        if (isMobile) {
          const colA = a[1].column
          const colB = b[1].column
          if (colA !== colB) return colA - colB
          return a[1].order - b[1].order
        }
        return a[1].order - b[1].order
      })
      .map(([id]) => id as ModuleId)

  const getModulesForColumn = (columnIndex: 0 | 1 | 2) =>
    getSortedModules().filter((id) => getResponsiveColumn(id) === columnIndex)

  if (isMobile) {
    return <div className="flex flex-col gap-3">{getSortedModules().map((id) => renderModule(id))}</div>
  }

  if (!isEditMode) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-3 flex flex-col gap-4">
          {getModulesForColumn(0).map((id) => renderModule(id))}
        </div>
        {isTablet ? (
          <div className="lg:col-span-9 flex flex-col gap-4">
            {getModulesForColumn(1).map((id) => renderModule(id))}
          </div>
        ) : (
          <>
            <div className="lg:col-span-5 flex flex-col gap-4">
              {getModulesForColumn(1).map((id) => renderModule(id))}
            </div>
            <div className="lg:col-span-4 flex flex-col gap-4">
              {getModulesForColumn(2).map((id) => renderModule(id))}
            </div>
          </>
        )}
      </div>
    )
  }

  if (isTablet) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-2 gap-4 edit-mode">
          <DroppableColumn columnIndex={0}>
            {getModulesForColumn(0).map((id) => renderModule(id))}
          </DroppableColumn>
          <DroppableColumn columnIndex={1}>
            {getModulesForColumn(1).map((id) => renderModule(id))}
          </DroppableColumn>
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="opacity-80 shadow-2xl sortable-item drag-overlay">
              {renderModule(activeId)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 edit-mode">
        <DroppableColumn columnIndex={0}>
          {getModulesForColumn(0).map((id) => renderModule(id))}
        </DroppableColumn>
        <DroppableColumn columnIndex={1}>
          {getModulesForColumn(1).map((id) => renderModule(id))}
        </DroppableColumn>
        <DroppableColumn columnIndex={2}>
          {getModulesForColumn(2).map((id) => renderModule(id))}
        </DroppableColumn>
      </div>

      <DragOverlay>
        {activeId ? (
          <div className="opacity-80 shadow-2xl sortable-item drag-overlay">{renderModule(activeId)}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
