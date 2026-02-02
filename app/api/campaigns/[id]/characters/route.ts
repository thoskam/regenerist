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

// GET - List characters in campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check membership
    const memberCheck = await isMember(campaignId, session.user.id)
    if (!memberCheck) {
      return NextResponse.json({ error: 'Not a member of this campaign' }, { status: 403 })
    }

    const characters = await prisma.characterCampaign.findMany({
      where: { campaignId },
      include: {
        character: {
          include: {
            lives: { where: { isActive: true }, take: 1 },
            user: { select: { id: true, name: true, image: true } },
          },
        },
      },
    })

    return NextResponse.json(characters)
  } catch (error) {
    console.error('Error fetching campaign characters:', error)
    return NextResponse.json(
      { error: 'Failed to fetch characters' },
      { status: 500 }
    )
  }
}

// POST - Add character to campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check membership
    const memberCheck = await isMember(campaignId, session.user.id)
    if (!memberCheck) {
      return NextResponse.json({ error: 'Not a member of this campaign' }, { status: 403 })
    }

    const body = await request.json()
    const { characterId } = body

    if (!characterId) {
      return NextResponse.json({ error: 'Character ID is required' }, { status: 400 })
    }

    // Check that character belongs to user
    const character = await prisma.character.findUnique({
      where: { id: characterId },
    })

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    if (character.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only add your own characters to a campaign' },
        { status: 403 }
      )
    }

    // Check if already in campaign
    const existing = await prisma.characterCampaign.findUnique({
      where: {
        characterId_campaignId: { characterId, campaignId },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Character is already in this campaign' },
        { status: 400 }
      )
    }

    const link = await prisma.characterCampaign.create({
      data: { characterId, campaignId },
      include: {
        character: {
          include: {
            lives: { where: { isActive: true }, take: 1 },
          },
        },
      },
    })

    return NextResponse.json(link, { status: 201 })
  } catch (error) {
    console.error('Error adding character to campaign:', error)
    return NextResponse.json(
      { error: 'Failed to add character' },
      { status: 500 }
    )
  }
}

// DELETE - Remove character from campaign
export async function DELETE(request: NextRequest) {
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const characterId = searchParams.get('characterId')
    const campaignId = searchParams.get('campaignId')

    if (!characterId || !campaignId) {
      return NextResponse.json(
        { error: 'Character ID and Campaign ID are required' },
        { status: 400 }
      )
    }

    // Get the character and campaign
    const [character, campaign] = await Promise.all([
      prisma.character.findUnique({ where: { id: parseInt(characterId) } }),
      prisma.campaign.findUnique({ where: { id: campaignId } }),
    ])

    if (!character || !campaign) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Owner can remove their character, DM can remove any character
    const isOwner = character.userId === session.user.id
    const isDM = campaign.dmUserId === session.user.id

    if (!isOwner && !isDM) {
      return NextResponse.json(
        { error: 'You do not have permission to remove this character' },
        { status: 403 }
      )
    }

    await prisma.characterCampaign.delete({
      where: {
        characterId_campaignId: {
          characterId: parseInt(characterId),
          campaignId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing character from campaign:', error)
    return NextResponse.json(
      { error: 'Failed to remove character' },
      { status: 500 }
    )
  }
}
