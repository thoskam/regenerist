'use client'

import { X } from 'lucide-react'
import type { ModuleId } from '@/lib/layout/types'
import type { CharacterData } from '@/components/modules/ModuleRenderer'
import ModuleRenderer from '@/components/modules/ModuleRenderer'
import { RenderModeProvider } from '@/components/layout/RenderModeContext'
import { MODULE_REGISTRY } from '@/lib/layout/moduleRegistry'

interface UtilityDrawerProps {
  moduleId: ModuleId | null
  isOpen: boolean
  onClose: () => void
  characterData: CharacterData | null
}

export default function UtilityDrawer({ moduleId, isOpen, onClose, characterData }: UtilityDrawerProps) {
  if (!isOpen || !moduleId || !characterData) return null

  const headerTone = getHeaderTone(moduleId)

  return (
    <>
      <button
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-label="Close utility drawer"
        type="button"
      />
      <aside
        className={`fixed top-0 right-0 h-full w-1/3 max-w-[560px] min-w-[320px] bg-slate-900 border-l border-slate-700 z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className={`flex items-center justify-between px-4 py-3 border-b border-slate-700 ${headerTone}`}>
          <h3 className="text-sm font-semibold text-slate-100">
            {MODULE_REGISTRY[moduleId]?.name || 'Utility Drawer'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white" type="button">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100%-56px)]">
          <RenderModeProvider mode="drawer">
            <ModuleRenderer moduleId={moduleId} characterData={characterData} />
          </RenderModeProvider>
        </div>
      </aside>
    </>
  )
}

function getHeaderTone(moduleId: ModuleId) {
  switch (moduleId) {
    case 'spellbook':
      return 'bg-indigo-900/40'
    case 'conditions':
      return 'bg-red-900/40'
    case 'languages':
      return 'bg-blue-900/40'
    case 'senses':
      return 'bg-teal-900/40'
    case 'skills':
      return 'bg-amber-900/40'
    case 'saving-throws':
      return 'bg-emerald-900/40'
    case 'chronicle':
      return 'bg-indigo-900/40'
    default:
      return 'bg-slate-900/40'
  }
}
