import { NextResponse } from 'next/server'
import { requireViewer } from '@/lib/auth'
import { joinCampaign } from '@/lib/campaigns'
import { errorResponse } from '../../sheets/errors'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const v = await requireViewer()
    const body = await req.json().catch(() => ({}))
    return NextResponse.json({ campaign: await joinCampaign(v, body?.code) })
  } catch (e) { return errorResponse(e) }
}
