import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'

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

// PUT - Update specific spell slot usage
// Body: { level: number, action: 'use' | 'recover', amount?: number }
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in to update spell slots' }, { status: 401 })
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
    if (!life.activeState) {
      return NextResponse.json({ error: 'Active state not initialized' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const level = Number(body.level)
    const action = body.action === 'use' ? 'use' : body.action === 'recover' ? 'recover' : null
    const amount = typeof body.amount === 'number' ? Math.max(0, body.amount) : 1

    if (!Number.isInteger(level) || level < 1 || level > 9 || !action) {
      return NextResponse.json(
        { error: 'Invalid body: level (1-9) and action ("use" | "recover") required' },
        { status: 400 }
      )
    }

    const key = String(level)
    const spellSlots = (life.activeState.spellSlots as Record<string, { used: number; max: number }>) || {}
    const slot = spellSlots[key] ?? { used: 0, max: 0 }

    let newUsed = slot.used
    if (action === 'use') {
      newUsed = Math.min(slot.max, slot.used + amount)
    } else {
      newUsed = Math.max(0, slot.used - amount)
    }

    const updatedSlots = { ...spellSlots, [key]: { used: newUsed, max: slot.max } }
    const updated = await prisma.activeState.update({
      where: { lifeId: life.id },
      data: { spellSlots: updatedSlots as object },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating spell slots:', error)
    return NextResponse.json({ error: 'Failed to update spell slots' }, { status: 500 })
  }
}
