import { getSpellSelectionLimits } from '@/lib/spellSlots'
import { legacyGuard } from '@/lib/legacyGuard'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomClass, randomRace, randomFromArray } from '@/lib/randomizer'
import { mapStatsForClass, getStatModifier } from '@/lib/statMapper'
import { calculateMaxHp } from '@/lib/calculations'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { getSubclassDecision } from '@/lib/subclassDecisions'
import { applyASIs } from '@/lib/asiCalculator'
import { selectSkillProficiencies } from '@/lib/proficiencyEngine'
import { getSpellSlotInfo, getSpellcastingAbilityForClass } from '@/lib/spellSlots'
import { generateSmartSpellbook } from '@/lib/spellbookGenerator'
import { getAvailableSpellNames, getCasterType, getRacialAbilityBonuses, getSubclassSpellGrants } from '@/lib/dndApi'

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

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
  { params }: { params: Promise<{ slug: string }> }
) {
  const denied = await legacyGuard()
  if (denied) return denied
  const routeParams = await params
  try {
    // Find the character by slug
    const character = await prisma.character.findUnique({
      where: { slug: routeParams.slug },
    })

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    if (!character.isRegenerist) return NextResponse.json({ error: 'Static characters cannot regenerate' }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    if (!body || typeof body !== 'object' || Array.isArray(body) || (body.uniqueSubclasses !== undefined && typeof body.uniqueSubclasses !== 'boolean')) return NextResponse.json({ error: 'Invalid regeneration options' }, { status: 400 })
    const uniqueSubclasses = body.uniqueSubclasses || false

    // Use character's current level
    const currentLevel = character.level

    // Level changes on regeneration: current level - (1d4 - 2)
    const levelRoll = rollD4() - 2
    const newLevel = Math.max(1, Math.min(20, currentLevel - levelRoll))
    const level = newLevel

    // Get the current active life for this character to mark it inactive
    const currentLife = await prisma.life.findFirst({
      where: {
        characterId: character.id,
        isActive: true,
      },
    })

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
    const racialBonuses = await getRacialAbilityBonuses(race, className)
    const baseStats = { ...classStats }
    for (const key of Object.keys(baseStats) as (keyof typeof baseStats)[]) baseStats[key] += racialBonuses[key] || 0

    // Apply ASIs based on level (stats with ASI applied)
    const stats = applyASIs(baseStats, className, level)

    const conMod = getStatModifier(stats.con)
    const maxHp = calculateMaxHp(className, level, conMod, { race, subclass })

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

    // Generate spellbook for spellcasters
    let spellbook = null
    const casterType = getCasterType(className, subclass)

    if (casterType) {
      const spellAbility = getSpellcastingAbilityForClass(className, subclass)
      const spellMod = spellAbility ? getStatModifier(stats[spellAbility as keyof typeof stats]) : 0
      const slotInfo = getSpellSlotInfo(className, subclass, level, spellMod)

      if (slotInfo.maxSpellLevel > 0 || slotInfo.cantripsKnown > 0) {
        const available = await getAvailableSpellNames(className, subclass, level, subclassChoice || undefined)
        const grants = await getSubclassSpellGrants(className, subclass, level, subclassChoice || undefined)
        const fixedSpells = [...grants.prepared, ...grants.known]
        available.spells = available.spells.filter(name => !fixedSpells.includes(name))
        available.cantrips = available.cantrips.filter(name => !fixedSpells.includes(name))
        const selectionLimits = getSpellSelectionLimits(className, subclass, level, spellMod)
        const spellCount = slotInfo.spellsKnown ?? slotInfo.spellsPrepared ?? 0

        spellbook = await generateSmartSpellbook(
          race,
          className,
          subclass,
          level,
          available.cantrips,
          available.spells,
          selectionLimits.cantrips,
          spellCount
        )
      }
    }

    // Create new life associated with this character
    const newLife = await prisma.$transaction(async tx => {
      // Compare the snapshot after generation; a concurrent edit/regeneration must win intact.
      const updated = await tx.character.updateMany({
        where: { id: character.id, updatedAt: character.updatedAt },
        data: { level, updatedAt: new Date() },
      })
      if (updated.count !== 1) throw new Error('REGENERATION_CONFLICT')
      const latest = await tx.life.findFirst({ where: { characterId: character.id }, orderBy: { lifeNumber: 'desc' } })
      if ((latest?.lifeNumber || 0) + 1 !== newLifeNumber) throw new Error('REGENERATION_CONFLICT')
      await tx.life.updateMany({ where: { characterId: character.id, isActive: true }, data: { isActive: false } })
      return tx.life.create({
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
        ...(spellbook && { spellbook: spellbook as { spellNames: string[]; archivistNote: string } }),
        isActive: true,
      },
    })

    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    return NextResponse.json(newLife)
  } catch (error) {
    if ((error instanceof Error && error.message === 'REGENERATION_CONFLICT') || (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code))) return NextResponse.json({ error: 'Character changed during regeneration. Please try again.' }, { status: 409 })
    console.error('Regeneration error:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate' },
      { status: 500 }
    )
  }
}
