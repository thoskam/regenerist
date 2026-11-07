import { getSpellSlotInfo } from '@/lib/spellSlots'
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

  const names = Array.isArray(spellbook.spellNames) ? spellbook.spellNames.filter((name): name is string => typeof name === 'string') : []
  const hydratedSpells: HydratedSpell[] = names
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const requestedLifeId = request.nextUrl.searchParams.get('lifeId')
  if (requestedLifeId !== null && (!/^\d+$/.test(requestedLifeId) || Number(requestedLifeId) < 1 || !Number.isSafeInteger(Number(requestedLifeId)))) {
    return NextResponse.json({ error: 'Invalid life ID' }, { status: 400 })
  }

  try {
    // Get character with active life
    const character = await prisma.character.findUnique({
      where: { slug },
      include: {
        lives: {
          where: requestedLifeId ? { id: Number(requestedLifeId) } : { isActive: true },
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
    const maxSpellLevel = getSpellSlotInfo(className, subclassName, level, 0).maxSpellLevel
    const isSpellcaster = casterType !== null && maxSpellLevel > 0

    let spells = null
    if (isSpellcaster && maxSpellLevel > 0) {
      spells = await getSpellsForClass(className, subclassName, level, activeLife.subclassChoice)
    }

    // Hydrate spellbook if character has one
    let selectedSpellbook: HydratedSpellbook | null = null
    if (activeLife.spellbook) {
      selectedSpellbook = await hydrateSpellbook(activeLife.spellbook as unknown as Spellbook)
    }

    // Domain/oath/origin spells are granted independently of the editable selection.
    const grantedSpells = (spells || []).filter(spell => spell.grantedBySubclass)
    if (grantedSpells.length) {
      const selected = selectedSpellbook?.spells || []
      selectedSpellbook = { spells: [...selected.filter(spell => !grantedSpells.some(grant => grant.name === spell.name)), ...grantedSpells], archivistNote: selectedSpellbook?.archivistNote || '' }
    }

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
