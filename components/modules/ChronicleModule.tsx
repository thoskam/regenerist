'use client'

import DraggableModule from '@/components/layout/DraggableModule'

interface ChronicleModuleProps {
  chronicle: string
}

export default function ChronicleModule({ chronicle }: ChronicleModuleProps) {
  return (
    <DraggableModule moduleId="chronicle">
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Archivist&apos;s Chronicle</h3>
        <p className="text-sm text-slate-400 whitespace-pre-wrap">{chronicle}</p>
      </div>
    </DraggableModule>
  )
}
