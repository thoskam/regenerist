import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'
import { initializeActiveState } from '@/lib/activeState'
import type { Stats } from '@/lib/types'

async function getActiveLifeForSlug(slug: string) {
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
  if (!character) return null
  const life = character.lives[0]
  return life ? { character, life } : null
}

function canEdit(character: { userId: string | null }, userId?: string) {
  return !!userId && character.userId === userId
}

// GET - Get current active state for the character's active life
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const session = await getSession()

  try {
    const result = await getActiveLifeForSlug(slug)
    if (!result) {
      return NextResponse.json({ error: 'Character or active life not found' }, { status: 404 })
    }

    const { character, life } = result
    // View permission: public or owner/campaign (reuse character route logic - simplified: if we can load character we can view)
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

    if (!life.activeState) {
      return NextResponse.json({ activeState: null, lifeId: life.id })
    }
    return NextResponse.json(life.activeState)
  } catch (error) {
    console.error('Error fetching active state:', error)
    return NextResponse.json({ error: 'Failed to fetch active state' }, { status: 500 })
  }
}

// PUT - Partial update of active state (merge with existing)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in to update active state' }, { status: 401 })
  }

  try {
    const result = await getActiveLifeForSlug(slug)
    if (!result) {
      return NextResponse.json({ error: 'Character or active life not found' }, { status: 404 })
    }
    const { character, life } = result
    if (!canEdit(character, session.user.id)) {
      return NextResponse.json({ error: 'You do not have permission to edit this character' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    if (!life.activeState) {
      return NextResponse.json({ error: 'Active state not initialized. Use POST to initialize.' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (typeof body.currentHp === 'number') updateData.currentHp = body.currentHp
    if (typeof body.tempHp === 'number') updateData.tempHp = Math.max(0, body.tempHp)
    if (typeof body.deathSaveSuccesses === 'number') updateData.deathSaveSuccesses = Math.max(0, Math.min(3, body.deathSaveSuccesses))
    if (typeof body.deathSaveFailures === 'number') updateData.deathSaveFailures = Math.max(0, Math.min(3, body.deathSaveFailures))
    if (typeof body.exhaustionLevel === 'number') updateData.exhaustionLevel = Math.max(0, Math.min(6, body.exhaustionLevel))
    if (body.concentratingOn !== undefined) updateData.concentratingOn = body.concentratingOn === null || typeof body.concentratingOn === 'string' ? body.concentratingOn : null
    if (Array.isArray(body.conditions)) updateData.conditions = body.conditions

    if (body.spellSlots && typeof body.spellSlots === 'object') {
      const existing = (life.activeState.spellSlots as Record<string, { used?: number; max?: number }>) || {}
      const merged: Record<string, { used: number; max: number }> = {}
      for (const [k, v] of Object.entries(body.spellSlots)) {
        const prev = existing[k]
        merged[k] = {
          used: typeof (v as { used?: number }).used === 'number' ? (v as { used: number }).used : (prev?.used ?? 0),
          max: typeof (v as { max?: number }).max === 'number' ? (v as { max: number }).max : (prev?.max ?? 0),
        }
      }
      Object.keys(existing).forEach((k) => {
        if (!(k in merged)) merged[k] = { used: existing[k]?.used ?? 0, max: existing[k]?.max ?? 0 }
      })
      updateData.spellSlots = merged
    }
    if (typeof body.pactSlotsUsed === 'number') updateData.pactSlotsUsed = Math.max(0, body.pactSlotsUsed)
    if (typeof body.pactSlotsMax === 'number') updateData.pactSlotsMax = body.pactSlotsMax
    if (typeof body.pactSlotLevel === 'number') updateData.pactSlotLevel = body.pactSlotLevel

    if (body.hitDice && typeof body.hitDice === 'object') {
      const existing = (life.activeState.hitDice as Record<string, { used?: number; max?: number }>) || {}
      const merged = { ...existing }
      for (const [k, v] of Object.entries(body.hitDice)) {
        const val = v as { used?: number; max?: number }
        merged[k] = {
          used: typeof val.used === 'number' ? val.used : (merged[k]?.used ?? 0),
          max: typeof val.max === 'number' ? val.max : (merged[k]?.max ?? 0),
        }
      }
      updateData.hitDice = merged
    }
    if (body.limitedFeatures && typeof body.limitedFeatures === 'object') {
      const existing = (life.activeState.limitedFeatures as Record<string, { used?: number; max?: number; name?: string; recharge?: string }>) || {}
      const merged = { ...existing }
      for (const [k, v] of Object.entries(body.limitedFeatures)) {
        const val = v as { used?: number; max?: number; name?: string; recharge?: string }
        if (merged[k]) {
          merged[k] = { ...merged[k], used: typeof val.used === 'number' ? val.used : merged[k].used ?? 0, max: typeof val.max === 'number' ? val.max : merged[k].max ?? 0 }
        } else {
          merged[k] = { name: val.name ?? k, max: val.max ?? 0, used: val.used ?? 0, recharge: (val.recharge as 'short' | 'long' | 'dawn') ?? 'long' }
        }
      }
      updateData.limitedFeatures = merged
    }

    const updated = await prisma.activeState.update({
      where: { lifeId: life.id },
      data: updateData as { [key: string]: unknown },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating active state:', error)
    return NextResponse.json({ error: 'Failed to update active state' }, { status: 500 })
  }
}

// POST - Initialize or fully reset active state
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in to initialize active state' }, { status: 401 })
  }

  try {
    const result = await getActiveLifeForSlug(slug)
    if (!result) {
      return NextResponse.json({ error: 'Character or active life not found' }, { status: 404 })
    }
    const { character, life } = result
    if (!canEdit(character, session.user.id)) {
      return NextResponse.json({ error: 'You do not have permission to edit this character' }, { status: 403 })
    }

    const stats = life.stats as unknown as Stats
    const activeState = await initializeActiveState({
      lifeId: life.id,
      className: life.class,
      subclass: life.subclass,
      level: life.level,
      maxHp: life.maxHp,
      stats,
    })
    return NextResponse.json(activeState)
  } catch (error) {
    console.error('Error initializing active state:', error)
    return NextResponse.json({ error: 'Failed to initialize active state' }, { status: 500 })
  }
}
