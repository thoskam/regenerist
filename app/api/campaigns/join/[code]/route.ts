import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'

// POST - Join campaign via invite code
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { inviteCode: code },
      include: {
        dm: { select: { id: true, name: true, image: true } },
      },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
    }

    // Check if already a member
    const existing = await prisma.campaignMember.findUnique({
      where: {
        userId_campaignId: {
          userId: session.user.id,
          campaignId: campaign.id,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'You are already a member of this campaign', campaign },
        { status: 400 }
      )
    }

    // Add as player
    await prisma.campaignMember.create({
      data: {
        userId: session.user.id,
        campaignId: campaign.id,
        role: 'player',
      },
    })

    return NextResponse.json({ success: true, campaign })
  } catch (error) {
    console.error('Error joining campaign:', error)
    return NextResponse.json(
      { error: 'Failed to join campaign' },
      { status: 500 }
    )
  }
}

// GET - Get campaign info for join page (without requiring membership)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const session = await getSession()

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { inviteCode: code },
      include: {
        dm: { select: { id: true, name: true, image: true } },
        _count: { select: { members: true } },
      },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
    }

    // Check if already a member
    let isMember = false
    if (session?.user?.id) {
      const membership = await prisma.campaignMember.findUnique({
        where: {
          userId_campaignId: {
            userId: session.user.id,
            campaignId: campaign.id,
          },
        },
      })
      isMember = !!membership
    }

    return NextResponse.json({
      id: campaign.id,
      name: campaign.name,
      dm: campaign.dm,
      memberCount: campaign._count.members,
      isMember,
    })
  } catch (error) {
    console.error('Error fetching campaign:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    )
  }
}
