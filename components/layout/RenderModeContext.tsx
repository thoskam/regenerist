'use client'

import { createContext, useContext } from 'react'

export type RenderMode = 'grid' | 'drawer'

const RenderModeContext = createContext<RenderMode>('grid')

export function useRenderMode() {
  return useContext(RenderModeContext)
}

export function RenderModeProvider({
  mode,
  children,
}: {
  mode: RenderMode
  children: React.ReactNode
}) {
  return <RenderModeContext.Provider value={mode}>{children}</RenderModeContext.Provider>
}
