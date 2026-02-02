import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'

// DELETE - Remove member from campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id: campaignId, userId: targetUserId } = await params
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { dmUserId: true },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const isDM = campaign.dmUserId === session.user.id
    const isSelf = targetUserId === session.user.id

    // DM can remove anyone except themselves
    // Players can only remove themselves (leave)
    if (!isDM && !isSelf) {
      return NextResponse.json(
        { error: 'You can only remove yourself from this campaign' },
        { status: 403 }
      )
    }

    // DM cannot leave their own campaign
    if (isSelf && isDM) {
      return NextResponse.json(
        { error: 'DM cannot leave the campaign. Transfer DM role first or delete the campaign.' },
        { status: 400 }
      )
    }

    // Remove member
    await prisma.campaignMember.delete({
      where: {
        userId_campaignId: {
          userId: targetUserId,
          campaignId,
        },
      },
    })

    // Also remove any of their characters from this campaign
    await prisma.characterCampaign.deleteMany({
      where: {
        campaignId,
        character: { userId: targetUserId },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing member:', error)
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    )
  }
}

// PUT - Update member role (DM only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id: campaignId, userId: targetUserId } = await params
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { dmUserId: true },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.dmUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the DM can update member roles' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { role } = body

    if (!['dm', 'player'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // If promoting someone to DM, also update the campaign
    if (role === 'dm' && targetUserId !== campaign.dmUserId) {
      await prisma.$transaction([
        // Update campaign DM
        prisma.campaign.update({
          where: { id: campaignId },
          data: { dmUserId: targetUserId },
        }),
        // Update target user's role to DM
        prisma.campaignMember.update({
          where: {
            userId_campaignId: { userId: targetUserId, campaignId },
          },
          data: { role: 'dm' },
        }),
        // Demote current DM to player
        prisma.campaignMember.update({
          where: {
            userId_campaignId: { userId: session.user.id, campaignId },
          },
          data: { role: 'player' },
        }),
      ])
    } else {
      await prisma.campaignMember.update({
        where: {
          userId_campaignId: { userId: targetUserId, campaignId },
        },
        data: { role },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating member role:', error)
    return NextResponse.json(
      { error: 'Failed to update member role' },
      { status: 500 }
    )
  }
}
