export const dynamic = 'force-dynamic'

import { Prisma } from '@prisma/client'
import { legacyGuard } from '@/lib/legacyGuard'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { InputError, prepareLifeUpdate } from '@/lib/lifeUpdates'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string; lifeId: string }> }) {
  const denied = await legacyGuard()
  if (denied) return denied
  const routeParams = await params
  const id = Number(routeParams.lifeId)
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: 'Invalid life ID' }, { status: 400 })
  try {
    const life = await prisma.life.findFirst({ where: { id, character: { slug: routeParams.slug } } })
    return life ? NextResponse.json(life) : NextResponse.json({ error: 'Life not found' }, { status: 404 })
  } catch { return NextResponse.json({ error: 'Failed to fetch life' }, { status: 500 }) }
}

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string; lifeId: string }> }) {
  const denied = await legacyGuard()
  if (denied) return denied
  const routeParams = await params
  const id = Number(routeParams.lifeId)
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: 'Invalid life ID' }, { status: 400 })
  try {
    const body = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Expected an object')
    const result = await prisma.$transaction(async tx => {
      const existing = await tx.life.findFirst({ where: { id, character: { slug: routeParams.slug } } })
      if (!existing) return null
      const data = await prepareLifeUpdate(existing, body)
      const life = await tx.life.update({ where: { id }, data })
      if (existing.isActive) await tx.character.update({ where: { id: existing.characterId }, data: { level: life.level, updatedAt: new Date() } })
      return life
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    return result ? NextResponse.json(result) : NextResponse.json({ error: 'Life not found' }, { status: 404 })
  } catch (error) {
    if (error instanceof InputError || error instanceof SyntaxError) return NextResponse.json({ error: error.message }, { status: 400 })
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') return NextResponse.json({ error: 'This life changed while saving. Refresh and try again.' }, { status: 409 })
    console.error('Error updating life:', error)
    return NextResponse.json({ error: 'Failed to update life' }, { status: 500 })
  }
}
