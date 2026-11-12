export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { regeneristGuard } from '@/lib/regeneristAccess'
import { prisma } from '@/lib/prisma'
import { InputError, textValue } from '@/lib/lifeUpdates'

// GET all quirks
export async function GET() {
  const denied = await regeneristGuard()
  if (denied) return denied
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
  const denied = await regeneristGuard()
  if (denied) return denied
  try {
    const body = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Expected an object')
    const { name, description, isActive = true } = body
    if (typeof isActive !== 'boolean') throw new InputError('isActive must be a boolean')
    textValue(name, 'name', 200)
    textValue(description, 'description', 50000)

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
        isActive,
      },
    })

    return NextResponse.json(quirk, { status: 201 })
  } catch (error) {
    if (error instanceof InputError || error instanceof SyntaxError) return NextResponse.json({ error: error.message }, { status: 400 })
    console.error('Error creating quirk:', error)
    return NextResponse.json(
      { error: 'Failed to create quirk' },
      { status: 500 }
    )
  }
}
