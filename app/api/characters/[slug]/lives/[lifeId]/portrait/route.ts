import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generatePortrait } from '@/lib/portraitGenerator'

export async function POST(
  _request: Request,
  { params }: { params: { slug: string; lifeId: string } }
) {
  try {
    const character = await prisma.character.findUnique({
      where: { slug: params.slug },
    })

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    const life = await prisma.life.findFirst({
      where: { id: parseInt(params.lifeId), characterId: character.id },
    })

    if (!life) {
      return NextResponse.json({ error: 'Life not found' }, { status: 404 })
    }

    const portrait = await generatePortrait(life.race, life.class, life.subclass)

    if (!portrait) {
      return NextResponse.json({ error: 'Portrait generation failed' }, { status: 500 })
    }

    const updated = await prisma.life.update({
      where: { id: life.id },
      data: { portrait },
    })

    return NextResponse.json({ portrait: updated.portrait })
  } catch (error) {
    console.error('Portrait generation error:', error)
    return NextResponse.json({ error: 'Failed to generate portrait' }, { status: 500 })
  }
}
