import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'

export async function PUT(
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

    const body = await request.json().catch(() => ({}))
    const tempHp = Math.max(0, Number(body.tempHp) || 0)

    const life = character.lives[0]

    await prisma.activeState.update({
      where: { lifeId: life.id },
      data: {
        tempHp,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Temp HP update error:', error)
    return NextResponse.json({ error: 'Failed to update temp HP' }, { status: 500 })
  }
}
