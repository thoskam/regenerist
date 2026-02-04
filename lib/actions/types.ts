export type ActionTiming = 'action' | 'bonus' | 'reaction' | 'free' | 'movement' | 'special'

export interface CharacterAction {
  id: string
  name: string
  timing: ActionTiming
  source: 'weapon' | 'spell' | 'class' | 'race' | 'feat' | 'item' | 'standard'
  sourceName: string // "Longsword", "Fighter", "Elf", etc.
  isStandard?: boolean

  // For attacks
  isAttack?: boolean
  attackBonus?: number
  attackBreakdown?: ModifierSource[]
  damage?: string // "1d8+4 slashing"
  damageType?: string
  range?: string // "5 ft" or "30/120 ft"
  properties?: string[] // ["finesse", "versatile (1d10)"]
  damageBreakdown?: ModifierSource[]

  // For spells
  isSpell?: boolean
  spellLevel?: number
  isCantrip?: boolean
  requiresConcentration?: boolean
  spellSchool?: string
  saveDC?: number

  // For limited use abilities
  isLimited?: boolean
  featureKey?: string // Links to ActiveState.limitedFeatures
  usesRemaining?: number
  maxUses?: number
  recharge?: 'short' | 'long' | 'dawn'

  // Description
  description: string
  shortDescription?: string // One-liner for compact view

  // Rollable mechanics (calculated by mechanicsEnhancer)
  mechanicsKey?: string    // Key to look up in featureMechanics
  damageDice?: string      // "3d6", "1d10+5", "2×1d10"
  healingDice?: string     // "1d10+5" for healing features
  saveAbility?: string     // "CON", "DEX", "WIS" - what target saves with
  scalingNote?: string     // "Increases by 1d6 every 2 levels"
}
