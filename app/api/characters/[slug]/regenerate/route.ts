import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomClass, randomRace, randomFromArray } from '@/lib/randomizer'
import { mapStatsForClass, getStatModifier } from '@/lib/statMapper'
import { calculateMaxHp } from '@/lib/calculations'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { getSubclassDecision } from '@/lib/subclassDecisions'
import { applyASIs } from '@/lib/asiCalculator'
import { selectSkillProficiencies } from '@/lib/proficiencyEngine'

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

interface RacialBonuses {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

async function getRacialBonuses(race: string): Promise<RacialBonuses> {
  const defaultBonuses: RacialBonuses = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }

  try {
    const prompt = `For D&D 5e, what are the ability score increases for the race "${race}"?

Respond ONLY with a JSON object in this exact format, no other text:
{"str": 0, "dex": 0, "con": 0, "int": 0, "wis": 0, "cha": 0}

Replace the 0s with the actual racial bonuses. For races with flexible bonuses (like Custom Lineage, Variant Human, or Tasha's optional rules), use the most common/optimal distribution. For subraces, use the combined total of base race + subrace bonuses.

Examples:
- Dwarf (Hill): {"str": 0, "dex": 0, "con": 2, "int": 0, "wis": 1, "cha": 0}
- Elf (High): {"str": 0, "dex": 2, "con": 0, "int": 1, "wis": 0, "cha": 0}
- Human (Standard): {"str": 1, "dex": 1, "con": 1, "int": 1, "wis": 1, "cha": 1}
- Human (Variant): {"str": 0, "dex": 0, "con": 0, "int": 0, "wis": 0, "cha": 0} (plus +1 to two stats of choice - use {"str": 1, "dex": 1, "con": 0, "int": 0, "wis": 0, "cha": 0} as default)

Now give me the bonuses for: ${race}`

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 100,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: prompt,
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
    const jsonMatch = text.match(/\{[^}]+\}/)
    if (jsonMatch) {
      const bonuses = JSON.parse(jsonMatch[0])
      return {
        str: Number(bonuses.str) || 0,
        dex: Number(bonuses.dex) || 0,
        con: Number(bonuses.con) || 0,
        int: Number(bonuses.int) || 0,
        wis: Number(bonuses.wis) || 0,
        cha: Number(bonuses.cha) || 0,
      }
    }
  } catch (error) {
    console.error('Error getting racial bonuses:', error)
  }

  return defaultBonuses
}

function applyRacialBonuses(
  baseStats: { str: number; dex: number; con: number; int: number; wis: number; cha: number },
  bonuses: RacialBonuses
): { str: number; dex: number; con: number; int: number; wis: number; cha: number } {
  return {
    str: baseStats.str + bonuses.str,
    dex: baseStats.dex + bonuses.dex,
    con: baseStats.con + bonuses.con,
    int: baseStats.int + bonuses.int,
    wis: baseStats.wis + bonuses.wis,
    cha: baseStats.cha + bonuses.cha,
  }
}

