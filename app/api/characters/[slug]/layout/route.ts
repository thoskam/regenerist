import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'
import { generateDefaultLayout, mergeWithDefaults } from '@/lib/layout/defaultLayout'
import type { LayoutConfig } from '@/lib/layout/types'
import { MODULE_REGISTRY } from '@/lib/layout/moduleRegistry'

function getDefaultSidebarItems() {
  return Object.values(MODULE_REGISTRY)
    .filter((module) => module.defaultVisible === false && module.canDismiss)
    .map((module) => module.id)
}

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

    const rawLayout = character.layout?.layout as unknown
    let layout = generateDefaultLayout()
    let sidebarItems: string[] = []

    if (rawLayout && typeof rawLayout === 'object') {
      const record = rawLayout as { layout?: Partial<LayoutConfig>; sidebarItems?: string[] }
      if (record.layout) {
        layout = mergeWithDefaults(record.layout)
        sidebarItems = Array.isArray(record.sidebarItems) ? record.sidebarItems : []
      } else {
        layout = mergeWithDefaults(rawLayout as Partial<LayoutConfig>)
      }
    }

    if (sidebarItems.length === 0) {
      sidebarItems = getDefaultSidebarItems()
    }

    return NextResponse.json({ layout, sidebarItems })
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
      if (character.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      await prisma.character.update({
        where: { id: character.id },
        data: { userId: session.user.id },
      })
    }

    const body = await request.json().catch(() => ({}))
    const layout = body.layout ?? {}
    const sidebarItems = Array.isArray(body.sidebarItems) ? body.sidebarItems : []

    await prisma.characterLayout.upsert({
      where: { characterId: character.id },
      create: {
        characterId: character.id,
        layout: { layout, sidebarItems } as Prisma.InputJsonValue,
      },
      update: {
        layout: { layout, sidebarItems } as Prisma.InputJsonValue,
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

    return NextResponse.json({
      layout: generateDefaultLayout(),
      sidebarItems: getDefaultSidebarItems(),
    })
  } catch (error) {
    console.error('Layout reset error:', error)
    return NextResponse.json({ error: 'Failed to reset layout' }, { status: 500 })
  }
}
