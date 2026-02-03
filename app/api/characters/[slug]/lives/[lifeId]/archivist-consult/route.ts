import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

interface ConsultRequest {
  question: string
  context?: 'preparation' | 'combat' | 'general'
}

interface ConsultResponse {
  advice: string
  suggestedSpells?: string[]
}

/**
 * POST /api/characters/[slug]/lives/[lifeId]/archivist-consult
 * Get on-demand advice from The Archivist about spells
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; lifeId: string }> }
) {
  const { slug, lifeId } = await params

  try {
    const body: ConsultRequest = await request.json()
    const { question, context = 'general' } = body

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }

    // Limit question length
    if (question.length > 500) {
      return NextResponse.json({ error: 'Question must be 500 characters or less' }, { status: 400 })
    }

    // Get character and life data
    const character = await prisma.character.findUnique({
      where: { slug },
      include: {
        lives: {
          where: { id: parseInt(lifeId, 10) },
          take: 1,
        },
      },
    })

    if (!character || !character.lives[0]) {
      return NextResponse.json({ error: 'Character or life not found' }, { status: 404 })
    }

    const life = character.lives[0]
    const spellbook = life.spellbook as { spellNames?: string[]; preparedSpells?: string[] } | null

    // Build the prompt for The Archivist
    const systemPrompt = `You are "The Archivist," a wise and ancient keeper of magical knowledge in the world of D&D 5e.
You provide tactical advice to spellcasters about spell selection, preparation, and usage.

Your personality:
- Scholarly and precise, but not stuffy
- Offers practical tactical advice
- References class features and synergies when relevant
- Concise but thorough (2-4 paragraphs max)
- May suggest specific spells when appropriate

When recommending spells, ONLY suggest spells the character knows or has access to.

Output your response as JSON with this format:
{"advice": "Your tactical advice here...", "suggestedSpells": ["Spell Name 1", "Spell Name 2"]}

The suggestedSpells array should only be included if you're recommending specific spells. Omit it for general questions.`

    const contextNote = {
      preparation: 'The caster is preparing their spells for the day and wants advice on what to prepare.',
      combat: 'The caster is about to enter combat or is in a tactical situation.',
      general: 'This is a general question about spellcasting.',
    }[context]

    const userPrompt = `Character Information:
- Name: ${life.name}
- Race: ${life.race}
- Class: ${life.class} (${life.subclass})
- Level: ${character.level}

Known/Available Spells: ${spellbook?.spellNames?.join(', ') || 'None recorded'}
Currently Prepared: ${spellbook?.preparedSpells?.join(', ') || 'Not tracked'}

Context: ${contextNote}

Question: ${question.trim()}

Please provide your advice, Archivist.`

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 600,
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

    // Try to extract JSON from response
    let result: ConsultResponse
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        result = {
          advice: parsed.advice || text,
          suggestedSpells: parsed.suggestedSpells,
        }
      } else {
        // If no JSON, use the raw text as advice
        result = { advice: text }
      }
    } catch {
      // If JSON parsing fails, use raw text
      result = { advice: text }
    }

    // Validate suggested spells against known spells
    if (result.suggestedSpells && spellbook?.spellNames) {
      const knownSpellsLower = spellbook.spellNames.map(s => s.toLowerCase())
      result.suggestedSpells = result.suggestedSpells.filter(
        spell => knownSpellsLower.includes(spell.toLowerCase())
      )
      // Remove empty array
      if (result.suggestedSpells.length === 0) {
        delete result.suggestedSpells
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error consulting Archivist:', error)
    return NextResponse.json(
      { error: 'Failed to consult The Archivist' },
      { status: 500 }
    )
  }
}
