/**
 * Spell slot calculator for D&D 5e
 * Calculates cantrips known, spells known/prepared, and max spell level
 */

export interface SpellSlotInfo {
  cantripsKnown: number
  spellsKnown: number | null      // Bard, Sorcerer, Ranger, Warlock
  spellsPrepared: number | null   // Cleric, Druid, Paladin, Wizard
  maxSpellLevel: number
}

// Cantrip progression tables by class
const CANTRIP_PROGRESSION: Record<string, number[]> = {
  // index = level - 1, value = cantrips known
  bard: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  cleric: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  druid: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  sorcerer: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  warlock: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  wizard: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  artificer: [2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4],
}

// Third-caster cantrip progression (Eldritch Knight, Arcane Trickster)
const THIRD_CASTER_CANTRIPS = [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4]

// Spells known progression for known-spell casters
const SPELLS_KNOWN_PROGRESSION: Record<string, number[]> = {
  // Bard: starts at level 1
  bard: [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22],
  // Sorcerer: starts at level 1
  sorcerer: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15],
  // Ranger: starts at level 2
  ranger: [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11],
  // Warlock: starts at level 1 (Pact Magic)
  warlock: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
}

// Third-caster spells known (Eldritch Knight, Arcane Trickster)
const THIRD_CASTER_SPELLS_KNOWN = [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13]

/**
 * Get max spell level based on caster type and character level
 */
function getMaxSpellLevel(
  casterType: 'full' | 'half' | 'third' | 'pact',
  level: number
): number {
  switch (casterType) {
    case 'full':
      // Full casters: 1->1st, 3->2nd, 5->3rd, 7->4th, 9->5th, 11->6th, 13->7th, 15->8th, 17->9th
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
      // Half casters: 2->1st, 5->2nd, 9->3rd, 13->4th, 17->5th
      if (level < 2) return 0
      if (level >= 17) return 5
      if (level >= 13) return 4
      if (level >= 9) return 3
      if (level >= 5) return 2
      return 1

    case 'third':
      // Third casters: 3->1st, 7->2nd, 13->3rd, 19->4th
      if (level < 3) return 0
      if (level >= 19) return 4
      if (level >= 13) return 3
      if (level >= 7) return 2
      return 1

    case 'pact':
      // Warlock Pact Magic: 1->1st, 3->2nd, 5->3rd, 7->4th, 9->5th (stays at 5th)
      if (level >= 9) return 5
      if (level >= 7) return 4
      if (level >= 5) return 3
      if (level >= 3) return 2
      return 1
  }
}

/**
 * Determine caster type for a class/subclass combination
 */
function getCasterType(
  className: string,
  subclassName: string
): 'full' | 'half' | 'third' | 'pact' | null {
  const normalizedClass = className.toLowerCase()
  const normalizedSubclass = subclassName.toLowerCase()

  const fullCasters = ['bard', 'cleric', 'druid', 'sorcerer', 'wizard']
  const halfCasters = ['paladin', 'ranger', 'artificer']
  const thirdCasterSubclasses: Record<string, string[]> = {
    fighter: ['eldritch knight'],
    rogue: ['arcane trickster'],
  }

  if (normalizedClass === 'warlock') return 'pact'
  if (fullCasters.includes(normalizedClass)) return 'full'
  if (halfCasters.includes(normalizedClass)) return 'half'

  // Check for third-caster subclasses
  const thirdSubclasses = thirdCasterSubclasses[normalizedClass]
  if (thirdSubclasses && thirdSubclasses.includes(normalizedSubclass)) {
    return 'third'
  }

  return null
}

/**
 * Check if a class is a prepared caster (uses level + ability mod instead of spells known)
 */
function isPreparedCaster(className: string): boolean {
  const preparedCasters = ['cleric', 'druid', 'paladin', 'wizard', 'artificer']
  return preparedCasters.includes(className.toLowerCase())
}

/**
 * Calculate spell slot info for a class/subclass at a given level
 */
