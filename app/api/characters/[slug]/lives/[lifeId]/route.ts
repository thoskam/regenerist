import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateMaxHp } from '@/lib/calculations'
import { getStatModifier, Stats } from '@/lib/statMapper'
import { initializeActiveState } from '@/lib/activeState'

// PUT update a specific life
export async function PUT(
  request: Request,
  { params }: { params: { slug: string; lifeId: string } }
) {
  try {
    const lifeId = parseInt(params.lifeId)
    if (isNaN(lifeId)) {
      return NextResponse.json(
        { error: 'Invalid life ID' },
        { status: 400 }
      )
    }

    const character = await prisma.character.findUnique({
      where: { slug: params.slug },
    })

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { class: className, level, stats: newStats } = body

    // For static characters, use stats as-is (user controls all stat allocation)
    // No auto-ASI application - user handles this via point buy
    let updateData = { ...body }

    // If level is being changed and we have class info, recalculate HP
    if (level !== undefined && className && newStats) {
      const conMod = getStatModifier((newStats as Stats).con)
      const newMaxHp = calculateMaxHp(className, level, conMod)
      updateData.maxHp = newMaxHp
      // Ensure current HP doesn't exceed new max
      if (updateData.currentHp && updateData.currentHp > newMaxHp) {
        updateData.currentHp = newMaxHp
      }
    }

    const life = await prisma.life.update({
      where: {
        id: lifeId,
        characterId: character.id,
      },
      data: updateData,
    })

    // Re-initialize active state when class/level/stats change so resources match
    if (life.isActive && life.class && life.level != null && life.stats && life.maxHp != null) {
      const stats = life.stats as unknown as Stats
      await initializeActiveState({
        lifeId: life.id,
        className: life.class,
        subclass: life.subclass,
        level: life.level,
        maxHp: life.maxHp,
        stats,
      })
    }

    return NextResponse.json(life)
  } catch (error) {
    console.error('Error updating life:', error)
    return NextResponse.json(
      { error: 'Failed to update life' },
      { status: 500 }
    )
  }
}
