import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'
import { generateDefaultLayout, mergeWithDefaults } from '@/lib/layout/defaultLayout'
import type { LayoutConfig } from '@/lib/layout/types'

async function canViewCharacter(
  character: { userId: string | null; visibility: string; id: number },
  userId?: string
): Promise<boolean> {
  if (character.visibility === 'public') return true
  if (!userId) return false
  if (character.userId === userId) return true

  if (character.visibility === 'campaign') {
    const sharedCampaign = await prisma.characterCampaign.findFirst({
      where: {
        characterId: character.id,
        campaign: { members: { some: { userId } } },
      },
    })
    return !!sharedCampaign
  }

  return false
}

function canEditCharacter(character: { userId: string | null }, userId?: string): boolean {
  if (!userId) return false
  return character.userId === userId
}

// GET - Fetch character's layout
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const session = await getSession()

  try {
    const character = await prisma.character.findUnique({
      where: { slug },
      include: { layout: true },
    })

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    const canView = await canViewCharacter(character, session?.user?.id)
    if (!canView) {
      return NextResponse.json({ error: 'You do not have permission to view this character' }, { status: 403 })
    }

    const layout = character.layout?.layout
      ? mergeWithDefaults(character.layout.layout as unknown as Partial<LayoutConfig>)
      : generateDefaultLayout()

    return NextResponse.json({ layout })
  } catch (error) {
    console.error('Layout fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch layout' }, { status: 500 })
  }
}

// PUT - Save character's layout
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
    })

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    if (!canEditCharacter(character, session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const layout = body.layout ?? {}

    await prisma.characterLayout.upsert({
      where: { characterId: character.id },
      create: {
        characterId: character.id,
        layout: layout as Prisma.InputJsonValue,
      },
      update: {
        layout: layout as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Layout save error:', error)
    return NextResponse.json({ error: 'Failed to save layout' }, { status: 500 })
  }
}

// DELETE - Reset to default layout
export async function DELETE(
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
    })

    if (!character || !canEditCharacter(character, session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.characterLayout.deleteMany({
      where: { characterId: character.id },
    })

    return NextResponse.json({ layout: generateDefaultLayout() })
  } catch (error) {
    console.error('Layout reset error:', error)
    return NextResponse.json({ error: 'Failed to reset layout' }, { status: 500 })
  }
}
