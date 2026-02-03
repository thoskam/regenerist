import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'
import { sendRollToDiscord } from '@/lib/discord/webhook'
import { generateRollNarration } from '@/lib/ai/narrator'
import type { RollResult } from '@/lib/dice/types'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const roll = body.roll as RollResult | undefined
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId : null
  const includeNarration = Boolean(body.includeNarration)

  if (!roll || !campaignId) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      discordWebhookUrl: true,
      discordRollsEnabled: true,
    },
  })

  if (!campaign?.discordWebhookUrl || !campaign.discordRollsEnabled) {
    return NextResponse.json({ error: 'Discord not configured' }, { status: 400 })
  }

  let narration: string | undefined
  if (includeNarration && (roll.isCriticalSuccess || roll.isCriticalFailure)) {
    narration = await generateRollNarration(roll)
  }

  const success = await sendRollToDiscord(campaign.discordWebhookUrl, roll, narration)

  if (!success) {
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }

  return NextResponse.json({ success: true, narration })
}
