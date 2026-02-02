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
    const successes = Math.max(0, Math.min(3, Number(body.successes) || 0))
    const failures = Math.max(0, Math.min(3, Number(body.failures) || 0))

    const life = character.lives[0]

    await prisma.activeState.update({
      where: { lifeId: life.id },
      data: {
        deathSaveSuccesses: successes,
        deathSaveFailures: failures,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Death saves update error:', error)
    return NextResponse.json({ error: 'Failed to update death saves' }, { status: 500 })
  }
}
