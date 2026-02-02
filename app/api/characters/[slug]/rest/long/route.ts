import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'
import { performLongRest } from '@/lib/rest'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

    if (character.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const life = character.lives[0]
    const activeState = life.activeState

    const totalHitDice: Record<string, number> = {}
    if (activeState?.hitDice) {
      for (const [dieType, data] of Object.entries(activeState.hitDice as Record<string, { used: number; max: number }>)) {
        totalHitDice[dieType] = data.max
      }
    }

    const result = await performLongRest({
      lifeId: life.id,
      maxHp: life.maxHp,
      totalHitDice,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Long rest error:', error)
    return NextResponse.json({ error: 'Failed to take long rest' }, { status: 500 })
  }
}
