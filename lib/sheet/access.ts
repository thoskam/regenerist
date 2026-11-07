// Authorization for v2 character routes.
import { AuthError, canAccessCharacter, requireViewer, type Viewer } from '../auth'
import { prisma } from '../prisma'

export async function guardCharacter(slug: string, mode: 'read' | 'write'): Promise<Viewer> {
  const viewer = await requireViewer()
  const row = await prisma.playerCharacter.findUnique({ where: { slug }, select: { ownerId: true, campaignId: true } })
  // Hide existence from people who can't read it.
  if (!row || !(await canAccessCharacter(viewer, row, 'read'))) throw new AuthError('Character not found.', 404)
  if (mode === 'write' && !(await canAccessCharacter(viewer, row, 'write'))) throw new AuthError('Only the character’s owner can change it.', 403)
  return viewer
}
