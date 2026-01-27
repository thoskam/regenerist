import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all lives for a character
export async function GET(
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

    const lives = await prisma.life.findMany({
      where: { characterId: character.id },
      orderBy: { lifeNumber: 'desc' },
    })

    return NextResponse.json(lives)
  } catch (error) {
    console.error('Error fetching lives:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lives' },
      { status: 500 }
    )
  }
}

// DELETE all lives for a character (clear history)
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

    await prisma.life.deleteMany({
      where: { characterId: character.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error clearing lives:', error)
    return NextResponse.json(
      { error: 'Failed to clear lives' },
      { status: 500 }
    )
  }
}
