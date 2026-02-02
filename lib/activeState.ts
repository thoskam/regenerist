import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { calculateSpellSlots, calculatePactMagic } from './spellSlots'
import { getHitDie } from './calculations'
import { getStatModifier } from './statMapper'
import { calculateLimitedFeatures } from './limitedFeatures'
import type { Stats } from './types'

export interface InitActiveStateParams {
  lifeId: number
  className: string
  subclass?: string
  level: number
  maxHp: number
  stats: Stats
}

/**
 * Initialize or fully reset ActiveState for a life (e.g. on creation or regeneration).
 */
export async function initializeActiveState(params: InitActiveStateParams) {
  const { lifeId, className, subclass = '', level, maxHp, stats } = params
  const conModifier = getStatModifier(stats.con)
  const wisModifier = getStatModifier(stats.wis)
  const chaModifier = getStatModifier(stats.cha)

  const spellSlots = calculateSpellSlots(className, subclass, level)
  const pactMagic = calculatePactMagic(className, level)

  const hitDieNum = getHitDie(className)
  const hitDieKey = `d${hitDieNum}`
  const hitDice = { [hitDieKey]: { used: 0, max: level } }

  const limitedFeatures = calculateLimitedFeatures(
    className,
    subclass || undefined,
    level,
    conModifier,
    wisModifier,
    chaModifier
  )

  // Prisma upsert: create or update by lifeId (we use a unique constraint on lifeId)
  const existing = await prisma.activeState.findUnique({
    where: { lifeId },
  })

  const data: Prisma.ActiveStateUpdateInput = {
    currentHp: maxHp,
    tempHp: 0,
    spellSlots: spellSlots as unknown as Prisma.InputJsonValue,
    pactSlotsUsed: 0,
    pactSlotsMax: pactMagic.slots,
    pactSlotLevel: pactMagic.level,
    hitDice: hitDice as unknown as Prisma.InputJsonValue,
    limitedFeatures: limitedFeatures as unknown as Prisma.InputJsonValue,
    deathSaveSuccesses: 0,
    deathSaveFailures: 0,
    conditions: [] as unknown as Prisma.InputJsonValue,
    exhaustionLevel: 0,
    concentratingOn: null,
    shortRestsTaken: 0,
    longRestsTaken: 0,
  }

  if (existing) {
    return prisma.activeState.update({
      where: { lifeId },
      data,
    })
  }

  return prisma.activeState.create({
    data: {
      lifeId,
      ...data,
    } as Prisma.ActiveStateCreateInput,
  })
}
