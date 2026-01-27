import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all quirks
export async function GET() {
  try {
    const quirks = await prisma.quirk.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(quirks)
  } catch (error) {
    console.error('Error fetching quirks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quirks' },
      { status: 500 }
    )
  }
}

// POST create a new quirk
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, isActive = true } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    const quirk = await prisma.quirk.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        isActive: Boolean(isActive),
      },
    })

    return NextResponse.json(quirk, { status: 201 })
  } catch (error) {
    console.error('Error creating quirk:', error)
    return NextResponse.json(
      { error: 'Failed to create quirk' },
      { status: 500 }
    )
  }
}
