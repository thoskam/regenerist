import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: {
      discordWebhookUrl: true,
      discordRollsEnabled: true,
      dmUserId: true,
    },
  })

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const isOwner = campaign.dmUserId === session.user.id

  return NextResponse.json({
    discordRollsEnabled: campaign.discordRollsEnabled,
    discordWebhookUrl: isOwner ? campaign.discordWebhookUrl : undefined,
    hasWebhook: Boolean(campaign.discordWebhookUrl),
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id },
  })

  if (!campaign || campaign.dmUserId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const discordWebhookUrl = typeof body.discordWebhookUrl === 'string' ? body.discordWebhookUrl : null
  const discordRollsEnabled = Boolean(body.discordRollsEnabled)

  if (
    discordWebhookUrl &&
    !discordWebhookUrl.startsWith('https://discord.com/api/webhooks/')
  ) {
    return NextResponse.json({ error: 'Invalid Discord webhook URL' }, { status: 400 })
  }

  await prisma.campaign.update({
    where: { id },
    data: {
      discordWebhookUrl: discordWebhookUrl || null,
      discordRollsEnabled,
    },
  })

  return NextResponse.json({ success: true })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id },
  })

  if (!campaign || campaign.dmUserId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!campaign.discordWebhookUrl) {
    return NextResponse.json({ error: 'No webhook configured' }, { status: 400 })
  }

  const response = await fetch(campaign.discordWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'The Regenerist',
      content: '🎲 Webhook test successful! Dice rolls from The Regenerist will appear here.',
    }),
  })

  if (!response.ok) {
    return NextResponse.json({ error: 'Webhook test failed' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
