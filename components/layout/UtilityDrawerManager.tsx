'use client'

import { useState } from 'react'
import { useLayout } from '@/lib/layout/LayoutContext'
import type { CharacterData } from '@/components/modules/ModuleRenderer'
import UtilityBar from '@/components/layout/UtilityBar'
import UtilityDrawer from '@/components/layout/UtilityDrawer'

interface UtilityDrawerManagerProps {
  characterData: CharacterData | null
}

export default function UtilityDrawerManager({ characterData }: UtilityDrawerManagerProps) {
  const { sidebarItems } = useLayout()
  const [activeModule, setActiveModule] = useState<typeof sidebarItems[number] | null>(null)

  if (!characterData || sidebarItems.length === 0) return null

  return (
    <>
      <UtilityBar items={sidebarItems} activeModule={activeModule} onSelect={setActiveModule} />
      <UtilityDrawer
        moduleId={activeModule}
        isOpen={Boolean(activeModule)}
        onClose={() => setActiveModule(null)}
        characterData={characterData}
      />
    </>
  )
}
