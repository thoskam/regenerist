/**
 * Smart Spellbook Generator
 * Uses AWS Bedrock to select thematically appropriate spells
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

export interface GeneratedSpellbook {
  spellNames: string[]
  archivistNote: string
}

/**
 * Generate a smart spellbook using AI to select thematically appropriate spells
 */
export async function generateSmartSpellbook(
  race: string,
  className: string,
  subclassName: string,
  level: number,
  availableCantrips: string[],
  availableSpells: string[],
  cantripsCount: number,
  spellsCount: number
): Promise<GeneratedSpellbook | null> {
  // If no spells to select, return null
  if (cantripsCount === 0 && spellsCount === 0) {
    return null
  }

  // If no available spells, return null
  if (availableCantrips.length === 0 && availableSpells.length === 0) {
    return null
  }

  try {
    const systemPrompt = `You are "The Archivist," a tactical D&D 5e strategist who selects balanced, thematically appropriate spell lists.

Your role:
- Select spells that match the character's race, class theme, and subclass
- Provide a mix of utility, defense, and offense where appropriate
- Consider synergies between spells and class features
- Favor iconic spells that define the class fantasy

CRITICAL: You must ONLY select spells from the provided lists. Do not invent or suggest spells not in the lists.

Output ONLY raw JSON in this exact format, no other text or markdown:
{"cantrips": ["name1", "name2"], "spells": ["name1", "name2"], "archivistNote": "2-3 sentence tactical advice"}`

    const userPrompt = `Select spells for a Level ${level} ${race} ${className} (${subclassName}).

Available Cantrips (select exactly ${cantripsCount}):
${availableCantrips.length > 0 ? availableCantrips.join(', ') : 'None available'}

Available Spells (select exactly ${spellsCount}):
${availableSpells.length > 0 ? availableSpells.join(', ') : 'None available'}

Remember: Select ONLY from the lists above. Provide tactical advice considering the character's subclass features.`

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 800,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    }

    const command = new InvokeModelCommand({
      modelId: process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    })

    const response = await bedrockClient.send(command)
    const responseBody = JSON.parse(new TextDecoder().decode(response.body))
    const text = responseBody.content[0]?.text || ''

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in Bedrock response:', text)
      return null
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validate and filter cantrips - only keep ones from available list
    const validCantrips = (parsed.cantrips || [])
      .filter((name: string) =>
        availableCantrips.some(c => c.toLowerCase() === name.toLowerCase())
      )
      .slice(0, cantripsCount)

    // Validate and filter spells - only keep ones from available list
    const validSpells = (parsed.spells || [])
      .filter((name: string) =>
        availableSpells.some(s => s.toLowerCase() === name.toLowerCase())
      )
      .slice(0, spellsCount)

    // Combine into spellNames
    const spellNames = [...validCantrips, ...validSpells]

    return {
      spellNames,
      archivistNote: parsed.archivistNote || 'Trust in your magical instincts.',
    }
  } catch (error) {
    console.error('Error generating smart spellbook:', error)
    return null
  }
}
