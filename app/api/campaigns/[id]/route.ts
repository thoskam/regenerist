import { NextResponse } from 'next/server'
import { requireViewer } from '@/lib/auth'
import { requireMember } from '@/lib/campaigns'
import { prisma } from '@/lib/prisma'
import { listPartySheets, listSheets } from '@/lib/sheet/store'
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
    const characters = await listPartySheets(v, id)
    const userIds = [...new Set([...members.map(m => m.userId), ...characters.map(c => c.ownerId).filter((x): x is string => !!x)])]
    const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true } })
    return NextResponse.json({
      campaign: { id: campaign.id, name: campaign.name, inviteCode: role === 'dm' ? campaign.inviteCode : undefined },
      role, members: members.map(m => ({ role: m.role, name: users.find(u => u.id === m.userId)?.displayName ?? 'Player' })),
      characters: characters.map(c => ({ ...c, playerName: users.find(u => u.id === c.ownerId)?.displayName ?? null })),
      // Your own characters that aren't in this party yet (to add from the party page).
      available: v.user ? (await listSheets(v)).filter(c => c.ownerId === v.user!.id && c.campaignId !== id).map(c => ({ slug: c.slug, name: c.name, classLabel: c.classLabel, level: c.level })) : [],
    })
  } catch (e) { return errorResponse(e) }
}
