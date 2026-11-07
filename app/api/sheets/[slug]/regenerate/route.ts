import { NextResponse } from 'next/server'
import { guardCharacter } from '@/lib/sheet/access'
import { getSheet, regenerate } from '@/lib/sheet/store'
import { errorResponse } from '../../errors'

export const dynamic = 'force-dynamic'

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    await guardCharacter(slug, 'write')
    await regenerate(slug)
    return NextResponse.json(await getSheet(slug))
  } catch (e) {
    return errorResponse(e)
  }
}
