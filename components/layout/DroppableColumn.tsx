'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useLayout } from '@/lib/layout/LayoutContext'
import type { ModuleId } from '@/lib/layout/types'

interface DroppableColumnProps {
  columnIndex: 0 | 1 | 2
  children: React.ReactNode
}

export default function DroppableColumn({ columnIndex, children }: DroppableColumnProps) {
  const { layout, isEditMode } = useLayout()

  const { setNodeRef, isOver } = useDroppable({
    id: `column-${columnIndex}`,
  })

  const moduleIdsInColumn = Object.entries(layout)
    .filter(([, pos]) => pos.column === columnIndex && pos.visible)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([id]) => id as ModuleId)

  return (
    <div
      ref={setNodeRef}
      className={`droppable-column flex flex-col gap-4 min-h-[200px] ${
        isEditMode && isOver ? 'bg-amber-500/10 rounded-lg drag-over' : ''
      }`}
    >
      <SortableContext items={moduleIdsInColumn} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </div>
  )
}
