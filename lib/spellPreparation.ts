/**
 * Spell preparation utilities for D&D 5e prepared casters
 */

import subclassSpellsData from '@/lib/data/subclassSpells.json'

type SubclassSpellEntry = Record<string, string[] | string>
type SubclassSpellsData = Record<string, Record<string, SubclassSpellEntry>>

const subclassSpells = subclassSpellsData as unknown as SubclassSpellsData

/**
 * Check if a class is a prepared caster (prepares spells daily from a larger list)
 */
export function isPreparedCaster(className: string): boolean {
  const preparedCasters = ['cleric', 'druid', 'paladin', 'wizard', 'artificer']
  return preparedCasters.includes(className.toLowerCase())
}

/**
 * Get the spellcasting ability modifier name for preparation calculation
 */
export function getPreparationAbility(className: string): string | null {
  const abilities: Record<string, string> = {
    cleric: 'wis',
    druid: 'wis',
    paladin: 'cha',
    wizard: 'int',
    artificer: 'int',
  }
  return abilities[className.toLowerCase()] || null
}

/**
 * Calculate max prepared spells for a prepared caster
 *
 * Cleric/Druid/Wizard: level + ability modifier (minimum 1)
 * Paladin/Artificer: half level (rounded down) + ability modifier (minimum 1)
 */
export function calculateMaxPreparedSpells(
  className: string,
  level: number,
  abilityModifier: number
): number {
  const normalizedClass = className.toLowerCase()

  if (!isPreparedCaster(normalizedClass)) {
    return 0
  }

  // Half casters use half level
  const isHalfCaster = ['paladin', 'artificer'].includes(normalizedClass)
  const effectiveLevel = isHalfCaster ? Math.floor(level / 2) : level

  return Math.max(1, effectiveLevel + abilityModifier)
}

/**
 * Get always-prepared spells for a subclass at a given level
 * These are domain spells (Cleric), oath spells (Paladin), circle spells (Druid), etc.
 */
export function getAlwaysPreparedSpells(
  className: string,
  subclassName: string,
  level: number
): string[] {
  // Normalize class name to title case for lookup
  const normalizedClass = className.charAt(0).toUpperCase() + className.slice(1).toLowerCase()

  const classData = subclassSpells[normalizedClass]
  if (!classData) {
    return []
  }

  // Try to find the subclass (case-insensitive partial match)
  const normalizedSubclass = subclassName.toLowerCase()
  const subclassKey = Object.keys(classData).find(key =>
    key.toLowerCase() === normalizedSubclass ||
    key.toLowerCase().includes(normalizedSubclass) ||
    normalizedSubclass.includes(key.toLowerCase())
  )

  if (!subclassKey) {
    return []
  }

  const subclassData = classData[subclassKey]
  if (!subclassData || typeof subclassData !== 'object') {
    return []
  }

  // Collect all spells at or below the character's level
  const spells: string[] = []

  for (const [spellLevel, spellList] of Object.entries(subclassData)) {
    // Skip metadata fields like "_note"
    if (spellLevel.startsWith('_')) continue

    const levelNum = parseInt(spellLevel, 10)
    if (!isNaN(levelNum) && level >= levelNum && Array.isArray(spellList)) {
      spells.push(...spellList)
    }
  }

  // Remove duplicates
  return Array.from(new Set(spells))
}

/**
 * Interface for preparation info returned to components
 */
export interface PreparationInfo {
  isPreparedCaster: boolean
  maxPreparedSpells: number
  currentPreparedCount: number
  alwaysPreparedSpells: string[]
  preparationAbility: string | null
  canPrepareFrom: 'spellbook' | 'classList' | null
}

/**
 * Get full preparation info for a character
 */
export function getPreparationInfo(
  className: string,
  subclassName: string,
  level: number,
  abilityModifier: number,
  currentPreparedSpells: string[] = []
): PreparationInfo {
  const normalizedClass = className.toLowerCase()
  const prepared = isPreparedCaster(normalizedClass)

  if (!prepared) {
    return {
      isPreparedCaster: false,
      maxPreparedSpells: 0,
      currentPreparedCount: 0,
      alwaysPreparedSpells: [],
      preparationAbility: null,
      canPrepareFrom: null,
    }
  }

  const maxPrepared = calculateMaxPreparedSpells(className, level, abilityModifier)
  const alwaysPrepared = getAlwaysPreparedSpells(className, subclassName, level)

  return {
    isPreparedCaster: true,
    maxPreparedSpells: maxPrepared,
    currentPreparedCount: currentPreparedSpells.length,
    alwaysPreparedSpells: alwaysPrepared,
    preparationAbility: getPreparationAbility(className),
    // Wizards prepare from their spellbook, others from class list
    canPrepareFrom: normalizedClass === 'wizard' ? 'spellbook' : 'classList',
  }
}

/**
 * Validate that a spell preparation is valid
 * Returns true if the spell can be prepared, false otherwise
 */
export function canPrepareSpell(
  spellName: string,
  spellLevel: number,
  maxSpellLevel: number,
  alwaysPreparedSpells: string[]
): boolean {
  // Can't prepare spells above max level
  if (spellLevel > maxSpellLevel) {
    return false
  }

  // Can't manually prepare always-prepared spells (they're auto-prepared)
  if (alwaysPreparedSpells.includes(spellName)) {
    return false
  }

  // Cantrips are always known, not prepared
  if (spellLevel === 0) {
    return false
  }

  return true
}
