import { v4 as uuidv4 } from 'uuid'
import type {
  DieType,
  DiceRoll,
  RollResult,
  RollRequest,
  AdvantageState,
  ModifierSource,
} from './types'

export function rollDie(die: DieType): number {
  const max = parseInt(die.replace('d', ''), 10)
  return Math.floor(Math.random() * max) + 1
}

export function rollDice(die: DieType, count: number): DiceRoll {
  const results: number[] = []
  for (let i = 0; i < count; i += 1) {
    results.push(rollDie(die))
  }
  return {
    die,
    count,
    results,
    total: results.reduce((sum, r) => sum + r, 0),
  }
}

export function rollD20WithAdvantage(
  advantageState: AdvantageState
): { result: number; rolls: number[] } {
  if (advantageState === 'normal') {
    const roll = rollDie('d20')
    return { result: roll, rolls: [roll] }
  }

  const roll1 = rollDie('d20')
  const roll2 = rollDie('d20')
  const rolls = [roll1, roll2]

  if (advantageState === 'advantage') {
    return { result: Math.max(roll1, roll2), rolls }
  }

  return { result: Math.min(roll1, roll2), rolls }
}

export function isCritical(naturalRoll: number, critRange: number = 20): boolean {
  return naturalRoll >= critRange
}

export function isCriticalFailure(naturalRoll: number): boolean {
  return naturalRoll === 1
}

export function parseDiceString(diceString: string): {
  dice: { die: DieType; count: number }[]
  modifier: number
} {
  const dice: { die: DieType; count: number }[] = []
  let modifier = 0

  const dicePattern = /(\d+)d(\d+)/gi
  const modPattern = /([+-]\d+)(?!d)/g

  let match: RegExpExecArray | null
  while ((match = dicePattern.exec(diceString)) !== null) {
    const count = parseInt(match[1], 10)
    const dieType = `d${match[2]}` as DieType
    dice.push({ die: dieType, count })
  }

  while ((match = modPattern.exec(diceString)) !== null) {
    modifier += parseInt(match[1], 10)
  }

  return { dice, modifier }
}

export function performRoll(request: RollRequest): RollResult {
  const {
    rollType,
    rollName,
    dice: diceConfig,
    modifier,
    modifierBreakdown = [],
    advantageState = 'normal',
    characterId,
    characterName,
    targetDC,
    critRange = 20,
  } = request

  const diceResults: DiceRoll[] = []
  let naturalRoll = 0
  let advantageRolls: number[] | undefined

  const isD20Roll = diceConfig.some((dieConfig) => dieConfig.die === 'd20')

  if (isD20Roll) {
    const d20Result = rollD20WithAdvantage(advantageState)
    naturalRoll = d20Result.result
    advantageRolls = d20Result.rolls.length > 1 ? d20Result.rolls : undefined

    diceResults.push({
      die: 'd20',
      count: 1,
      results: [naturalRoll],
      total: naturalRoll,
    })

    for (const dieConfig of diceConfig.filter((die) => die.die !== 'd20')) {
      diceResults.push(rollDice(dieConfig.die, dieConfig.count))
    }
  } else {
    for (const dieConfig of diceConfig) {
      diceResults.push(rollDice(dieConfig.die, dieConfig.count))
    }

    naturalRoll = diceResults[0]?.results[0] ?? 0
  }

  const diceTotal = diceResults.reduce((sum, dieRoll) => sum + dieRoll.total, 0)
  const total = diceTotal + modifier

  const isCriticalSuccess = isD20Roll && isCritical(naturalRoll, critRange)
  const didCriticallyFail = isD20Roll && isCriticalFailure(naturalRoll)

  let isSuccess: boolean | undefined
  if (targetDC !== undefined) {
    isSuccess = total >= targetDC
  }

  return {
    id: uuidv4(),
    timestamp: new Date(),
    rollType,
    rollName,
    dice: diceResults,
    modifier,
    modifierBreakdown,
    advantageState,
    advantageRolls,
    naturalRoll,
    total,
    isCriticalSuccess,
    isCriticalFailure: didCriticallyFail,
    characterId,
    characterName,
    targetDC,
    isSuccess,
  }
}

