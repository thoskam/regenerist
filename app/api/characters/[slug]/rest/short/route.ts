import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'
import { performShortRest } from '@/lib/rest'
import { getStatModifier } from '@/lib/statMapper'

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
    const body = await request.json().catch(() => ({}))

    const stats = life.stats as unknown as { con: number }
    const conModifier = getStatModifier(stats.con)

    const result = await performShortRest({
      lifeId: life.id,
      hitDiceToSpend: body.hitDiceToSpend || [],
      conModifier,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Short rest error:', error)
    return NextResponse.json({ error: 'Failed to take short rest' }, { status: 500 })
  }
}
