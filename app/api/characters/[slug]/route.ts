export const dynamic = 'force-dynamic'

import { Prisma } from '@prisma/client'
import { legacyGuard } from '@/lib/legacyGuard'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { InputError, integer, prepareLifeUpdate } from '@/lib/lifeUpdates'

// GET a single character by slug
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const denied = await legacyGuard()
  if (denied) return denied
  const routeParams = await params
  try {
    const character = await prisma.character.findUnique({
      where: { slug: routeParams.slug },
      include: {
        lives: {
          orderBy: { lifeNumber: 'desc' },
        },
      },
    })

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(character)
  } catch (error) {
    console.error('Error fetching character:', error)
    return NextResponse.json(
      { error: 'Failed to fetch character' },
      { status: 500 }
    )
  }
}

// PUT update a character
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const denied = await legacyGuard()
  if (denied) return denied
  const routeParams = await params
  try {
    const body = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Expected an object')
    const { name, level, isRegenerist } = body

    const existingCharacter = await prisma.character.findUnique({
      where: { slug: routeParams.slug },
    })

    if (!existingCharacter) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    const updateData: { name?: string; slug?: string; level?: number; isRegenerist?: boolean } = {}

    if (name && typeof name === 'string' && name.trim().length > 0) {
      updateData.name = name.trim()
      // Generate new slug if name changes
      const newSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      if (newSlug !== routeParams.slug) {
        // Check if new slug is already taken
        const slugExists = await prisma.character.findUnique({
          where: { slug: newSlug },
        })
        if (slugExists) {
          return NextResponse.json(
            { error: 'A character with this name already exists' },
            { status: 400 }
          )
        }
        updateData.slug = newSlug
      }
    }

    if (level !== undefined) updateData.level = integer(level, 1, 20, 'Level')
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) throw new InputError('Name is required')
    if (updateData.slug === '') throw new InputError('Name must contain a letter or number')
    if (isRegenerist !== undefined && typeof isRegenerist !== 'boolean') throw new InputError('Invalid character type')

    if (typeof isRegenerist === 'boolean') {
      updateData.isRegenerist = isRegenerist
    }

    const character = await prisma.$transaction(async tx => {
      const active = await tx.life.findFirst({ where: { characterId: existingCharacter.id, isActive: true } })
      if (isRegenerist === false && !active) throw new InputError('Create an incarnation before switching to a static character')
      if (active && level !== undefined) await tx.life.update({ where: { id: active.id }, data: await prepareLifeUpdate(active, { level }) })
      return tx.character.update({ where: { id: existingCharacter.id }, data: updateData })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    return NextResponse.json(character)
  } catch (error) {
    if (error instanceof InputError || error instanceof SyntaxError) return NextResponse.json({ error: error.message }, { status: 400 })
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code)) return NextResponse.json({ error: 'Character changed or name is already taken. Refresh and try again.' }, { status: 409 })
    console.error('Error updating character:', error)
    return NextResponse.json(
      { error: 'Failed to update character' },
      { status: 500 }
    )
  }
}

// DELETE a character (cascade deletes lives)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const denied = await legacyGuard()
  if (denied) return denied
  const routeParams = await params
  try {
    const character = await prisma.character.findUnique({
      where: { slug: routeParams.slug },
    })

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    await prisma.character.delete({
      where: { slug: routeParams.slug },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting character:', error)
    return NextResponse.json(
      { error: 'Failed to delete character' },
      { status: 500 }
    )
  }
}
