// Parties (campaigns), membership, and the shared roll feed.
import { AuthError, canAccessCharacter, inviteCode, type Viewer } from './auth'
import { prisma } from './prisma'

export async function listCampaigns(v: Viewer) {
  if (!v.authEnabled || v.user?.isAdmin) return prisma.campaign.findMany({ orderBy: { createdAt: 'desc' } })
  const ids = (await prisma.campaignMember.findMany({ where: { userId: v.user!.id }, select: { campaignId: true } })).map(m => m.campaignId)
  return prisma.campaign.findMany({ where: { id: { in: ids } }, orderBy: { createdAt: 'desc' } })
}

export async function requireMember(v: Viewer, campaignId: string) {
  const c = await prisma.campaign.findUnique({ where: { id: campaignId } })
  if (!c) throw new AuthError('Party not found.', 404)
  if (!v.authEnabled || v.user?.isAdmin) return { campaign: c, role: 'dm' as const }
  const m = await prisma.campaignMember.findUnique({ where: { campaignId_userId: { campaignId, userId: v.user!.id } } })
  if (!m) throw new AuthError('Party not found.', 404)
  return { campaign: c, role: m.role === 'dm' ? 'dm' as const : 'player' as const }
}

export async function createCampaign(v: Viewer, name: unknown) {
  const n = typeof name === 'string' ? name.trim().slice(0, 60) : ''
  if (!n) throw new AuthError('Name the party.', 400)
  const c = await prisma.campaign.create({ data: { name: n, inviteCode: inviteCode(), dmUserId: v.user?.id ?? null } })
  if (v.user) await prisma.campaignMember.create({ data: { campaignId: c.id, userId: v.user.id, role: 'dm' } })
  return c
}

export async function joinCampaign(v: Viewer, code: unknown) {
  if (!v.user) throw new AuthError('Sign in to join a party.', 401)
  const c = await prisma.campaign.findUnique({ where: { inviteCode: String(code ?? '').trim().toUpperCase() } })
  if (!c) throw new AuthError('No party has that invite code.', 404)
  await prisma.campaignMember.upsert({ where: { campaignId_userId: { campaignId: c.id, userId: v.user.id } }, update: {}, create: { campaignId: c.id, userId: v.user.id } })
  return c
}

export async function assignCharacter(v: Viewer, slug: string, campaignId: string | null) {
  const ch = await prisma.playerCharacter.findUnique({ where: { slug }, select: { id: true, ownerId: true, campaignId: true } })
  if (!ch || !(await canAccessCharacter(v, ch, 'write'))) throw new AuthError('Character not found.', 404)
  if (campaignId) await requireMember(v, campaignId)
  await prisma.playerCharacter.update({ where: { id: ch.id }, data: { campaignId } })
}

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : '')

export async function postRoll(v: Viewer, campaignId: string, body: Record<string, unknown>) {
  await requireMember(v, campaignId)
  const slug = clip(body.characterSlug, 80)
  const ch = slug ? await prisma.playerCharacter.findUnique({ where: { slug }, select: { name: true, ownerId: true, campaignId: true } }) : null
  if (!ch || ch.campaignId !== campaignId || !(await canAccessCharacter(v, ch, 'write'))) throw new AuthError('Roll as one of your characters in this party.', 403)
  const total = Math.trunc(Number(body.total))
  return prisma.roll.create({
    data: {
      campaignId, characterSlug: slug, characterName: ch.name, userId: v.user?.id ?? null,
      label: clip(body.label, 120) || 'Roll', total: Number.isFinite(total) ? Math.max(-9999, Math.min(99999, total)) : 0,
      detail: clip(body.detail, 300), tag: clip(body.tag, 20) || null,
    },
  })
}

export async function recentRolls(campaignId: string, after?: Date) {
  const rows = await prisma.roll.findMany({ where: { campaignId, ...(after ? { createdAt: { gt: after } } : {}) }, orderBy: { createdAt: 'desc' }, take: 100 })
  const ids = [...new Set(rows.map(r => r.userId).filter((x): x is string => !!x))]
  const names = new Map((ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, displayName: true } }) : []).map(u => [u.id, u.displayName]))
  return rows.reverse().map(r => ({ ...r, playerName: r.userId ? names.get(r.userId) ?? null : null }))
}
