import { NextResponse } from 'next/server'
import { guardCharacter } from '@/lib/sheet/access'
import { getAvatar, setAvatar } from '@/lib/sheet/store'
import { errorResponse } from '../../errors'

export const dynamic = 'force-dynamic'
type Ctx = { params: Promise<{ slug: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params
  try { await guardCharacter(slug, 'read') } catch (e) { return errorResponse(e) }
  const a = await getAvatar(slug)
  if (!a) return new NextResponse(null, { status: 404 })
  return new NextResponse(new Uint8Array(a.bytes), {
    headers: {
      'Content-Type': a.type, 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'",
      'Cache-Control': 'private, max-age=0, must-revalidate', 'Last-Modified': a.updatedAt.toUTCString(),
    },
  })
}

/** Body: the raw image bytes (PNG, JPEG, GIF, or WebP; up to 2 MB). */
export async function PUT(req: Request, { params }: Ctx) {
  try {
    const len = Number(req.headers.get('content-length') || 0)
    if (len > 2 * 1024 * 1024) return NextResponse.json({ error: 'Portraits must be 2 MB or smaller.' }, { status: 413 })
    await guardCharacter((await params).slug, 'write')
    await setAvatar((await params).slug, new Uint8Array(await req.arrayBuffer()))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await guardCharacter((await params).slug, 'write')
    await setAvatar((await params).slug, null)
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    return errorResponse(e)
  }
}
