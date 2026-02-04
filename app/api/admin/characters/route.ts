import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'

const ADMIN_EMAIL = 'tdkamnikar@gmail.com'

export async function GET() {
  const session = await getSession()
  const email = session?.user?.email?.toLowerCase()

  if (!email || email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const characters = await prisma.character.findMany({
      include: {
        lives: {
          where: { isActive: true },
          take: 1,
        },
        _count: {
          select: { lives: true },
        },
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const result = characters.map((char) => ({
      ...char,
      currentLife: char.lives[0] || null,
      totalLives: char._count.lives,
      owner: char.user,
      lives: undefined,
      _count: undefined,
      user: undefined,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching admin characters:', error)
    return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 })
  }
}
