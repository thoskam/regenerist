import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'

/**
 * POST /api/admin/claim-characters
 * Assigns all characters without an owner to the current user.
 * This is a one-time migration utility for the first admin.
 */
export async function POST() {
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Count unowned characters first
    const unownedCount = await prisma.character.count({
      where: { userId: null },
    })

    if (unownedCount === 0) {
      return NextResponse.json({
        message: 'No unowned characters to claim',
        claimed: 0,
      })
    }

    // Assign all unowned characters to the current user
    const result = await prisma.character.updateMany({
      where: { userId: null },
      data: { userId: session.user.id },
    })

    return NextResponse.json({
      message: `Successfully claimed ${result.count} characters`,
      claimed: result.count,
    })
  } catch (error) {
    console.error('Error claiming characters:', error)
    return NextResponse.json(
      { error: 'Failed to claim characters' },
      { status: 500 }
    )
  }
}
