export type ActionTiming = 'action' | 'bonus' | 'reaction' | 'free' | 'movement' | 'special'

export interface CharacterAction {
  id: string
  name: string
  timing: ActionTiming
  source: 'weapon' | 'spell' | 'class' | 'race' | 'feat' | 'item' | 'standard'
  sourceName: string // "Longsword", "Fighter", "Elf", etc.

  // For attacks
  isAttack?: boolean
  attackBonus?: number
  damage?: string // "1d8+4 slashing"
  damageType?: string
  range?: string // "5 ft" or "30/120 ft"
  properties?: string[] // ["finesse", "versatile (1d10)"]

  // For spells
  isSpell?: boolean
  spellLevel?: number
  isCantrip?: boolean
  requiresConcentration?: boolean
  spellSchool?: string

  // For limited use abilities
  isLimited?: boolean
  featureKey?: string // Links to ActiveState.limitedFeatures
  usesRemaining?: number
  maxUses?: number
  recharge?: 'short' | 'long' | 'dawn'

  // Description
  description: string
  shortDescription?: string // One-liner for compact view
}
