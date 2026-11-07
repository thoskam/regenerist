export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { legacyGuard } from '@/lib/legacyGuard'
import { prisma } from '@/lib/prisma'
import { InputError, textValue } from '@/lib/lifeUpdates'

// GET a single quirk
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await legacyGuard()
  if (denied) return denied
  const routeParams = await params
  try {
    const id = Number(routeParams.id)
    if (!Number.isSafeInteger(id) || id < 1) {
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
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await legacyGuard()
  if (denied) return denied
  const routeParams = await params
  try {
    const id = Number(routeParams.id)
    if (!Number.isSafeInteger(id) || id < 1) {
      return NextResponse.json(
        { error: 'Invalid quirk ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Expected an object')
    const { name, description, isActive } = body
    if (name !== undefined && !textValue(name, 'name', 200).trim()) throw new InputError('Name is required')
    if (description !== undefined && !textValue(description, 'description').trim()) throw new InputError('Description is required')
    if (isActive !== undefined && typeof isActive !== 'boolean') throw new InputError('isActive must be a boolean')

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
    if (error instanceof InputError || error instanceof SyntaxError) return NextResponse.json({ error: error.message }, { status: 400 })
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
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await legacyGuard()
  if (denied) return denied
  const routeParams = await params
  try {
    const id = Number(routeParams.id)
    if (!Number.isSafeInteger(id) || id < 1) {
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
