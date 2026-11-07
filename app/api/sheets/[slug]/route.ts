import { NextResponse } from 'next/server'
import { guardCharacter } from '@/lib/sheet/access'
import { deleteSheet, getSheet, updateSheet } from '@/lib/sheet/store'
import { errorResponse } from '../errors'

export const dynamic = 'force-dynamic'
type Ctx = { params: Promise<{ slug: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { slug } = await params
    await guardCharacter(slug, 'read')
    return NextResponse.json(await getSheet(slug))
  } catch (e) {
    return errorResponse(e)
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { slug } = await params
    await guardCharacter(slug, 'write')
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 })
    return NextResponse.json(await updateSheet(slug, { revision: body.revision, state: body.state, theme: body.theme, notes: body.notes }))
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { slug } = await params
    await guardCharacter(slug, 'write')
    await deleteSheet(slug)
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    return errorResponse(e)
  }
}
