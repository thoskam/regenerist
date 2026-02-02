import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'

// GET - List user's campaigns
export async function GET() {
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const campaigns = await prisma.campaign.findMany({
      where: {
        OR: [
          { dmUserId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
      include: {
        dm: { select: { id: true, name: true, image: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
        _count: {
          select: { members: true, characters: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Add user's role to each campaign
    const campaignsWithRole = campaigns.map((campaign) => {
      const membership = campaign.members.find((m) => m.userId === session.user.id)
      return {
        ...campaign,
        userRole: membership?.role || (campaign.dmUserId === session.user.id ? 'dm' : 'player'),
      }
    })

    return NextResponse.json(campaignsWithRole)
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}

// POST - Create new campaign
export async function POST(request: Request) {
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Campaign name is required' }, { status: 400 })
    }

    const campaign = await prisma.campaign.create({
      data: {
        name: name.trim(),
        dmUserId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: 'dm',
          },
        },
      },
      include: {
        dm: { select: { id: true, name: true, image: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
      },
    })

    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    )
  }
}
