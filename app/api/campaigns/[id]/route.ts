import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'

// Helper to check membership
async function isMember(campaignId: string, userId: string): Promise<boolean> {
  const membership = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  })
  return !!membership
}

// Helper to check if user is DM
async function isDM(campaignId: string, userId: string): Promise<boolean> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { dmUserId: true },
  })
  return campaign?.dmUserId === userId
}

// GET - Get campaign details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check membership
    const memberCheck = await isMember(id, session.user.id)
    if (!memberCheck) {
      return NextResponse.json({ error: 'Not a member of this campaign' }, { status: 403 })
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        dm: { select: { id: true, name: true, image: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        characters: {
          include: {
            character: {
              include: {
                lives: { where: { isActive: true }, take: 1 },
                user: { select: { id: true, name: true, image: true } },
              },
            },
          },
        },
      },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Check if current user is DM
    const userIsDM = campaign.dmUserId === session.user.id

    return NextResponse.json({ ...campaign, userIsDM })
  } catch (error) {
    console.error('Error fetching campaign:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    )
  }
}

// PUT - Update campaign (DM only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if DM
    const dmCheck = await isDM(id, session.user.id)
    if (!dmCheck) {
      return NextResponse.json({ error: 'Only the DM can update the campaign' }, { status: 403 })
    }

    const body = await request.json()
    const { name, regenerateInviteCode } = body

    const updateData: { name?: string; inviteCode?: string } = {}

    if (name && typeof name === 'string' && name.trim().length > 0) {
      updateData.name = name.trim()
    }

    if (regenerateInviteCode) {
      // Generate a new invite code using cuid
      updateData.inviteCode = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: updateData,
      include: {
        dm: { select: { id: true, name: true, image: true } },
      },
    })

    return NextResponse.json(campaign)
  } catch (error) {
    console.error('Error updating campaign:', error)
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    )
  }
}

// DELETE - Delete campaign (DM only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if DM
    const dmCheck = await isDM(id, session.user.id)
    if (!dmCheck) {
      return NextResponse.json({ error: 'Only the DM can delete the campaign' }, { status: 403 })
    }

    // Delete campaign (cascade deletes members and character links)
    await prisma.campaign.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting campaign:', error)
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    )
  }
}