async function generateStory(
  name: string,
  race: string,
  className: string,
  subclass: string,
  effect: string,
  lifeNumber: number,
  previousLife?: { name: string; race: string; class: string; subclass: string } | null,
  subclassChoice?: string | null
): Promise<string> {
  try {
    const previousLifeContext = previousLife
      ? `Previous form: ${previousLife.race} ${previousLife.class} (${previousLife.subclass}).`
      : 'This is their first known incarnation.'

    const systemPrompt = `Role: You are "The Archivist," a witty, slightly eccentric D&D 5e expert and cosmic chronicler. Your job is to describe a "Regeneration"—the moment a character's soul inhabits a new body and class.

Tone: Encouraging, witty, and grounded in D&D mechanics. You balance high-fantasy drama with "Doctor Who" style humor. Be specific about D&D 5e mechanics.

Output Format (Required - use these exact markdown headers):

## Your New Form: [Give this incarnation a dramatic title]

| Category | Result | Details |
|----------|--------|---------|
| Race | [Race name] | [1-2 sentences describing key racial traits and mechanics] |
| Class | [Class: Subclass] | [1-2 sentences describing what this subclass does mechanically] |
| Effect | [Effect name] | [Brief description of the quirk effect] |

## The Roleplay Moment

[1 short paragraph (max 100 words) with vivid, sensory description of the physical transformation. Describe the shift from previous form to new one and how the regeneration effect manifests. Keep it punchy and cinematic.]

## How to Play This Life

[2-3 sentences of tactical advice grounded in actual D&D 5e mechanics. What's their role in combat? What's their "bread and butter" ability? How should they position themselves? Be specific about actual class/subclass features.]

## Signature Catchphrase

*"[4 words maximum - a punchy, memorable battle cry or motto]"*

Constraints:
- Signature catchphrase must be exactly 4 words or fewer
- Be specific about D&D 5e mechanics. Reference actual class features, racial abilities, and subclass capabilities by name when relevant.`

    const subclassChoiceContext = subclassChoice
      ? `\nSubclass Choice: ${subclassChoice}`
      : ''

    const userPrompt = `Describe the ${lifeNumber}${getOrdinalSuffix(lifeNumber)} regeneration of ${name}.

${previousLifeContext}

New form: ${race} ${className} (${subclass})${subclassChoiceContext}

Post-Regeneration Quirk rolled: "${effect}"

Remember to fill in the markdown table with accurate D&D 5e mechanical details for the race and class/subclass.${subclassChoice ? ` Be sure to mention their ${subclassChoice} choice in the tactical advice.` : ''}`

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1200,
      temperature: 0.8,
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

    return responseBody.content[0]?.text || 'The regeneration energy fades, leaving you transformed and renewed.'
  } catch (error) {
    console.error('Bedrock API error:', error)
    return `## The Roleplay Moment
Golden energy courses through your veins as your form shifts into ${name}, a ${race} ${className}.

## Combat & Flavor
As a ${subclass}, you'll find your strength in the unique abilities of this path.

## The Quirk
${effect}

## How to Play This Life
Lean into your new abilities and explore what this form can do.

## Signature Catchphrase
*"Every end is just another beginning."*`
  }
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

function rollD4(): number {
  return Math.floor(Math.random() * 4) + 1
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    // Find the character by slug
    const character = await prisma.character.findUnique({
      where: { slug: params.slug },
    })

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const uniqueSubclasses = body.uniqueSubclasses || false

    // Use character's current level
    const currentLevel = character.level

    // Level changes on regeneration: current level - (1d4 - 2)
    const levelRoll = rollD4() - 2
    const newLevel = Math.max(1, currentLevel - levelRoll)
    const level = newLevel

    // Update character's level if it changed
    if (level !== currentLevel) {
      await prisma.character.update({
        where: { id: character.id },
        data: { level },
      })
    }

    // Get the current active life for this character to mark it inactive
    const currentLife = await prisma.life.findFirst({
      where: {
        characterId: character.id,
        isActive: true,
      },
    })

    if (currentLife) {
      await prisma.life.update({
        where: { id: currentLife.id },
        data: { isActive: false },
      })
    }

    // Get the next life number for THIS character
    const lastLife = await prisma.life.findFirst({
      where: { characterId: character.id },
      orderBy: { lifeNumber: 'desc' },
    })
    const newLifeNumber = (lastLife?.lifeNumber || 0) + 1

    // Get previously used subclasses for THIS character if unique mode is enabled
    let excludedSubclasses: string[] = []
    if (uniqueSubclasses) {
      const pastLives = await prisma.life.findMany({
        where: { characterId: character.id },
        select: { subclass: true },
      })
      excludedSubclasses = pastLives.map(life => life.subclass)
    }

    // Generate new character details
    const name = character.name  // Use the character's name
    const race = randomRace()
    const { className, subclass } = randomClass(excludedSubclasses)

    // Get a random quirk from the database (active quirks only)
    const activeQuirks = await prisma.quirk.findMany({
      where: { isActive: true },
    })

    let effect: string
    if (activeQuirks.length > 0) {
      const randomQuirk = randomFromArray(activeQuirks)
      effect = `${randomQuirk.name}: ${randomQuirk.description}`
    } else {
      // Fallback if no quirks in database
      effect = 'No quirk this regeneration.'
    }

    // Get subclass decision if applicable (totem animal, draconic ancestor, etc.)
    const subclassChoice = getSubclassDecision(className, subclass)

    // Select skill proficiencies based on class
    const skillProficiencies = selectSkillProficiencies(className)

    // Get base stats from class priority and apply racial bonuses
    const classStats = mapStatsForClass(className)
    const racialBonuses = await getRacialBonuses(race)
    const baseStats = applyRacialBonuses(classStats, racialBonuses)

    // Apply ASIs based on level (stats with ASI applied)
    const stats = applyASIs(baseStats, className, level)

    const conMod = getStatModifier(stats.con)
    const maxHp = calculateMaxHp(className, level, conMod)

    // Generate story with Bedrock
    const story = await generateStory(
      name,
      race,
      className,
      subclass,
      effect,
      newLifeNumber,
      currentLife ? {
        name: currentLife.name,
        race: currentLife.race,
        class: currentLife.class,
        subclass: currentLife.subclass,
      } : null,
      subclassChoice
    )

    // Create new life associated with this character
    const newLife = await prisma.life.create({
      data: {
        characterId: character.id,
        lifeNumber: newLifeNumber,
        name,
        race,
        class: className,
        subclass,
        level,
        stats: stats as unknown as Record<string, number>,
        baseStats: baseStats as unknown as Record<string, number>,
        currentHp: maxHp,
        maxHp,
        effect,
        story,
        skillProficiencies,
        subclassChoice,
        isActive: true,
      },
    })

    return NextResponse.json(newLife)
  } catch (error) {
    console.error('Regeneration error:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate' },
      { status: 500 }
    )
  }
}
