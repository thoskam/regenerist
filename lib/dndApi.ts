import fs from 'fs'
import path from 'path'
import type {
  ClassFileData,
  ClassData,
  ClassFeature,
  SubclassData,
  SubclassFeature,
  RaceFileData,
  RaceData,
  SkillFileData,
  SkillData,
  SpellFileData,
  SpellData,
  HydratedClassInfo,
  HydratedSubclassInfo,
  HydratedRaceInfo,
  HydratedSpell,
  VALID_CLASSES,
} from './types/5etools'
import {
  entriesToText,
  parseFeatureRef,
  parseSubclassFeatureRef,
  normalizeName,
  matchSubclassName,
  formatCastingTime,
  formatSpellRange,
  formatSpellComponents,
  formatSpellDuration,
  getSpellSchool,
} from './entryParser'

// File caches (module-level, persist across requests)
const classFileCache = new Map<string, ClassFileData>()
let skillsCache: SkillFileData | null = null
let racesCache: RaceFileData | null = null
let spellsCache: SpellData[] | null = null

const DATA_DIR = path.join(process.cwd(), 'data')

// Valid class names for path sanitization
const VALID_CLASS_NAMES = [
  'artificer',
  'barbarian',
  'bard',
  'cleric',
  'druid',
  'fighter',
  'monk',
  'paladin',
  'ranger',
  'rogue',
  'sorcerer',
  'warlock',
  'wizard',
] as const

/**
 * Load and cache a class file
 */
export async function loadClassFile(className: string): Promise<ClassFileData | null> {
  const normalizedName = className.toLowerCase()

  // Security: validate class name before constructing path
  if (!VALID_CLASS_NAMES.includes(normalizedName as (typeof VALID_CLASS_NAMES)[number])) {
    console.error(`Invalid class name: ${className}`)
    return null
  }

  if (classFileCache.has(normalizedName)) {
    return classFileCache.get(normalizedName)!
  }

  const filePath = path.join(DATA_DIR, 'class', `class-${normalizedName}.json`)

  try {
    const content = await fs.promises.readFile(filePath, 'utf-8')
    const data = JSON.parse(content) as ClassFileData
    classFileCache.set(normalizedName, data)
    return data
  } catch (error) {
    console.error(`Failed to load class file for ${className}:`, error)
    return null
  }
}

/**
 * Get base class data
 */
export async function getClassData(className: string): Promise<ClassData | null> {
  const fileData = await loadClassFile(className)
  if (!fileData) return null

  const classData = fileData.class.find(
    (c) => normalizeName(c.name) === normalizeName(className)
  )
  return classData || null
}

/**
 * Get all subclasses for a class
 */
export async function getSubclasses(className: string): Promise<SubclassData[]> {
  const fileData = await loadClassFile(className)
  if (!fileData) return []
  return fileData.subclass
}

/**
 * Get a specific subclass
 */
export async function getSubclass(className: string, subclassName: string): Promise<SubclassData | null> {
  const subclasses = await getSubclasses(className)
  return subclasses.find(
    (sc) => matchSubclassName(subclassName, sc.name, sc.shortName)
  ) || null
}

/**
 * Get class features up to a certain level
 */
export async function getClassFeatures(className: string, level: number): Promise<ClassFeature[]> {
  const fileData = await loadClassFile(className)
  if (!fileData) return []

  return fileData.classFeature.filter(
    (f) =>
      normalizeName(f.className) === normalizeName(className) &&
      f.level <= level
  )
}

/**
 * Get subclass features up to a certain level
 */
export async function getSubclassFeatures(
  className: string,
  subclassName: string,
  level: number
): Promise<SubclassFeature[]> {
  const fileData = await loadClassFile(className)
  if (!fileData) return []

  const subclass = await getSubclass(className, subclassName)
  if (!subclass) return []

  return fileData.subclassFeature.filter(
    (f) =>
      normalizeName(f.className) === normalizeName(className) &&
      normalizeName(f.subclassShortName) === normalizeName(subclass.shortName) &&
      f.level <= level
  )
}

