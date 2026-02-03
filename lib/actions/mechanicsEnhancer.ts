import type { CharacterAction } from './types'
import {
  CLASS_FEATURE_MECHANICS,
  RACIAL_FEATURE_MECHANICS,
  FEATURE_NAME_TO_MECHANICS_KEY,
} from './featureMechanics'

interface EnhanceParams {
  className: string
  classLevel: number
  characterLevel: number
  abilityModifiers: Record<string, number>
  proficiencyBonus: number
  raceName?: string
}

/**
 * Enhances a CharacterAction with calculated damage dice, save DCs, and scaling notes
 * based on the character's level and ability modifiers.
 */
export function enhanceActionMechanics(
  action: CharacterAction,
  params: EnhanceParams
): CharacterAction {
  const { classLevel, characterLevel, abilityModifiers, proficiencyBonus } = params

  // Try to find mechanics by explicit mechanicsKey first
  let mechanicsKey = action.mechanicsKey

  // If no explicit key, try to infer from action name
  if (!mechanicsKey) {
    const nameLower = action.name.toLowerCase()
    mechanicsKey = FEATURE_NAME_TO_MECHANICS_KEY[nameLower]
  }

  if (!mechanicsKey) {
    return action
  }

  // Look up mechanics in class features first, then racial features
  const mechanics =
    CLASS_FEATURE_MECHANICS[mechanicsKey] || RACIAL_FEATURE_MECHANICS[mechanicsKey]

  if (!mechanics) {
    return action
  }

  // Build enhanced action
  const enhanced: CharacterAction = { ...action }

  // Calculate damage dice if formula exists
  if (mechanics.damageFormula) {
    enhanced.damageDice = mechanics.damageFormula(classLevel, characterLevel, abilityModifiers)
  }

  // Calculate healing if formula exists
  if (mechanics.healingFormula) {
    enhanced.healingDice = mechanics.healingFormula(classLevel, characterLevel, abilityModifiers)
  }

  // Set damage type if specified
  if (mechanics.damageType) {
    enhanced.damageType = mechanics.damageType
  }

  // Calculate save DC if the feature requires a save
  if (mechanics.saveDC) {
    const abilityMod = abilityModifiers[mechanics.saveDC.ability] ?? 0
    enhanced.saveDC = 8 + proficiencyBonus + abilityMod
  }

  // Set what ability the target saves with
  if (mechanics.saveAbility) {
    enhanced.saveAbility = mechanics.saveAbility.toUpperCase()
  }

  // Add scaling note
  if (mechanics.scalingNote) {
    enhanced.scalingNote = mechanics.scalingNote
  }

  return enhanced
}

/**
 * Enhances all actions in an array with calculated mechanics.
 */
export function enhanceAllActionMechanics(
  actions: CharacterAction[],
  params: EnhanceParams
): CharacterAction[] {
  return actions.map((action) => enhanceActionMechanics(action, params))
}
