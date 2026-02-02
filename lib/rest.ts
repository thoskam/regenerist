import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

interface RestResult {
  success: boolean
  changes: {
    hpRestored?: number
    hitDiceSpent?: number
    featuresReset?: string[]
    spellSlotsRestored?: Record<string, number>
    exhaustionReduced?: boolean
  }
}

interface ShortRestParams {
  lifeId: number
  hitDiceToSpend: { dieType: string; count: number }[]
  conModifier: number
}

export async function performShortRest(params: ShortRestParams): Promise<RestResult> {
  const { lifeId, hitDiceToSpend, conModifier } = params

  const activeState = await prisma.activeState.findUnique({
    where: { lifeId },
  })

  if (!activeState) {
    throw new Error('No active state found')
  }

  const changes: RestResult['changes'] = {
    featuresReset: [],
    spellSlotsRestored: {},
  }

  // 1. Spend hit dice and calculate healing
  let totalHealing = 0
  const newHitDice = { ...(activeState.hitDice as Record<string, { used: number; max: number }>) }

  for (const { dieType, count } of hitDiceToSpend) {
    const dieData = newHitDice[dieType]
    if (!dieData) continue

    const available = dieData.max - dieData.used
    const actualSpend = Math.min(count, available)

    if (actualSpend <= 0) continue

    const dieMax = parseInt(dieType.replace('d', ''), 10)
    const avgRoll = Math.floor(dieMax / 2) + 1
    const healing = actualSpend * Math.max(1, avgRoll + conModifier)

    totalHealing += healing
    newHitDice[dieType].used += actualSpend
    changes.hitDiceSpent = (changes.hitDiceSpent || 0) + actualSpend
  }

  // 2. Reset short-rest features
  const newFeatures = { ...(activeState.limitedFeatures as Record<string, { name: string; used: number; recharge?: string }>) }
  for (const [key, feature] of Object.entries(newFeatures)) {
    if (feature.recharge === 'short' && feature.used > 0) {
      newFeatures[key] = { ...feature, used: 0 }
      changes.featuresReset?.push(feature.name)
    }
  }

  // 3. Reset Warlock pact slots
  if (activeState.pactSlotsMax > 0 && activeState.pactSlotsUsed > 0) {
    changes.spellSlotsRestored!.pact = activeState.pactSlotsUsed
  }

  const life = await prisma.life.findUnique({ where: { id: lifeId } })
  const maxHp = life?.maxHp ?? activeState.currentHp + totalHealing
  const newHp = Math.min(activeState.currentHp + totalHealing, maxHp)
  changes.hpRestored = newHp - activeState.currentHp

  await prisma.activeState.update({
    where: { lifeId },
    data: {
      currentHp: newHp,
      hitDice: newHitDice as unknown as Prisma.InputJsonValue,
      limitedFeatures: newFeatures as unknown as Prisma.InputJsonValue,
      pactSlotsUsed: 0,
      shortRestsTaken: activeState.shortRestsTaken + 1,
    },
  })

  await prisma.life.update({
    where: { id: lifeId },
    data: { currentHp: newHp },
  })

  return { success: true, changes }
}

interface LongRestParams {
  lifeId: number
  maxHp: number
  totalHitDice: Record<string, number>
}

export async function performLongRest(params: LongRestParams): Promise<RestResult> {
  const { lifeId, maxHp, totalHitDice } = params

  const activeState = await prisma.activeState.findUnique({
    where: { lifeId },
  })

  if (!activeState) {
    throw new Error('No active state found')
  }

  const changes: RestResult['changes'] = {
    featuresReset: [],
    spellSlotsRestored: {},
  }

  // 1. Restore all HP
  changes.hpRestored = Math.max(0, maxHp - activeState.currentHp)

  // 2. Reset all spell slots
  const newSpellSlots = { ...(activeState.spellSlots as Record<string, { used: number; max: number }>) }
  for (const [level, slots] of Object.entries(newSpellSlots)) {
    if (slots.used > 0) {
      changes.spellSlotsRestored![level] = slots.used
      newSpellSlots[level] = { ...slots, used: 0 }
    }
  }

  if (activeState.pactSlotsUsed > 0) {
    changes.spellSlotsRestored!.pact = activeState.pactSlotsUsed
  }

  // 3. Reset all limited features
  const newFeatures = { ...(activeState.limitedFeatures as Record<string, { name: string; used: number }>) }
  for (const [key, feature] of Object.entries(newFeatures)) {
    if (feature.used > 0) {
      newFeatures[key] = { ...feature, used: 0 }
      changes.featuresReset?.push(feature.name)
    }
  }

  // 4. Recover half of total hit dice (rounded down, minimum 1)
  const newHitDice: Record<string, { used: number; max: number }> = {}
  for (const [dieType, maxCount] of Object.entries(totalHitDice)) {
    const currentData = (activeState.hitDice as Record<string, { used: number; max: number }>)[dieType] || {
      used: maxCount,
      max: maxCount,
    }
    const recoveryAmount = Math.max(1, Math.floor(maxCount / 2))
    const newUsed = Math.max(0, currentData.used - recoveryAmount)
    newHitDice[dieType] = { used: newUsed, max: maxCount }
  }

  // 5. Reduce exhaustion by 1
  const newExhaustion = Math.max(0, activeState.exhaustionLevel - 1)
  changes.exhaustionReduced = newExhaustion < activeState.exhaustionLevel

  await prisma.activeState.update({
    where: { lifeId },
    data: {
      currentHp: maxHp,
      tempHp: 0,
      spellSlots: newSpellSlots as unknown as Prisma.InputJsonValue,
      pactSlotsUsed: 0,
      hitDice: newHitDice as unknown as Prisma.InputJsonValue,
      limitedFeatures: newFeatures as unknown as Prisma.InputJsonValue,
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
      exhaustionLevel: newExhaustion,
      concentratingOn: null,
      conditions: [] as unknown as Prisma.InputJsonValue,
      longRestsTaken: activeState.longRestsTaken + 1,
    },
  })

  await prisma.life.update({
    where: { id: lifeId },
    data: { currentHp: maxHp },
  })

  return { success: true, changes }
}
