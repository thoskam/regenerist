import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import type { RollResult } from '@/lib/dice/types'

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

export async function generateRollNarration(roll: RollResult): Promise<string> {
  const prompt = buildNarrationPrompt(roll)

  try {
    const response = await bedrock.send(
      new InvokeModelCommand({
        modelId: process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 150,
          temperature: 0.9,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      })
    )

    const responseBody = JSON.parse(new TextDecoder().decode(response.body))
    return responseBody.content[0]?.text?.trim() || getDefaultNarration(roll)
  } catch (error) {
    console.error('Failed to generate narration:', error)
    return getDefaultNarration(roll)
  }
}

function buildNarrationPrompt(roll: RollResult): string {
  const persona = `You are "The Narrator", a dramatic voice that describes dice rolls in a D&D game.
Your narrations are brief (1-2 sentences), evocative, and capture the tension of the moment.
Vary your style - sometimes dramatic, sometimes witty, sometimes ominous.
Never mention game mechanics or numbers - only describe what happens in the story.`

  if (roll.isCriticalSuccess) {
    return `${persona}

The character "${roll.characterName}" just rolled a NATURAL 20 on a ${roll.rollName}!
Write a brief, triumphant narration describing this moment of perfect success.
Make it epic but concise.`
  }

  if (roll.isCriticalFailure) {
    return `${persona}

The character "${roll.characterName}" just rolled a NATURAL 1 on a ${roll.rollName}!
Write a brief, comedic or dramatic narration describing this spectacular failure.
Keep it fun, not mean-spirited.`
  }

  if (roll.isSuccess === true) {
    return `${persona}

The character "${roll.characterName}" succeeded on a ${roll.rollName} with a total of ${roll.total}.
Write a brief narration describing this successful action.`
  }

  if (roll.isSuccess === false) {
    return `${persona}

The character "${roll.characterName}" failed a ${roll.rollName} with a total of ${roll.total}.
Write a brief narration describing this setback.`
  }

  return `${persona}

The character "${roll.characterName}" rolled a ${roll.rollName} with a result of ${roll.total}.
Write a brief narration for this moment.`
}

function getDefaultNarration(roll: RollResult): string {
  if (roll.isCriticalSuccess) {
    const options = [
      'The dice gods smile upon you!',
      'Fortune favors the bold!',
      'A perfect strike of destiny!',
      'The stars align in your favor!',
      'Legendary!',
    ]
    return options[Math.floor(Math.random() * options.length)]
  }

  if (roll.isCriticalFailure) {
    const options = [
      'The dice betray you spectacularly.',
      'Well... that happened.',
      "A moment you'll want to forget.",
      'The universe has other plans.',
      'Fate laughs at your misfortune.',
    ]
    return options[Math.floor(Math.random() * options.length)]
  }

  return ''
}