/**
 * Load and cache skills data
 */
export async function loadSkills(): Promise<SkillFileData | null> {
  if (skillsCache) return skillsCache

  const filePath = path.join(DATA_DIR, 'skills.json')

  try {
    const content = await fs.promises.readFile(filePath, 'utf-8')
    skillsCache = JSON.parse(content) as SkillFileData
    return skillsCache
  } catch (error) {
    console.error('Failed to load skills:', error)
    return null
  }
}

/**
 * Get skill data by name
 */
export async function getSkillData(skillName: string): Promise<SkillData | null> {
  const skills = await loadSkills()
  if (!skills) return null

  return skills.skill.find(
    (s) => normalizeName(s.name) === normalizeName(skillName)
  ) || null
}

/**
 * Load and cache races data
 */
export async function loadRaces(): Promise<RaceFileData | null> {
  if (racesCache) return racesCache

  const filePath = path.join(DATA_DIR, 'races.json')

  try {
    const content = await fs.promises.readFile(filePath, 'utf-8')
    racesCache = JSON.parse(content) as RaceFileData
    return racesCache
  } catch (error) {
    console.error('Failed to load races:', error)
    return null
  }
}

/**
 * Get race data by name - prefer PHB/basic rules sources
 * Handles formats like "Dwarf (Hill)" by trying exact match first, then base race
 */
export async function getRaceData(raceName: string): Promise<RaceData | null> {
  const races = await loadRaces()
  if (!races) return null

  const normalized = normalizeName(raceName)

  // First try to find PHB or basic rules version with exact match
  const preferredSources = ['PHB', 'MPMM', 'EEPC', 'VGM', 'XGE']
  for (const source of preferredSources) {
    const race = races.race.find(
      (r) => normalizeName(r.name) === normalized && r.source === source
    )
    if (race) return race
  }

  // Try any source with exact match
  const exactMatch = races.race.find((r) => normalizeName(r.name) === normalized)
  if (exactMatch) return exactMatch

  // If name contains parentheses like "Dwarf (Hill)", try base race name
  const parenMatch = raceName.match(/^(.+?)\s*\(/)
  if (parenMatch) {
    const baseRaceName = normalizeName(parenMatch[1])
    for (const source of preferredSources) {
      const race = races.race.find(
        (r) => normalizeName(r.name) === baseRaceName && r.source === source
      )
      if (race) return race
    }
    // Fall back to any source for base race
    return races.race.find((r) => normalizeName(r.name) === baseRaceName) || null
  }

  return null
}

/**
 * Load and cache all spells
 */
export async function loadSpells(): Promise<SpellData[]> {
  if (spellsCache) return spellsCache

  const spellsDir = path.join(DATA_DIR, 'spells')
  const allSpells: SpellData[] = []

  try {
    const files = await fs.promises.readdir(spellsDir)
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.promises.readFile(path.join(spellsDir, file), 'utf-8')
        const data = JSON.parse(content) as SpellFileData
        allSpells.push(...data.spell)
      }
    }
    spellsCache = allSpells
    return spellsCache
  } catch (error) {
    console.error('Failed to load spells:', error)
    return []
  }
}

/**
 * Determine max spell level based on caster type and level
 */
function getMaxSpellLevel(
  casterType: 'full' | 'half' | 'third' | 'pact' | null,
  level: number
): number {
  if (!casterType) return 0

  switch (casterType) {
    case 'full':
      // Full casters get spell levels at: 1->1st, 3->2nd, 5->3rd, 7->4th, 9->5th, 11->6th, 13->7th, 15->8th, 17->9th
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
      // Half casters get spell levels at: 2->1st, 5->2nd, 9->3rd, 13->4th, 17->5th
      if (level < 2) return 0
      if (level >= 17) return 5
      if (level >= 13) return 4
      if (level >= 9) return 3
      if (level >= 5) return 2
      return 1

    case 'third':
      // Third casters get spell levels at: 3->1st, 7->2nd, 13->3rd, 19->4th
      if (level < 3) return 0
      if (level >= 19) return 4
      if (level >= 13) return 3
      if (level >= 7) return 2
      return 1

    case 'pact':
      // Warlock pact magic: 1->1st, 3->2nd, 5->3rd, 7->4th, 9->5th (stays at 5th)
      if (level >= 9) return 5
      if (level >= 7) return 4
      if (level >= 5) return 3
      if (level >= 3) return 2
      return 1

    default:
      return 0
  }
}

