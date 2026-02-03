import type { RollResult } from '@/lib/dice/types'

interface DiscordEmbed {
  title: string
  description?: string
  color: number
  fields?: { name: string; value: string; inline?: boolean }[]
  footer?: { text: string }
  timestamp?: string
}

interface DiscordWebhookPayload {
  username?: string
  avatar_url?: string
  content?: string
  embeds?: DiscordEmbed[]
}

const COLORS = {
  normal: 0x5865f2,
  success: 0x57f287,
  failure: 0xed4245,
  critical: 0xfee75c,
  nat1: 0x992d22,
}

export function formatRollEmbed(roll: RollResult): DiscordEmbed {
  let color = COLORS.normal
  let title = `🎲 ${roll.rollName}`

  if (roll.isCriticalSuccess) {
    color = COLORS.critical
    title = `✨ NATURAL 20! ${roll.rollName}`
  } else if (roll.isCriticalFailure) {
    color = COLORS.nat1
    title = `💀 NATURAL 1! ${roll.rollName}`
  } else if (roll.isSuccess === true) {
    color = COLORS.success
  } else if (roll.isSuccess === false) {
    color = COLORS.failure
  }

  const fields: { name: string; value: string; inline?: boolean }[] = []

  fields.push({
    name: 'Result',
    value: `**${roll.total}**`,
    inline: true,
  })

  if (roll.rollType !== 'damage') {
    fields.push({
      name: 'd20',
      value: roll.naturalRoll.toString(),
      inline: true,
    })
  }

  if (roll.modifier !== 0) {
    fields.push({
      name: 'Modifier',
      value: `${roll.modifier >= 0 ? '+' : ''}${roll.modifier}`,
      inline: true,
    })
  }

  if (roll.advantageRolls && roll.advantageRolls.length > 1) {
    fields.push({
      name: roll.advantageState === 'advantage' ? '🔼 Advantage' : '🔽 Disadvantage',
      value: `[${roll.advantageRolls.join(', ')}]`,
      inline: true,
    })
  }

  if (roll.targetDC !== undefined) {
    fields.push({
      name: 'Target',
      value: roll.targetDC.toString(),
      inline: true,
    })
    fields.push({
      name: 'Status',
      value: roll.isSuccess ? '✅ Success' : '❌ Failure',
      inline: true,
    })
  }

  if (roll.rollType === 'damage' && roll.dice.length > 0) {
    const diceBreakdown = roll.dice
      .map((dice) => `${dice.count}${dice.die}: [${dice.results.join(', ')}]`)
      .join('\n')
    fields.push({
      name: 'Dice',
      value: diceBreakdown,
      inline: false,
    })
  }

  return {
    title,
    color,
    fields,
    footer: { text: roll.characterName },
    timestamp: new Date(roll.timestamp).toISOString(),
  }
}

export async function sendRollToDiscord(
  webhookUrl: string,
  roll: RollResult,
  aiNarration?: string
): Promise<boolean> {
  try {
    const embed = formatRollEmbed(roll)

    if (aiNarration) {
      embed.description = `*${aiNarration}*`
    }

    const payload: DiscordWebhookPayload = {
      username: 'The Regenerist',
      embeds: [embed],
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    return response.ok
  } catch (error) {
    console.error('Failed to send roll to Discord:', error)
    return false
  }
}
