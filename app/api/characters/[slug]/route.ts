import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'

// Helper to check if user can view a character
async function canViewCharacter(
  character: { userId: string | null; visibility: string; id: number },
  userId?: string
): Promise<boolean> {
  // Public characters are visible to everyone
  if (character.visibility === 'public') return true

  // Must be logged in to view non-public characters
  if (!userId) return false

  // Owner can always view
  if (character.userId === userId) return true

  // Campaign visibility - check if user shares a campaign
  if (character.visibility === 'campaign') {
    const sharedCampaign = await prisma.characterCampaign.findFirst({
      where: {
        characterId: character.id,
        campaign: {
          members: {
            some: { userId },
          },
        },
      },
    })
    return !!sharedCampaign
  }

  return false
}

// Helper to check if user can edit a character
function canEditCharacter(
  character: { userId: string | null },
  userId?: string
): boolean {
  if (!userId) return false
  return character.userId === userId
}

// GET a single character by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const session = await getSession()

  try {
    const character = await prisma.character.findUnique({
      where: { slug },
      include: {
        lives: {
          orderBy: { lifeNumber: 'desc' },
        },
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    })

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    // Check authorization
    const canView = await canViewCharacter(character, session?.user?.id)
    if (!canView) {
      return NextResponse.json(
        { error: 'You do not have permission to view this character' },
        { status: 403 }
      )
    }

    // Add ownership info
    const isOwner = canEditCharacter(character, session?.user?.id)

    return NextResponse.json({
      ...character,
      owner: character.user,
      isOwner,
      user: undefined,
    })
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
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'You must be signed in to update a character' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { name, level, isRegenerist, visibility } = body

    const existingCharacter = await prisma.character.findUnique({
      where: { slug },
    })

    if (!existingCharacter) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    // Check ownership
    if (!canEditCharacter(existingCharacter, session.user.id)) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this character' },
        { status: 403 }
      )
    }

    const updateData: {
      name?: string
      slug?: string
      level?: number
      isRegenerist?: boolean
      visibility?: string
    } = {}

    if (name && typeof name === 'string' && name.trim().length > 0) {
      updateData.name = name.trim()
      // Generate new slug if name changes
      const newSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      if (newSlug !== slug) {
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

    if (typeof isRegenerist === 'boolean') {
      updateData.isRegenerist = isRegenerist
    }

    if (visibility && ['private', 'campaign', 'public'].includes(visibility)) {
      updateData.visibility = visibility
    }

    const character = await prisma.character.update({
      where: { slug },
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
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'You must be signed in to delete a character' },
      { status: 401 }
    )
  }

  try {
    const character = await prisma.character.findUnique({
      where: { slug },
    })

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    // Check ownership
    if (!canEditCharacter(character, session.user.id)) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this character' },
        { status: 403 }
      )
    }

    await prisma.character.delete({
      where: { slug },
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
