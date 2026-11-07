import { NextResponse } from 'next/server'
import { requireViewer } from '@/lib/auth'
import { requireMember } from '@/lib/campaigns'
import { prisma } from '@/lib/prisma'
import { listSheets } from '@/lib/sheet/store'
import { errorResponse } from '../../sheets/errors'

export const dynamic = 'force-dynamic'
type Ctx = { params: Promise<{ id: string }> }

/** Party overview: the campaign and its characters' table state. */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const v = await requireViewer()
    const { id } = await params
    const { campaign, role } = await requireMember(v, id)
    const members = await prisma.campaignMember.findMany({ where: { campaignId: id } })
    const users = await prisma.user.findMany({ where: { id: { in: members.map(m => m.userId) } }, select: { id: true, displayName: true } })
    return NextResponse.json({
      campaign: { id: campaign.id, name: campaign.name, inviteCode: role === 'dm' ? campaign.inviteCode : undefined },
      role, members: members.map(m => ({ role: m.role, name: users.find(u => u.id === m.userId)?.displayName ?? 'Player' })),
      characters: await listSheets(v, { campaignId: id }),
    })
  } catch (e) { return errorResponse(e) }
}