export function rollSkillCheck(
  skillName: string,
  modifier: number,
  modifierBreakdown: ModifierSource[],
  advantageState: AdvantageState,
  characterId: string,
  characterName: string,
  targetDC?: number
): RollResult {
  return performRoll({
    rollType: 'skill-check',
    rollName: `${skillName} Check`,
    dice: [{ die: 'd20', count: 1 }],
    modifier,
    modifierBreakdown,
    advantageState,
    characterId,
    characterName,
    targetDC,
  })
}

export function rollSavingThrow(
  saveName: string,
  modifier: number,
  modifierBreakdown: ModifierSource[],
  advantageState: AdvantageState,
  characterId: string,
  characterName: string,
  targetDC?: number
): RollResult {
  return performRoll({
    rollType: 'saving-throw',
    rollName: `${saveName} Save`,
    dice: [{ die: 'd20', count: 1 }],
    modifier,
    modifierBreakdown,
    advantageState,
    characterId,
    characterName,
    targetDC,
  })
}

export function rollAbilityCheck(
  abilityName: string,
  modifier: number,
  advantageState: AdvantageState,
  characterId: string,
  characterName: string
): RollResult {
  return performRoll({
    rollType: 'ability-check',
    rollName: `${abilityName} Check`,
    dice: [{ die: 'd20', count: 1 }],
    modifier,
    modifierBreakdown: [{ source: abilityName, value: modifier }],
    advantageState,
    characterId,
    characterName,
  })
}

export function rollAttack(
  weaponName: string,
  attackBonus: number,
  modifierBreakdown: ModifierSource[],
  advantageState: AdvantageState,
  characterId: string,
  characterName: string,
  critRange: number = 20,
  targetAC?: number
): RollResult {
  return performRoll({
    rollType: 'attack',
    rollName: `${weaponName} Attack`,
    dice: [{ die: 'd20', count: 1 }],
    modifier: attackBonus,
    modifierBreakdown,
    advantageState,
    characterId,
    characterName,
    critRange,
    targetDC: targetAC,
  })
}

export function rollDamage(
  sourceName: string,
  damageDice: { die: DieType; count: number }[],
  damageModifier: number,
  characterId: string,
  characterName: string,
  isCritical: boolean = false
): RollResult {
  const actualDice = isCritical
    ? damageDice.map((die) => ({ ...die, count: die.count * 2 }))
    : damageDice

  return performRoll({
    rollType: 'damage',
    rollName: `${sourceName} Damage${isCritical ? ' (CRIT!)' : ''}`,
    dice: actualDice,
    modifier: damageModifier,
    characterId,
    characterName,
  })
}

export function rollInitiative(
  dexModifier: number,
  bonuses: number,
  characterId: string,
  characterName: string
): RollResult {
  const totalMod = dexModifier + bonuses
  return performRoll({
    rollType: 'initiative',
    rollName: 'Initiative',
    dice: [{ die: 'd20', count: 1 }],
    modifier: totalMod,
    modifierBreakdown: [
      { source: 'Dexterity', value: dexModifier },
      ...(bonuses !== 0 ? [{ source: 'Bonuses', value: bonuses }] : []),
    ],
    advantageState: 'normal',
    characterId,
    characterName,
  })
}

export function rollDeathSave(
  characterId: string,
  characterName: string,
  modifier: number = 0
): RollResult {
  return performRoll({
    rollType: 'death-save',
    rollName: 'Death Saving Throw',
    dice: [{ die: 'd20', count: 1 }],
    modifier,
    characterId,
    characterName,
    targetDC: 10,
  })
}

export function rollHitDice(
  hitDie: DieType,
  count: number,
  conModifier: number,
  characterId: string,
  characterName: string
): RollResult {
  return performRoll({
    rollType: 'hit-dice',
    rollName: `Hit Dice (${count}${hitDie})`,
    dice: [{ die: hitDie, count }],
    modifier: conModifier * count,
    modifierBreakdown: [{ source: 'Constitution', value: conModifier * count }],
    characterId,
    characterName,
  })
}
