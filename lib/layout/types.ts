export type ModuleId =
  | 'skills'
  | 'saving-throws'
  | 'resources'
  | 'combat-stats'
  | 'proficiency'
  | 'hit-points'
  | 'ability-scores'
  | 'info-tabs'
  | 'story-tabs'
  | 'spellbook'
  | 'chronicle'
  | 'quirks'
  | 'temp-hp'
  | 'conditions'
  | 'exhaustion'
  | 'death-saves'
  | 'concentration'
  | 'languages'
  | 'senses'
  | 'inventory'

export interface ModulePosition {
  column: 0 | 1 | 2
  order: number
  visible: boolean
  collapsed: boolean
}

export interface LayoutConfig {
  [moduleId: string]: ModulePosition
}

export interface ModuleDefinition {
  id: ModuleId
  name: string
  description: string
  defaultColumn: 0 | 1 | 2
  defaultOrder: number
  canCollapse: boolean
  canHide: boolean
  canDismiss?: boolean
  defaultVisible?: boolean
  minHeight?: number
  conditionalRender?: 'always' | 'caster-only' | 'at-zero-hp' | 'when-concentrating'
}
