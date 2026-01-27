import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    const life = await prisma.life.update({
      where: {
        id: lifeId,
        characterId: character.id,
      },
      data: body,
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
