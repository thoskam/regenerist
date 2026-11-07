import { NextResponse } from 'next/server'
import { requireViewer } from '@/lib/auth'
import { assignCharacter } from '@/lib/campaigns'
import { errorResponse } from '../../errors'

export const dynamic = 'force-dynamic'

/** Body: { campaignId: string | null } */
export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const v = await requireViewer()
    const body = await req.json().catch(() => ({}))
    await assignCharacter(v, (await params).slug, typeof body?.campaignId === 'string' ? body.campaignId : null)
    return NextResponse.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