export function getSpellSlotInfo(
  className: string,
  subclassName: string,
  level: number,
  spellcastingMod: number
): SpellSlotInfo {
  const casterType = getCasterType(className, subclassName)
  const normalizedClass = className.toLowerCase()

  // Non-casters
  if (!casterType) {
    return {
      cantripsKnown: 0,
      spellsKnown: null,
      spellsPrepared: null,
      maxSpellLevel: 0,
    }
  }

  const maxSpellLevel = getMaxSpellLevel(casterType, level)

  // Calculate cantrips known
  let cantripsKnown = 0
  if (casterType === 'third') {
    cantripsKnown = THIRD_CASTER_CANTRIPS[level - 1] || 0
  } else if (CANTRIP_PROGRESSION[normalizedClass]) {
    cantripsKnown = CANTRIP_PROGRESSION[normalizedClass][level - 1] || 0
  }

  // Calculate spells known/prepared
  let spellsKnown: number | null = null
  let spellsPrepared: number | null = null

  if (casterType === 'third') {
    // Third casters use spells known
    spellsKnown = THIRD_CASTER_SPELLS_KNOWN[level - 1] || 0
  } else if (isPreparedCaster(normalizedClass)) {
    // Prepared casters: level + ability mod (minimum 1)
    if (casterType === 'half') {
      // Half casters (Paladin, Artificer): half level (rounded down) + ability mod
      const effectiveLevel = Math.floor(level / 2)
      spellsPrepared = Math.max(1, effectiveLevel + spellcastingMod)
    } else {
      // Full casters (Cleric, Druid, Wizard): level + ability mod
      spellsPrepared = Math.max(1, level + spellcastingMod)
    }
  } else if (SPELLS_KNOWN_PROGRESSION[normalizedClass]) {
    // Known-spell casters: use the progression table
    spellsKnown = SPELLS_KNOWN_PROGRESSION[normalizedClass][level - 1] || 0
  }

  return {
    cantripsKnown,
    spellsKnown,
    spellsPrepared,
    maxSpellLevel,
  }
}

/**
 * Get spellcasting ability for a class
 */
export function getSpellcastingAbilityForClass(
  className: string,
  subclassName: string
): string | null {
  const casterType = getCasterType(className, subclassName)
  if (!casterType) return null

  const abilities: Record<string, string> = {
    bard: 'cha',
    cleric: 'wis',
    druid: 'wis',
    paladin: 'cha',
    ranger: 'wis',
    sorcerer: 'cha',
    warlock: 'cha',
    wizard: 'int',
    artificer: 'int',
    // Third casters
    fighter: 'int', // Eldritch Knight
    rogue: 'int', // Arcane Trickster
  }

  return abilities[className.toLowerCase()] || null
}

// --- Active State: spell slots and pact magic ---

/** Full caster spell slots by level: [level-1] => [slots 1st, 2nd, ..., 9th] */
const FULL_CASTER_SLOTS: number[][] = [
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
]

/** Half caster: spell level 2 = 2 first, 5 = +2 second, etc. Index = (level - 1). */
const HALF_CASTER_SLOTS: number[][] = [
  [], [2], [2], [3, 2], [3, 2], [4, 2, 2], [4, 2, 2], [4, 3, 2, 1], [4, 3, 2, 1], [4, 3, 3, 2, 1],
  [4, 3, 3, 2, 1], [4, 3, 3, 2, 1], [4, 3, 3, 2, 1, 1], [4, 3, 3, 2, 1, 1], [4, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 1, 1, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 2, 2, 1, 1, 1],
]

/** Third caster: level 3 = 2 first, 7 = +2 second, etc. */
const THIRD_CASTER_SLOTS: number[][] = [
  [], [], [2], [2], [2], [3, 2], [3, 2], [4, 2, 2], [4, 2, 2], [4, 3, 2, 1],
  [4, 3, 2, 1], [4, 3, 2, 1], [4, 3, 3, 2, 1], [4, 3, 3, 2, 1], [4, 3, 3, 2, 1], [4, 3, 3, 2, 1], [4, 3, 3, 2, 1, 1],
  [4, 3, 3, 2, 1, 1], [4, 3, 3, 3, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
]

export type SpellSlotsState = Record<string, { used: number; max: number }>

/**
 * Build spell slots object for ActiveState: { "1": { used: 0, max: 4 }, "2": { used: 0, max: 3 }, ... }
 */
export function calculateSpellSlots(
  className: string,
  subclass: string,
  level: number
): SpellSlotsState {
  const casterType = getCasterType(className, subclass)
  if (!casterType || casterType === 'pact') return {}

  const row =
    casterType === 'full'
      ? FULL_CASTER_SLOTS[level - 1]
      : casterType === 'half'
        ? HALF_CASTER_SLOTS[level - 1]
        : THIRD_CASTER_SLOTS[level - 1]

  if (!row || row.length === 0) return {}

  const slots: SpellSlotsState = {}
  row.forEach((max, i) => {
    if (max > 0) slots[String(i + 1)] = { used: 0, max }
  })
  return slots
}

export interface PactMagicState {
  slots: number
  level: number
}

/**
 * Warlock Pact Magic: slots and slot level by warlock level.
 */
export function calculatePactMagic(className: string, level: number): PactMagicState {
  if (className.toLowerCase() !== 'warlock') return { slots: 0, level: 0 }
  const slots = level >= 17 ? 4 : level >= 11 ? 3 : level >= 2 ? 2 : 1
  const slotLevel = level >= 9 ? 5 : level >= 7 ? 4 : level >= 5 ? 3 : level >= 3 ? 2 : 1
  return { slots, level: slotLevel }
}
