import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'
import { calculateCharacterStats } from '@/lib/modifiers/characterStats'
import { getItem } from '@/lib/items/itemDatabase'
import { calculateSpeed, calculateProficiencyBonus } from '@/lib/calculations'
import { getSpellcastingAbility } from '@/lib/dndApi'
import type { InventoryItem } from '@/lib/items/types'
import type { Stats } from '@/lib/types'

async function canViewCharacter(
  character: { userId: string | null; visibility: string; id: number },
  userId?: string
): Promise<boolean> {
  if (character.visibility === 'public') return true
  if (!userId) return false
  if (character.userId === userId) return true

  if (character.visibility === 'campaign') {
    const sharedCampaign = await prisma.characterCampaign.findFirst({
      where: {
        characterId: character.id,
        campaign: { members: { some: { userId } } },
      },
    })
    return !!sharedCampaign
  }

  return false
}

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
          include: { inventory: true },
          take: 1,
        },
      },
    })

    if (!character || !character.lives[0]) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    const canView = await canViewCharacter(character, session?.user?.id)
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const life = character.lives[0]
    const stats = life.stats as Stats

    const hydratedInventory: InventoryItem[] = await Promise.all(
      life.inventory.map(async (invItem) => {
        let itemData = null
        if (invItem.itemId) {
          itemData = await getItem(invItem.itemId)
        } else if (invItem.customItem) {
          itemData = invItem.customItem as InventoryItem['item']
        }

        return {
          id: invItem.id,
          item: itemData as InventoryItem['item'],
          quantity: invItem.quantity,
          equipped: invItem.equipped,
          attuned: invItem.attuned,
          equipSlot: invItem.equipSlot as InventoryItem['equipSlot'],
          notes: invItem.notes || undefined,
          customName: invItem.customName || undefined,
          charges: invItem.charges || undefined,
          maxCharges: invItem.maxCharges || undefined,
        }
      })
    )

    const spellcastingAbility = await getSpellcastingAbility(life.class, life.subclass)

    const calculated = calculateCharacterStats({
      stats,
      level: life.level,
      className: life.class,
      race: life.race,
      baseSpeed: calculateSpeed(life.race),
      proficiencyBonus: calculateProficiencyBonus(life.level),
      saveProficiencies: life.savingThrowProficiencies || [],
      skillProficiencies: life.skillProficiencies || [],
      skillExpertise: [],
      inventory: hydratedInventory,
      spellcastingAbility: spellcastingAbility as any,
    })

    return NextResponse.json(calculated)
  } catch (error) {
    console.error('Stats calculation error:', error)
    return NextResponse.json({ error: 'Failed to calculate stats' }, { status: 500 })
  }
}
