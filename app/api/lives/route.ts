import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const lives = await prisma.life.findMany({
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

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Deactivate current active life
    await prisma.life.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    })

    const life = await prisma.life.create({
      data: {
        ...body,
        isActive: true,
      },
    })

    return NextResponse.json(life, { status: 201 })
  } catch (error) {
    console.error('Error creating life:', error)
    return NextResponse.json(
      { error: 'Failed to create life' },
      { status: 500 }
    )
  }
}
