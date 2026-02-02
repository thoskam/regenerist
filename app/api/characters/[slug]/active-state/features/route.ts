import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'

async function getActiveLifeForSlug(slug: string) {
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
  if (!character) return null
  const life = character.lives[0]
  return life ? { character, life } : null
}

function canEdit(character: { userId: string | null }, userId?: string) {
  return !!userId && character.userId === userId
}

type FeatureEntry = { name?: string; max: number; used: number; recharge?: string }

// PUT - Update specific feature usage
// Body: { featureKey: string, action: 'use' | 'recover', amount?: number }
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'You must be signed in to update features' }, { status: 401 })
  }

  try {
    const result = await getActiveLifeForSlug(slug)
    if (!result) {
      return NextResponse.json({ error: 'Character or active life not found' }, { status: 404 })
    }
    const { character, life } = result
    if (!canEdit(character, session.user.id)) {
      return NextResponse.json({ error: 'You do not have permission to edit this character' }, { status: 403 })
    }
    if (!life.activeState) {
      return NextResponse.json({ error: 'Active state not initialized' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const featureKey = typeof body.featureKey === 'string' ? body.featureKey.trim() : ''
    const action = body.action === 'use' ? 'use' : body.action === 'recover' ? 'recover' : null
    const amount = typeof body.amount === 'number' ? Math.max(0, body.amount) : 1

    if (!featureKey || !action) {
      return NextResponse.json(
        { error: 'Invalid body: featureKey and action ("use" | "recover") required' },
        { status: 400 }
      )
    }

    const limitedFeatures = (life.activeState.limitedFeatures as Record<string, FeatureEntry>) || {}
    const feature = limitedFeatures[featureKey]
    if (!feature) {
      return NextResponse.json({ error: `Unknown feature: ${featureKey}` }, { status: 400 })
    }

    const max = feature.max ?? 0
    let newUsed = feature.used ?? 0
    if (action === 'use') {
      newUsed = Math.min(max, newUsed + amount)
    } else {
      newUsed = Math.max(0, newUsed - amount)
    }

    const updatedFeatures = {
      ...limitedFeatures,
      [featureKey]: { ...feature, used: newUsed, max },
    }
    const updated = await prisma.activeState.update({
      where: { lifeId: life.id },
      data: { limitedFeatures: updatedFeatures as object },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating features:', error)
    return NextResponse.json({ error: 'Failed to update features' }, { status: 500 })
  }
}
