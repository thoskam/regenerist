import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'
import { calculateProficiencyBonus } from '@/lib/calculations'
import { getStatModifier } from '@/lib/statMapper'
import { aggregateActions } from '@/lib/actions/aggregator'
import {
  getHydratedClassInfo,
  getHydratedSubclassInfo,
  getHydratedRaceInfo,
  getCasterType,
} from '@/lib/dndApi'

// GET - Return aggregated actions for the character
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const session = await getSession()

  try {
    const character = await prisma.character.findUnique({
      where: { slug },
      include: {
        lives: {
          where: { isActive: true },
          take: 1,
          include: { activeState: true },
        },
      },
    })

    if (!character || !character.lives[0]) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    // Permission check: public or owner/campaign
    if (character.visibility !== 'public' && (!session?.user?.id || character.userId !== session.user.id)) {
      const sharedCampaign = character.visibility === 'campaign' && session?.user?.id
        ? await prisma.characterCampaign.findFirst({
            where: {
              characterId: character.id,
              campaign: { members: { some: { userId: session.user.id } } },
            },
          })
        : null
      if (!sharedCampaign) {
        return NextResponse.json({ error: 'You do not have permission to view this character' }, { status: 403 })
      }
    }

    const life = character.lives[0]

    const [classInfo, subclassInfo, raceInfo] = await Promise.all([
      getHydratedClassInfo(life.class, life.level),
      getHydratedSubclassInfo(life.class, life.subclass, life.level),
      getHydratedRaceInfo(life.race),
    ])
    const isSpellcaster = getCasterType(life.class, life.subclass) !== null

    const stats = life.stats as unknown as { str: number; dex: number; con: number; int: number; wis: number; cha: number }
    const abilityModifiers = {
      str: getStatModifier(stats.str),
      dex: getStatModifier(stats.dex),
      con: getStatModifier(stats.con),
      int: getStatModifier(stats.int),
      wis: getStatModifier(stats.wis),
      cha: getStatModifier(stats.cha),
    }

    const proficiencyBonus = calculateProficiencyBonus(life.level)

    const actions = aggregateActions({
      life: {
        class: life.class,
        subclass: life.subclass,
        race: life.race,
        level: life.level,
        stats: stats as { str: number; dex: number; con: number; int: number; wis: number; cha: number },
        activeState: life.activeState ? { limitedFeatures: (life.activeState.limitedFeatures as Record<string, { name: string; max: number; used: number; recharge?: string }>) } : null,
      },
      classInfo: classInfo || {
        name: life.class,
        hitDie: 8,
        savingThrows: [],
        armorProficiencies: [],
        weaponProficiencies: [],
        features: [],
      },
      subclassInfo,
      raceInfo,
      isSpellcaster,
      proficiencyBonus,
      abilityModifiers,
    })

    const actionsWithUsage = actions.map((action) => {
      if (action.isLimited && action.featureKey && life.activeState) {
        const features = (life.activeState.limitedFeatures as Record<string, { name: string; max: number; used: number; recharge?: string }>) || {}
        const feature = features[action.featureKey]
        if (feature) {
          return {
            ...action,
            usesRemaining: Math.max(0, feature.max - feature.used),
            maxUses: feature.max,
            recharge: (feature.recharge as 'short' | 'long' | 'dawn') ?? action.recharge,
          }
        }
      }
      return action
    })

    return NextResponse.json({ actions: actionsWithUsage })
  } catch (error) {
    console.error('Error generating actions:', error)
    return NextResponse.json({ error: 'Failed to generate actions' }, { status: 500 })
  }
}
