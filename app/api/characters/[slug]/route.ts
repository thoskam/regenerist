import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET a single character by slug
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const character = await prisma.character.findUnique({
      where: { slug: params.slug },
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
  { params }: { params: { slug: string } }
) {
  try {
    const body = await request.json()
    const { name, level } = body

    const existingCharacter = await prisma.character.findUnique({
      where: { slug: params.slug },
    })

    if (!existingCharacter) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    const updateData: { name?: string; slug?: string; level?: number } = {}

    if (name && typeof name === 'string' && name.trim().length > 0) {
      updateData.name = name.trim()
      // Generate new slug if name changes
      const newSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      if (newSlug !== params.slug) {
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

    if (typeof level === 'number') {
      updateData.level = Math.max(1, Math.min(20, level))
    }

    const character = await prisma.character.update({
      where: { slug: params.slug },
      data: updateData,
    })

    return NextResponse.json(character)
  } catch (error) {
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
  { params }: { params: { slug: string } }
) {
  try {
    const character = await prisma.character.findUnique({
      where: { slug: params.slug },
    })

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    await prisma.character.delete({
      where: { slug: params.slug },
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
