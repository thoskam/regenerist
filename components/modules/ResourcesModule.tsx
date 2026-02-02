'use client'

import DraggableModule from '@/components/layout/DraggableModule'
import ResourcePanel from '@/components/ResourcePanel'
import type { HydratedActiveState } from '@/lib/types/5etools'

interface ResourcesModuleProps {
  slug: string
  activeState: HydratedActiveState | null
  isWarlock: boolean
  isSpellcaster: boolean
  isOwner: boolean
  onUpdate: () => void
}

export default function ResourcesModule({
  slug,
  activeState,
  isWarlock,
  isSpellcaster,
  isOwner,
  onUpdate,
}: ResourcesModuleProps) {
  return (
    <DraggableModule moduleId="resources">
      <ResourcePanel
        slug={slug}
        activeState={activeState}
        isWarlock={isWarlock}
        isSpellcaster={isSpellcaster}
        onUpdate={onUpdate}
        disabled={!isOwner}
      />
    </DraggableModule>
  )
}