/**
 * Determine caster type for a class/subclass combination
 */
export function getCasterType(
  className: string,
  subclassName: string
): 'full' | 'half' | 'third' | 'pact' | null {
  const fullCasters = ['bard', 'cleric', 'druid', 'sorcerer', 'wizard']
  const halfCasters = ['paladin', 'ranger', 'artificer']
  const thirdCasterSubclasses: Record<string, string[]> = {
    fighter: ['eldritch knight'],
    rogue: ['arcane trickster'],
  }

  const normalizedClass = normalizeName(className)
  const normalizedSubclass = normalizeName(subclassName)

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

// Basic class spell schools - used to filter spells by class theme
// This is a simplified approach since 5eTools data doesn't include class spell lists
const CLASS_SPELL_SCHOOLS: Record<string, string[]> = {
  wizard: ['A', 'C', 'D', 'E', 'V', 'I', 'N', 'T'], // All schools
  sorcerer: ['A', 'C', 'D', 'E', 'V', 'I', 'N', 'T'], // All schools
  warlock: ['C', 'D', 'E', 'V', 'I', 'N'], // No abjuration/transmutation focus
  cleric: ['A', 'C', 'D', 'E', 'V', 'N'], // Divine magic
  druid: ['C', 'D', 'E', 'V', 'N', 'T'], // Nature magic
  bard: ['D', 'E', 'I', 'T'], // Enchantment/Illusion focus
  paladin: ['A', 'C', 'D', 'E', 'V'], // Divine smite magic
  ranger: ['A', 'C', 'D', 'V', 'T'], // Nature/hunting magic
  artificer: ['A', 'C', 'D', 'T'], // Item/construct magic
}

/**
 * Get spells available to a class/subclass at a given level
 */
export async function getSpellsForClass(
  className: string,
  subclassName: string,
  level: number
): Promise<HydratedSpell[]> {
  const casterType = getCasterType(className, subclassName)
  if (!casterType) return []

  const maxSpellLevel = getMaxSpellLevel(casterType, level)
  if (maxSpellLevel === 0) return []

  const allSpells = await loadSpells()
  const normalizedClass = normalizeName(className)

  // Get allowed schools for this class (or all schools if not defined)
  const allowedSchools = CLASS_SPELL_SCHOOLS[normalizedClass] || ['A', 'C', 'D', 'E', 'V', 'I', 'N', 'T']

  // Filter spells by level and school
  const classSpells = allSpells.filter((spell) => {
    if (spell.level > maxSpellLevel) return false
    // Only include spells from PHB for now (to keep list manageable)
    if (spell.source !== 'PHB') return false
    // Filter by class-appropriate schools
    if (!allowedSchools.includes(spell.school)) return false
    return true
  })

  // Convert to hydrated format
  return classSpells.map((spell) => ({
    name: spell.name,
    level: spell.level,
    school: getSpellSchool(spell.school),
    castingTime: formatCastingTime(spell.time),
    range: formatSpellRange(spell.range),
    components: formatSpellComponents(spell.components),
    duration: formatSpellDuration(spell.duration),
    description: entriesToText(spell.entries),
  }))
}

/**
 * Get hydrated class info for display
 */
export async function getHydratedClassInfo(
  className: string,
  level: number
): Promise<HydratedClassInfo | null> {
  const classData = await getClassData(className)
  if (!classData) return null

  const features = await getClassFeatures(className, level)

  return {
    name: classData.name,
    hitDie: classData.hd.faces,
    savingThrows: classData.proficiency,
    armorProficiencies: classData.startingProficiencies.armor || [],
    weaponProficiencies: classData.startingProficiencies.weapons || [],
    features: features
      .filter((f) => !f.isClassFeatureVariant) // Exclude optional variants
      .map((f) => ({
        name: f.name,
        level: f.level,
        description: entriesToText(f.entries),
      })),
  }
}

/**
 * Get hydrated subclass info for display
 */
export async function getHydratedSubclassInfo(
  className: string,
  subclassName: string,
  level: number
): Promise<HydratedSubclassInfo | null> {
  const subclass = await getSubclass(className, subclassName)
  if (!subclass) return null

  const features = await getSubclassFeatures(className, subclassName, level)

  return {
    name: subclass.name,
    shortName: subclass.shortName,
    features: features.map((f) => ({
      name: f.name,
      level: f.level,
      description: entriesToText(f.entries),
    })),
  }
}

/**
 * Get hydrated race info for display
 */
export async function getHydratedRaceInfo(raceName: string): Promise<HydratedRaceInfo | null> {
  const race = await getRaceData(raceName)
  if (!race) return null

  // Extract traits from entries
  const traits: { name: string; description: string }[] = []
  for (const entry of race.entries) {
    if (typeof entry === 'object' && 'type' in entry && entry.type === 'entries' && entry.name) {
      traits.push({
        name: entry.name,
        description: entriesToText(entry.entries),
      })
    }
  }

  // Determine size string
  const sizeMap: Record<string, string> = {
    S: 'Small',
    M: 'Medium',
    L: 'Large',
    T: 'Tiny',
    H: 'Huge',
    G: 'Gargantuan',
  }
  const size = race.size.map((s) => sizeMap[s] || s).join(' or ')

  return {
    name: race.name,
    size,
    speed: race.speed,
    traits,
  }
}

/**
 * Get available spell names only (for Bedrock prompt)
 * Returns separate arrays for cantrips and leveled spells
 */
export async function getAvailableSpellNames(
  className: string,
  subclassName: string,
  level: number
): Promise<{ cantrips: string[]; spells: string[] }> {
  const casterType = getCasterType(className, subclassName)
  if (!casterType) return { cantrips: [], spells: [] }

  const maxSpellLevel = getMaxSpellLevelInternal(casterType, level)
  if (maxSpellLevel === 0 && casterType !== 'full') {
    // Non-casters or casters below spell-granting level
    return { cantrips: [], spells: [] }
  }

  const allSpells = await loadSpells()
  const normalizedClass = normalizeName(className)

  // Get allowed schools for this class (or all schools if not defined)
  const allowedSchools = CLASS_SPELL_SCHOOLS[normalizedClass] || ['A', 'C', 'D', 'E', 'V', 'I', 'N', 'T']

  const cantrips: string[] = []
  const spells: string[] = []

  for (const spell of allSpells) {
    // Only include spells from PHB for now
    if (spell.source !== 'PHB') continue
    // Filter by class-appropriate schools
    if (!allowedSchools.includes(spell.school)) continue

    if (spell.level === 0) {
      cantrips.push(spell.name)
    } else if (spell.level <= maxSpellLevel) {
      spells.push(spell.name)
    }
  }

  return { cantrips, spells }
}

// Internal helper for max spell level (to avoid duplicating logic)
function getMaxSpellLevelInternal(
  casterType: 'full' | 'half' | 'third' | 'pact',
  level: number
): number {
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
  }
}

/**
 * Get spellcasting ability for a class/subclass
 */
export async function getSpellcastingAbility(
  className: string,
  subclassName: string
): Promise<string | null> {
  const casterType = getCasterType(className, subclassName)
  if (!casterType) return null

  // Standard spellcasting abilities by class
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
  }

  const normalizedClass = normalizeName(className)
  if (abilities[normalizedClass]) {
    return abilities[normalizedClass]
  }

  // Check subclass for third casters
  const subclass = await getSubclass(className, subclassName)
  if (subclass?.spellcastingAbility) {
    return subclass.spellcastingAbility
  }

  return null
}
