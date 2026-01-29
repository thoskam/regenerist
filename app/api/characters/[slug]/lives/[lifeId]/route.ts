import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { applyASIs } from '@/lib/asiCalculator'
import { calculateMaxHp, getHitDie } from '@/lib/calculations'
import { getStatModifier, Stats } from '@/lib/statMapper'

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
    const { race, class: className, level, stats: newStats } = body

    // If stats were manually provided, validate and apply ASIs
    let finalStats = newStats
    if (newStats && className && level) {
      // Apply ASIs based on level and class
      finalStats = applyASIs(newStats as Stats, className, level)
    }

    // If level is being changed and we have class info, recalculate HP
    let updateData = { ...body }
    if (level !== undefined && className) {
      const conMod = finalStats ? getStatModifier((finalStats as Stats).con) : 0
      const newMaxHp = calculateMaxHp(className, level, conMod)
      updateData.maxHp = newMaxHp
      // Ensure current HP doesn't exceed new max
      if (updateData.currentHp && updateData.currentHp > newMaxHp) {
        updateData.currentHp = newMaxHp
      }
    }

    // Apply final stats if we calculated them
    if (finalStats && newStats) {
      updateData.stats = finalStats
    }

    const life = await prisma.life.update({
      where: {
        id: lifeId,
        characterId: character.id,
      },
      data: updateData,
    })

    return NextResponse.json(life)
  } catch (error) {
    console.error('Error updating life:', error)
    return NextResponse.json(
      { error: 'Failed to update life' },
      { status: 500 }
    )
  }
}
