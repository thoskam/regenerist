import { NextResponse } from 'next/server'
import { guardCharacter } from '@/lib/sheet/access'
import { getSheet, regenerate } from '@/lib/sheet/store'
import { errorResponse } from '../../errors'
import { AuthError } from '@/lib/auth'
import { canUseRegenerist } from '@/lib/regeneristAccess'

export const dynamic = 'force-dynamic'

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const v = await guardCharacter(slug, 'write')
    if (!canUseRegenerist(v)) throw new AuthError('Not found.', 404)
    await regenerate(slug)
    return NextResponse.json(await getSheet(slug))
  } catch (e) {
    return errorResponse(e)
  }
}
