export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { regeneristGuard } from '@/lib/regeneristAccess'
import { prisma } from '@/lib/prisma'
import { InputError, integer, scores, validateIdentity, textValue } from '@/lib/lifeUpdates'
import { calculateMaxHp } from '@/lib/calculations'
import { selectSkillProficiencies } from '@/lib/proficiencyEngine'
import { applyASIs } from '@/lib/asiCalculator'

// GET all characters with their current life
export async function GET() {
  const denied = await regeneristGuard()
  if (denied) return denied
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
      },
      orderBy: { createdAt: 'desc' },
    })

    // Transform to include currentLife and totalLives
    const result = characters.map((char) => ({
      ...char,
      currentLife: char.lives[0] || null,
      totalLives: char._count.lives,
      lives: undefined,
      _count: undefined,
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
  const denied = await regeneristGuard()
  if (denied) return denied
  try {
    const body = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Expected an object')
    const { name, level = 1, isRegenerist = true } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    integer(level, 1, 20, 'Level')
    if (typeof isRegenerist !== 'boolean') throw new InputError('Invalid character type')
    // Generate slug from name
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    if (!slug) throw new InputError('Name must contain at least one letter or number')
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

    let initialLife
    if (!isRegenerist) {
      const { race = 'Human (Standard)', className = 'Fighter', subclass = 'Champion', story = '' } = body
      validateIdentity(race, className, subclass)
      const baseStats = scores(body.stats || { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 })
      const finalStats = applyASIs(baseStats, className, level)
      const maxHp = calculateMaxHp(className, level, Math.floor((finalStats.con - 10) / 2), { race, subclass })
      initialLife = { lifeNumber: 1, name: name.trim(), race, class: className, subclass, level,
        stats: { ...finalStats }, baseStats: { ...baseStats }, currentHp: maxHp, maxHp,
        effect: '', story: textValue(story, 'story'), skillProficiencies: selectSkillProficiencies(className), isActive: true }
    }
    // Nested creation is atomic: a failed life cannot leave an empty static character.
    const character = await prisma.character.create({ data: {
      name: name.trim(), slug, level, isRegenerist,
      ...(initialLife ? { lives: { create: initialLife } } : {}),
    } })

    return NextResponse.json(character, { status: 201 })
  } catch (error) {
    if (error instanceof InputError || error instanceof SyntaxError) return NextResponse.json({ error: error.message }, { status: 400 })
    console.error('Error creating character:', error)
    return NextResponse.json(
      { error: 'Failed to create character' },
      { status: 500 }
    )
  }
}
