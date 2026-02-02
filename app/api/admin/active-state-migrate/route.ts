import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'
import { initializeActiveState } from '@/lib/activeState'
import type { Stats } from '@/lib/types'

/**
 * POST /api/admin/active-state-migrate
 * Creates ActiveState for all active lives that don't have one.
 * One-time migration for Phase 2.
 */
export async function POST() {
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const livesWithoutState = await prisma.life.findMany({
      where: {
        isActive: true,
        activeState: null,
      },
      orderBy: { id: 'asc' },
    })

    if (livesWithoutState.length === 0) {
      return NextResponse.json({
        message: 'No active lives without ActiveState',
        migrated: 0,
      })
    }

    let migrated = 0
    for (const life of livesWithoutState) {
      const stats = life.stats as unknown as Stats
      await initializeActiveState({
        lifeId: life.id,
        className: life.class,
        subclass: life.subclass,
        level: life.level,
        maxHp: life.maxHp,
        stats,
      })
      migrated++
    }

    return NextResponse.json({
      message: `Initialized ActiveState for ${migrated} life/lives`,
      migrated,
    })
  } catch (error) {
    console.error('Active state migration error:', error)
    return NextResponse.json(
      { error: 'Failed to run migration' },
      { status: 500 }
    )
  }
}
