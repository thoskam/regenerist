import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET a single quirk
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid quirk ID' },
        { status: 400 }
      )
    }

    const quirk = await prisma.quirk.findUnique({
      where: { id },
    })

    if (!quirk) {
      return NextResponse.json(
        { error: 'Quirk not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(quirk)
  } catch (error) {
    console.error('Error fetching quirk:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quirk' },
      { status: 500 }
    )
  }
}

// PUT update a quirk
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid quirk ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, description, isActive } = body

    const existingQuirk = await prisma.quirk.findUnique({
      where: { id },
    })

    if (!existingQuirk) {
      return NextResponse.json(
        { error: 'Quirk not found' },
        { status: 404 }
      )
    }

    const updateData: { name?: string; description?: string; isActive?: boolean } = {}

    if (name && typeof name === 'string' && name.trim().length > 0) {
      updateData.name = name.trim()
    }

    if (description && typeof description === 'string' && description.trim().length > 0) {
      updateData.description = description.trim()
    }

    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive
    }

    const quirk = await prisma.quirk.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(quirk)
  } catch (error) {
    console.error('Error updating quirk:', error)
    return NextResponse.json(
      { error: 'Failed to update quirk' },
      { status: 500 }
    )
  }
}

// DELETE a quirk
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid quirk ID' },
        { status: 400 }
      )
    }

    const quirk = await prisma.quirk.findUnique({
      where: { id },
    })

    if (!quirk) {
      return NextResponse.json(
        { error: 'Quirk not found' },
        { status: 404 }
      )
    }

    await prisma.quirk.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting quirk:', error)
    return NextResponse.json(
      { error: 'Failed to delete quirk' },
      { status: 500 }
    )
  }
}
