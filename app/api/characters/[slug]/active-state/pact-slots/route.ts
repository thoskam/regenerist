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

// PUT - Update pact slot usage
// Body: { action: 'use' | 'recover' | 'reset', amount?: number }
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in to update pact slots' }, { status: 401 })
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
    const action =
      body.action === 'use' || body.action === 'recover' || body.action === 'reset'
        ? body.action
        : null
    const amount = typeof body.amount === 'number' ? Math.max(0, body.amount) : 1

    if (!action) {
      return NextResponse.json(
        { error: 'Invalid body: action ("use" | "recover" | "reset") required' },
        { status: 400 }
      )
    }

    const { pactSlotsUsed, pactSlotsMax, pactSlotLevel } = life.activeState
    let newUsed = pactSlotsUsed

    if (action === 'use') {
      newUsed = Math.min(pactSlotsMax, pactSlotsUsed + amount)
    }

    if (action === 'recover') {
      newUsed = Math.max(0, pactSlotsUsed - amount)
    }

    if (action === 'reset') {
      newUsed = 0
    }

    const updated = await prisma.activeState.update({
      where: { lifeId: life.id },
      data: { pactSlotsUsed: newUsed },
    })

    return NextResponse.json({
      success: true,
      pactSlotsUsed: updated.pactSlotsUsed,
      pactSlotsMax,
      pactSlotLevel,
    })
  } catch (error) {
    console.error('Error updating pact slots:', error)
    return NextResponse.json({ error: 'Failed to update pact slots' }, { status: 500 })
  }
}
