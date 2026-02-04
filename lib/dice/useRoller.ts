'use client'

import { useCallback } from 'react'
import { useRoll } from './RollContext'
import {
  rollSkillCheck,
  rollSavingThrow,
  rollAbilityCheck,
  rollAttack,
  rollDamage,
  rollInitiative,
  rollDeathSave,
  rollHitDice,
  performRoll,
  parseDiceString,
} from './roller'
import type { AdvantageState, RollResult, DieType, ModifierSource } from './types'

interface UseRollerProps {
  characterId: string
  characterName: string
}

export function useRoller({ characterId, characterName }: UseRollerProps) {
  const { addRoll, globalAdvantage, settings } = useRoll()

  const executeRoll = useCallback(
    (roll: RollResult) => {
      addRoll(roll)
      if (settings.soundEnabled) {
        // playDiceSound(roll)
      }
      return roll
    },
    [addRoll, settings]
  )

  const makeSkillCheck = useCallback(
    (
      skillName: string,
      modifier: number,
      modifierBreakdown: ModifierSource[],
      advantageOverride?: AdvantageState,
      targetDC?: number
    ) => {
      const advantage = advantageOverride ?? globalAdvantage
      const roll = rollSkillCheck(
        skillName,
        modifier,
        modifierBreakdown,
        advantage,
        characterId,
        characterName,
        targetDC
      )
      return executeRoll(roll)
    },
    [characterId, characterName, globalAdvantage, executeRoll]
  )

  const makeSavingThrow = useCallback(
    (
      saveName: string,
      modifier: number,
      modifierBreakdown: ModifierSource[],
      advantageOverride?: AdvantageState,
      targetDC?: number
    ) => {
      const advantage = advantageOverride ?? globalAdvantage
      const roll = rollSavingThrow(
        saveName,
        modifier,
        modifierBreakdown,
        advantage,
        characterId,
        characterName,
        targetDC
      )
      return executeRoll(roll)
    },
    [characterId, characterName, globalAdvantage, executeRoll]
  )

  const makeAbilityCheck = useCallback(
    (abilityName: string, modifier: number, advantageOverride?: AdvantageState) => {
      const advantage = advantageOverride ?? globalAdvantage
      const roll = rollAbilityCheck(abilityName, modifier, advantage, characterId, characterName)
      return executeRoll(roll)
    },
    [characterId, characterName, globalAdvantage, executeRoll]
  )

  const makeAttackRoll = useCallback(
    (
      weaponName: string,
      attackBonus: number,
      modifierBreakdown: ModifierSource[],
      advantageOverride?: AdvantageState,
      critRange?: number,
      targetAC?: number
    ) => {
      const advantage = advantageOverride ?? globalAdvantage
      const roll = rollAttack(
        weaponName,
        attackBonus,
        modifierBreakdown,
        advantage,
        characterId,
        characterName,
        critRange,
        targetAC
      )
      return executeRoll(roll)
    },
    [characterId, characterName, globalAdvantage, executeRoll]
  )

  const makeDamageRoll = useCallback(
    (
      sourceName: string,
      damageDice: { die: DieType; count: number }[],
      damageModifier: number,
      isCritical?: boolean
    ) => {
      const roll = rollDamage(sourceName, damageDice, damageModifier, characterId, characterName, isCritical)
      return executeRoll(roll)
    },
    [characterId, characterName, executeRoll]
  )

  const makeInitiativeRoll = useCallback(
    (dexModifier: number, bonuses: number = 0) => {
      const roll = rollInitiative(dexModifier, bonuses, characterId, characterName)
      return executeRoll(roll)
    },
    [characterId, characterName, executeRoll]
  )

  const makeDeathSave = useCallback(
    (modifier: number = 0) => {
      const roll = rollDeathSave(characterId, characterName, modifier)
      return executeRoll(roll)
    },
    [characterId, characterName, executeRoll]
  )

  const makeHitDiceRoll = useCallback(
    (hitDie: DieType, count: number, conModifier: number) => {
      const roll = rollHitDice(hitDie, count, conModifier, characterId, characterName)
      return executeRoll(roll)
    },
    [characterId, characterName, executeRoll]
  )

  const makeGenericRoll = useCallback(
    (rollName: string, diceString: string) => {
      const { dice, modifier } = parseDiceString(diceString)
      const roll = performRoll({
        rollType: 'generic',
        rollName,
        dice,
        modifier,
        characterId,
        characterName,
      })
      return executeRoll(roll)
    },
    [characterId, characterName, executeRoll]
  )

  /**
   * Roll damage for a class/race feature like Sneak Attack or Breath Weapon.
   * Parses dice strings like "6d6", "2d8", "1d10+5"
   */
  const makeFeatureDamageRoll = useCallback(
    (
      featureName: string,
      damageDice: string,
      damageType?: string,
      modifierBreakdown?: ModifierSource[]
    ) => {
      const { dice, modifier } = parseDiceString(damageDice)
      const rollName = damageType
        ? `${featureName} (${damageType})`
        : featureName
      const roll = performRoll({
        rollType: 'damage',
        rollName,
        dice,
        modifier,
        modifierBreakdown,
        characterId,
        characterName,
      })
      return executeRoll(roll)
    },
    [characterId, characterName, executeRoll]
  )

  /**
   * Roll healing for features like Second Wind or Lay on Hands.
   * Parses dice strings like "1d10+5"
   */
  const makeHealingRoll = useCallback(
    (featureName: string, healingDice: string) => {
      const { dice, modifier } = parseDiceString(healingDice)
      const roll = performRoll({
        rollType: 'generic',
        rollName: `${featureName} (Healing)`,
        dice,
        modifier,
        characterId,
        characterName,
      })
      return executeRoll(roll)
    },
    [characterId, characterName, executeRoll]
  )

  return {
    makeSkillCheck,
    makeSavingThrow,
    makeAbilityCheck,
    makeAttackRoll,
    makeDamageRoll,
    makeInitiativeRoll,
    makeDeathSave,
    makeHitDiceRoll,
    makeGenericRoll,
    makeFeatureDamageRoll,
    makeHealingRoll,
  }
}
