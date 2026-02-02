import type { LayoutConfig, ModulePosition } from './types'
import { MODULE_REGISTRY, ALL_MODULE_IDS } from './moduleRegistry'

export function generateDefaultLayout(): LayoutConfig {
  const layout: LayoutConfig = {}

  for (const moduleId of ALL_MODULE_IDS) {
    const definition = MODULE_REGISTRY[moduleId]
    layout[moduleId] = {
      column: definition.defaultColumn,
      order: definition.defaultOrder,
      visible: true,
      collapsed: false,
    }
  }

  return layout
}

export function mergeWithDefaults(savedLayout: Partial<LayoutConfig>): LayoutConfig {
  const defaultLayout = generateDefaultLayout()
  const merged: LayoutConfig = { ...defaultLayout }

  for (const [key, value] of Object.entries(savedLayout)) {
    if (value) {
      merged[key] = value as ModulePosition
    }
  }

  return merged
}
