import { NextResponse } from 'next/server'
import { deleteSheet, getSheet, updateSheet } from '@/lib/sheet/store'
import { errorResponse } from '../errors'

export const dynamic = 'force-dynamic'
type Ctx = { params: Promise<{ slug: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const sheet = await getSheet((await params).slug)
  return sheet ? NextResponse.json(sheet) : NextResponse.json({ error: 'Character not found.' }, { status: 404 })
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 })
    const result = await updateSheet((await params).slug, { revision: body.revision, state: body.state, theme: body.theme, notes: body.notes })
    return NextResponse.json(result)
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await deleteSheet((await params).slug)
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    return errorResponse(e)
  }
}
