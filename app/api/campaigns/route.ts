import { NextResponse } from 'next/server'
import { requireViewer } from '@/lib/auth'
import { createCampaign, listCampaigns } from '@/lib/campaigns'
import { errorResponse } from '../sheets/errors'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json({ campaigns: await listCampaigns(await requireViewer()) })
  } catch (e) { return errorResponse(e) }
}

export async function POST(req: Request) {
  try {
    const v = await requireViewer()
    const body = await req.json().catch(() => ({}))
    return NextResponse.json({ campaign: await createCampaign(v, body?.name) }, { status: 201 })
  } catch (e) { return errorResponse(e) }
}
