// ============================================
// GLOBAL MODIFIER ENGINE TYPES
// ============================================

export type ModifierType =
  | 'ac'
  | 'attack'
  | 'damage'
  | 'saving-throw'
  | 'ability-check'
  | 'skill'
  | 'spell-attack'
  | 'spell-dc'
  | 'initiative'
  | 'speed'
  | 'hp-max'
  | 'hp-per-level'

export type ModifierSource =
  | 'base'
  | 'ability'
  | 'proficiency'
  | 'equipment'
  | 'attunement'
  | 'class-feature'
  | 'race-trait'
  | 'feat'
  | 'condition'
  | 'spell'
  | 'override'
  | 'misc'

export interface Modifier {
  id: string
  type: ModifierType
  source: ModifierSource
  sourceName: string
  value: number
  target?: string
  stackGroup?: string
  conditional?: boolean
  conditionDesc?: string
}

export interface ModifierCollection {
  ac: Modifier[]
  attack: Modifier[]
  damage: Modifier[]
  savingThrow: Modifier[]
  abilityCheck: Modifier[]
  skill: Modifier[]
  spellAttack: Modifier[]
  spellDc: Modifier[]
  initiative: Modifier[]
  speed: Modifier[]
  hpMax: Modifier[]
}

export interface CalculatedStats {
  ac: {
    total: number
    base: number
    breakdown: Modifier[]
  }
  attackBonus: {
    melee: number
    ranged: number
    breakdown: Modifier[]
  }
  damageBonus: {
    melee: number
    ranged: number
    breakdown: Modifier[]
  }
  savingThrows: {
    [key: string]: {
      total: number
      breakdown: Modifier[]
    }
  }
  skills: {
    [key: string]: {
      total: number
      breakdown: Modifier[]
    }
  }
  passives: {
    perception: number
    investigation: number
    insight: number
  }
  spellAttack: number
  spellSaveDC: number
  initiative: number
  speed: number
  maxHP: number
  proficiencyBonus: number
}
