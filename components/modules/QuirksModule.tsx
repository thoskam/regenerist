'use client'

import DraggableModule from '@/components/layout/DraggableModule'

interface QuirksModuleProps {
  quirk: string
}

export default function QuirksModule({ quirk }: QuirksModuleProps) {
  return (
    <DraggableModule moduleId="quirks">
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Quirks</h3>
        <p className="text-sm text-slate-400">{quirk || 'No active quirks.'}</p>
      </div>
    </DraggableModule>
  )
}
