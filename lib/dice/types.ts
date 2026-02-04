export type DieType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100'

export type RollType =
  | 'ability-check'
  | 'skill-check'
  | 'saving-throw'
  | 'attack'
  | 'damage'
  | 'initiative'
  | 'hit-dice'
  | 'death-save'
  | 'generic'

export type AdvantageState = 'normal' | 'advantage' | 'disadvantage'

export interface DiceRoll {
  die: DieType
  count: number
  results: number[]
  total: number
}

export interface ModifierSource {
  source: string
  value: number
}

export interface RollResult {
  id: string
  timestamp: Date
  rollType: RollType
  rollName: string
  dice: DiceRoll[]
  modifier: number
  modifierBreakdown: ModifierSource[]
  advantageState: AdvantageState
  advantageRolls?: number[]
  naturalRoll: number
  total: number
  isCriticalSuccess: boolean
  isCriticalFailure: boolean
  characterId: string
  characterName: string
  targetDC?: number
  isSuccess?: boolean
  damageDice?: string
  damageType?: string
  damageBreakdown?: ModifierSource[]
}

export interface RollRequest {
  rollType: RollType
  rollName: string
  dice: { die: DieType; count: number }[]
  modifier: number
  modifierBreakdown?: ModifierSource[]
  advantageState?: AdvantageState
  characterId: string
  characterName: string
  targetDC?: number
  critRange?: number
}
