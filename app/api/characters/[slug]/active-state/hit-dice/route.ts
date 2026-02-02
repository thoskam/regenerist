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

// PUT - Spend or recover hit dice
// Body: { dieType: string (e.g. 'd8'), action: 'spend' | 'recover', amount?: number }
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in to update hit dice' }, { status: 401 })
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
    const dieType = typeof body.dieType === 'string' ? body.dieType.trim().toLowerCase() : ''
    const action = body.action === 'spend' ? 'spend' : body.action === 'recover' ? 'recover' : null
    const amount = typeof body.amount === 'number' ? Math.max(0, body.amount) : 1

    if (!dieType || !/^d\d+$/.test(dieType) || !action) {
      return NextResponse.json(
        { error: 'Invalid body: dieType (e.g. "d8") and action ("spend" | "recover") required' },
        { status: 400 }
      )
    }

    const hitDice = (life.activeState.hitDice as Record<string, { used: number; max: number }>) || {}
    const entry = hitDice[dieType]
    if (!entry) {
      return NextResponse.json({ error: `No hit dice of type ${dieType}` }, { status: 400 })
    }

    const max = entry.max ?? 0
    let newUsed = entry.used ?? 0
    if (action === 'spend') {
      newUsed = Math.min(max, newUsed + amount)
    } else {
      newUsed = Math.max(0, newUsed - amount)
    }

    const updatedHitDice = { ...hitDice, [dieType]: { used: newUsed, max } }
    const updated = await prisma.activeState.update({
      where: { lifeId: life.id },
      data: { hitDice: updatedHitDice as object },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating hit dice:', error)
    return NextResponse.json({ error: 'Failed to update hit dice' }, { status: 500 })
  }
}
