import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'

// GET all characters with their current life
export async function GET(request: NextRequest) {
  const session = await getSession()
  const searchParams = request.nextUrl.searchParams
  const filter = searchParams.get('filter') || 'mine' // 'mine' or 'public'

  try {
    let whereClause = {}

    if (session?.user?.id) {
      if (filter === 'mine') {
        // Show only user's characters
        whereClause = { userId: session.user.id }
      } else {
        // Show public characters (excluding user's own)
        whereClause = {
          visibility: 'public',
          userId: { not: session.user.id },
        }
      }
    } else {
      // Not logged in - show only public characters
      whereClause = { visibility: 'public' }
    }

    const characters = await prisma.character.findMany({
      where: whereClause,
      include: {
        lives: {
          where: { isActive: true },
          take: 1,
        },
        _count: {
          select: { lives: true },
        },
        user: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Transform to include currentLife and totalLives
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
    console.error('Error fetching characters:', error)
    return NextResponse.json(
      { error: 'Failed to fetch characters' },
      { status: 500 }
    )
  }
}

// POST create a new character
export async function POST(request: Request) {
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'You must be signed in to create a character' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { name, level = 1, isRegenerist = true } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Check if slug already exists
    const existing = await prisma.character.findUnique({
      where: { slug },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A character with this name already exists' },
        { status: 400 }
      )
    }

    const character = await prisma.character.create({
      data: {
        name: name.trim(),
        slug,
        level: Math.max(1, Math.min(20, level)),
        isRegenerist: typeof isRegenerist === 'boolean' ? isRegenerist : true,
        userId: session.user.id,
        visibility: 'private',
      },
    })

    // For static characters, create an initial life record
    if (!isRegenerist) {
      // Extract initial life data from body if provided
      const { race = 'Human (Standard)', className = 'Fighter', subclass = 'Champion', stats, story = '' } = body

      await prisma.life.create({
        data: {
          characterId: character.id,
          lifeNumber: 1,
          name: name.trim(),
          race,
          class: className,
          subclass,
          level: Math.max(1, Math.min(20, level)),
          stats: stats || {
            str: 15,
            dex: 14,
            con: 13,
            int: 12,
            wis: 10,
            cha: 8,
          },
          currentHp: 10,
          maxHp: 10,
          effect: '',
          story,
          isActive: true,
        },
      })
    }

    return NextResponse.json(character, { status: 201 })
  } catch (error) {
    console.error('Error creating character:', error)
    return NextResponse.json(
      { error: 'Failed to create character' },
      { status: 500 }
    )
  }
}
