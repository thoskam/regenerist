import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getHydratedClassInfo,
  getHydratedSubclassInfo,
  getHydratedRaceInfo,
  getSpellsForClass,
  getSpellcastingAbility,
  getCasterType,
  loadSpells,
} from '@/lib/dndApi'
import type { HydratedCharacterData, Spellbook, HydratedSpellbook, HydratedSpell } from '@/lib/types/5etools'
import {
  formatCastingTime,
  formatSpellRange,
  formatSpellComponents,
  formatSpellDuration,
  getSpellSchool,
  entriesToText,
} from '@/lib/entryParser'

/**
 * Hydrate a spellbook with full spell data
 */
async function hydrateSpellbook(spellbook: Spellbook): Promise<HydratedSpellbook> {
  const allSpells = await loadSpells()

  const hydratedSpells: HydratedSpell[] = spellbook.spellNames
    .map((name) => {
      const spell = allSpells.find(
        (s) => s.name.toLowerCase() === name.toLowerCase()
      )
      if (!spell) return null

      return {
        name: spell.name,
        level: spell.level,
        school: getSpellSchool(spell.school),
        castingTime: formatCastingTime(spell.time),
        range: formatSpellRange(spell.range),
        components: formatSpellComponents(spell.components),
        duration: formatSpellDuration(spell.duration),
        description: entriesToText(spell.entries),
      }
    })
    .filter((spell): spell is HydratedSpell => spell !== null)

  return {
    spells: hydratedSpells,
    archivistNote: spellbook.archivistNote,
  }
}

function getMaxSpellLevel(
  casterType: 'full' | 'half' | 'third' | 'pact' | null,
  level: number
): number {
  if (!casterType) return 0

  switch (casterType) {
    case 'full':
      if (level >= 17) return 9
      if (level >= 15) return 8
      if (level >= 13) return 7
      if (level >= 11) return 6
      if (level >= 9) return 5
      if (level >= 7) return 4
      if (level >= 5) return 3
      if (level >= 3) return 2
      return 1

    case 'half':
      if (level < 2) return 0
      if (level >= 17) return 5
      if (level >= 13) return 4
      if (level >= 9) return 3
      if (level >= 5) return 2
      return 1

    case 'third':
      if (level < 3) return 0
      if (level >= 19) return 4
      if (level >= 13) return 3
      if (level >= 7) return 2
      return 1

    case 'pact':
      if (level >= 9) return 5
      if (level >= 7) return 4
      if (level >= 5) return 3
      if (level >= 3) return 2
      return 1

    default:
      return 0
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  try {
    // Get character with active life
    const character = await prisma.character.findUnique({
      where: { slug },
      include: {
        lives: {
          where: { isActive: true },
          take: 1,
        },
      },
    })

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    const activeLife = character.lives[0]
    if (!activeLife) {
      return NextResponse.json({ error: 'No active life found' }, { status: 404 })
    }

    const { class: className, subclass: subclassName, race: raceName, level } = activeLife

    // Fetch all data in parallel
    const [classInfo, subclassInfo, raceInfo, spellcastingAbility] = await Promise.all([
      getHydratedClassInfo(className, level),
      getHydratedSubclassInfo(className, subclassName, level),
      getHydratedRaceInfo(raceName),
      getSpellcastingAbility(className, subclassName),
    ])

    // Get spells if character is a spellcaster
    const casterType = getCasterType(className, subclassName)
    const isSpellcaster = casterType !== null
    const maxSpellLevel = getMaxSpellLevel(casterType, level)

    let spells = null
    if (isSpellcaster && maxSpellLevel > 0) {
      spells = await getSpellsForClass(className, subclassName, level)
    }

    // Hydrate spellbook if character has one
    let selectedSpellbook: HydratedSpellbook | null = null
    if (activeLife.spellbook) {
      selectedSpellbook = await hydrateSpellbook(activeLife.spellbook as unknown as Spellbook)
    }

    // Get saving throw proficiencies - use stored values, or fall back to class defaults
    const savingThrowProficiencies = activeLife.savingThrowProficiencies?.length > 0
      ? activeLife.savingThrowProficiencies
      : classInfo?.savingThrows || []

    const result: HydratedCharacterData = {
      classInfo: classInfo || {
        name: className,
        hitDie: 8,
        savingThrows: [],
        armorProficiencies: [],
        weaponProficiencies: [],
        features: [],
      },
      subclassInfo,
      raceInfo,
      spells,
      selectedSpellbook,
      isSpellcaster,
      spellcastingAbility,
      maxSpellLevel: isSpellcaster ? maxSpellLevel : null,
      savingThrowProficiencies,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error hydrating character:', error)
    return NextResponse.json(
      { error: 'Failed to hydrate character data' },
      { status: 500 }
    )
  }
}
