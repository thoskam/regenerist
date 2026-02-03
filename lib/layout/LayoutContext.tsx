'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { LayoutConfig, ModuleId } from './types'
import { generateDefaultLayout } from './defaultLayout'

interface LayoutContextType {
  layout: LayoutConfig
  isEditMode: boolean
  setEditMode: (editing: boolean) => void
  setLayout: React.Dispatch<React.SetStateAction<LayoutConfig>>
  moveModule: (moduleId: ModuleId, toColumn: number, toOrder: number) => void
  toggleModuleVisibility: (moduleId: ModuleId) => void
  toggleModuleCollapsed: (moduleId: ModuleId) => void
  resetLayout: () => void
  revertLayout: () => void
  saveLayout: () => Promise<void>
  hasUnsavedChanges: boolean
}

const LayoutContext = createContext<LayoutContextType | null>(null)

export function useLayout() {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayout must be used within LayoutProvider')
  }
  return context
}

interface LayoutProviderProps {
  children: React.ReactNode
  characterSlug: string
  initialLayout?: LayoutConfig
}

export function LayoutProvider({ children, characterSlug, initialLayout }: LayoutProviderProps) {
  const defaultLayout = initialLayout || generateDefaultLayout()
  const [layout, setLayout] = useState<LayoutConfig>(defaultLayout)
  const [savedLayout, setSavedLayout] = useState<LayoutConfig>(defaultLayout)
  const [isEditMode, setEditMode] = useState(false)

  const hasUnsavedChanges = JSON.stringify(layout) !== JSON.stringify(savedLayout)

  const moveModule = useCallback((moduleId: ModuleId, toColumn: number, toOrder: number) => {
    setLayout((prev) => {
      const newLayout = { ...prev }
      newLayout[moduleId] = {
        ...newLayout[moduleId],
        column: toColumn as 0 | 1 | 2,
        order: toOrder,
      }

      const modulesInColumn = Object.entries(newLayout)
        .filter(([id, pos]) => pos.column === toColumn && id !== moduleId)
        .sort((a, b) => a[1].order - b[1].order)

      modulesInColumn.forEach(([id, pos], index) => {
        const newOrder = index >= toOrder ? index + 1 : index
        newLayout[id] = { ...pos, order: newOrder }
      })

      return newLayout
    })
  }, [])

  const toggleModuleVisibility = useCallback((moduleId: ModuleId) => {
    setLayout((prev) => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        visible: !prev[moduleId].visible,
      },
    }))
  }, [])

  const toggleModuleCollapsed = useCallback((moduleId: ModuleId) => {
    setLayout((prev) => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        collapsed: !prev[moduleId].collapsed,
      },
    }))
  }, [])

  const resetLayout = useCallback(() => {
    const freshLayout = generateDefaultLayout()
    setLayout(freshLayout)
  }, [])

  const revertLayout = useCallback(() => {
    setLayout(savedLayout)
  }, [savedLayout])

  const saveLayout = useCallback(async () => {
    const res = await fetch(`/api/characters/${characterSlug}/layout`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layout }),
    })
    if (!res.ok) {
      throw new Error('Failed to save layout')
    }
    setSavedLayout(layout)
  }, [characterSlug, layout])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEditMode) {
        setEditMode(false)
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        setEditMode(!isEditMode)
      }
      if (e.ctrlKey && e.key.toLowerCase() === 's' && isEditMode) {
        e.preventDefault()
        saveLayout()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEditMode, saveLayout])

  return (
    <LayoutContext.Provider
      value={{
        layout,
        isEditMode,
        setEditMode,
        setLayout,
        moveModule,
        toggleModuleVisibility,
        toggleModuleCollapsed,
        resetLayout,
        revertLayout,
        saveLayout,
        hasUnsavedChanges,
      }}
    >
      {children}
    </LayoutContext.Provider>
  )
}
