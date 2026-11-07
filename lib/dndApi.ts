import { getSpellSlotInfo, getCasterType, getSpellcastingAbilityForClass } from './spellSlots'
export { getCasterType } from './spellSlots'
import spellLists from './data/spellLists2014.json'
import { STAT_PRIORITY, type Stats, type StatName } from './statMapper'
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
  if (className === 'Fighter' && subclassName === 'Purple Dragon Knight') subclassName = 'Purple Dragon Knight (Banneret)'
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

  const classData = await getClassData(className)
  if (!classData) return []
  const refs = classData.classFeatures.map(ref => parseFeatureRef(typeof ref === 'string' ? ref : ref.classFeature))
  return refs.flatMap(ref => {
    if (!ref || ref.level > level) return []
    const feature = fileData.classFeature.find(f => normalizeName(f.name) === normalizeName(ref.name)
      && f.level === ref.level && f.classSource === classData.source)
    return feature ? [feature] : []
  })
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

  const refs = subclass.subclassFeatures.map(ref => typeof ref === 'string' ? ref : ref.subclassFeature)
  const result: SubclassFeature[] = []
  const seen = new Set<string>()
  const visit = (ref: string) => {
    if (seen.has(ref)) return
    seen.add(ref)
    const parsed = parseSubclassFeatureRef(ref)
    if (parsed.level > level) return
    const feature = fileData.subclassFeature.find(f => normalizeName(f.name) === normalizeName(parsed.name)
      && f.level === parsed.level && f.subclassSource === subclass.source
      && normalizeName(f.subclassShortName) === normalizeName(subclass.shortName))
    if (!feature) return
    result.push(feature)
    const nested = (entries: unknown[]) => {
      for (const entry of entries) {
        if (!entry || typeof entry !== 'object') continue
        const value = entry as {type?: string; subclassFeature?: string; entries?: unknown[]}
        if (value.type === 'refSubclassFeature' && value.subclassFeature) visit(value.subclassFeature)
        // Choices are not automatically granted features.
        if (value.entries && value.type !== 'options') nested(value.entries)
      }
    }
    nested(feature.entries)
  }
  refs.forEach(visit)
  return result
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

  const parts = raceName.match(/^(.+?) \((.+)\)$/)
  if (parts) {
    const subraces = (races as RaceFileData & { subrace?: (Partial<RaceData> & {raceName: string; raceSource: string})[] }).subrace || []
    const subrace = subraces.find(r => normalizeName(r.raceName) === normalizeName(parts[1]) && normalizeName(r.name || 'Standard') === normalizeName(parts[2]) && r.raceSource !== 'XPHB')
    if (subrace) {
      const base = races.race.find(r => r.name === subrace.raceName && r.source === subrace.raceSource)
      if (base) return { ...base, ...subrace, name: raceName,
        ability: [{ ...(base.ability?.[0] || {}), ...(subrace.ability?.[0] || {}) }],
        entries: [...(base.entries || []), ...(subrace.entries || [])] } as RaceData
    }
  }
  const normalized = normalizeName(raceName)

  // First try to find PHB or basic rules version with exact match
  const preferredSources = ['PHB', 'EEPC', 'VGM', 'XGE', 'MPMM']
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

// Class membership comes from the official 2014 spell lists, never school theme.
// https://www.dndbeyond.com/sources/dnd/basic-rules-2014/spells
const canonicalSpellName = (name: string) => name.toLowerCase().replace(/[’']/g, "'").trim()
const ARTIFICER_SPELLS = `Acid Splash|Dancing Lights|Fire Bolt|Guidance|Light|Mage Hand|Mending|Message|Poison Spray|Prestidigitation|Ray of Frost|Resistance|Shocking Grasp|Spare the Dying|Thorn Whip|Alarm|Cure Wounds|Detect Magic|Disguise Self|Expeditious Retreat|Faerie Fire|False Life|Feather Fall|Grease|Identify|Jump|Longstrider|Purify Food and Drink|Sanctuary|Aid|Alter Self|Arcane Lock|Blur|Continual Flame|Darkvision|Enhance Ability|Enlarge/Reduce|Heat Metal|Invisibility|Lesser Restoration|Levitate|Magic Mouth|Magic Weapon|Protection from Poison|Rope Trick|See Invisibility|Spider Climb|Web|Blink|Create Food and Water|Dispel Magic|Elemental Weapon|Fly|Glyph of Warding|Haste|Protection from Energy|Revivify|Water Breathing|Water Walk|Arcane Eye|Elemental Bane|Fabricate|Freedom of Movement|Leomund's Secret Chest|Mordenkainen's Faithful Hound|Mordenkainen's Private Sanctum|Otiluke's Resilient Sphere|Stone Shape|Stoneskin|Animate Objects|Bigby's Hand|Creation|Greater Restoration|Skill Empowerment|Transmute Rock|Wall of Stone`.split('|')

export interface SubclassSpellGrants { prepared: string[]; known: string[]; expanded: string[] }
/** Resolve explicit earned grants. Choice expressions and free-cast resources remain manual. */
export async function getSubclassSpellGrants(className: string, subclassName: string, level: number, choice?: string | null): Promise<SubclassSpellGrants> {
  const subclass = await getSubclass(className, subclassName)
  const result: SubclassSpellGrants = { prepared: [], known: [], expanded: [] }
  const allSpells = await loadSpells()
  const maxLevel = getSpellSlotInfo(className, subclassName, level, 0).maxSpellLevel
  type Group = { name?: string; prepared?: Record<string, unknown>; known?: Record<string, unknown>; expanded?: Record<string, unknown> }
  const groups = (subclass?.additionalSpells || []) as Group[]
  for (const group of groups) {
    if (group.name && canonicalSpellName(group.name) !== canonicalSpellName(choice || '')) continue
    for (const kind of ['prepared', 'known', 'expanded'] as const) {
      for (const [threshold, grants] of Object.entries(group[kind] || {})) {
        const available = threshold.startsWith('s') ? Number(threshold.slice(1)) <= maxLevel : Number(threshold) <= level
        if (!available || !Array.isArray(grants)) continue
        for (const grant of grants) {
          if (typeof grant !== 'string') continue
          const [name, source = 'PHB'] = grant.split('#')[0].split('|')
          const spell = allSpells.find(s => canonicalSpellName(s.name) === canonicalSpellName(name) && s.source.toLowerCase() === source.toLowerCase())
          if (spell && !result[kind].includes(spell.name)) result[kind].push(spell.name)
        }
      }
    }
  }
  // Divine Magic expands the cleric list regardless of the affinity choice.
  if (className === 'Sorcerer' && subclassName === 'Divine Soul') {
    const clericNames = new Set(spellLists.cleric.map(canonicalSpellName))
    result.expanded.push(...allSpells.filter(s => s.source === 'PHB' && s.level <= maxLevel && clericNames.has(canonicalSpellName(s.name))).map(s => s.name))
  }
  return result
}

/**
 * Get spells available to a class/subclass at a given level
 */
export async function getSpellsForClass(
  className: string,
  subclassName: string,
  level: number,
  choice?: string | null
): Promise<HydratedSpell[]> {
  const info = getSpellSlotInfo(className, subclassName, level, 0)
  if (info.maxSpellLevel === 0) return []
  const allSpells = await loadSpells()
  const listClass = getCasterType(className, subclassName) === 'third' ? 'wizard' : className.toLowerCase()
  const names = listClass === 'artificer' ? ARTIFICER_SPELLS : (spellLists as Record<string, string[]>)[listClass] || []
  const allowed = new Set(names.map(canonicalSpellName))
  const grants = await getSubclassSpellGrants(className, subclassName, level, choice)
  const granted = new Set([...grants.prepared, ...grants.known, ...grants.expanded].map(canonicalSpellName))
  const classSpells = allSpells.filter(spell => spell.level <= info.maxSpellLevel
    && ((spell.source === 'PHB' && (spell.level > 0 || info.cantripsKnown > 0) && allowed.has(canonicalSpellName(spell.name)))
      || granted.has(canonicalSpellName(spell.name))))

  // Convert to hydrated format
  return classSpells.map((spell) => ({
    name: spell.name,
    grantedBySubclass: grants.prepared.includes(spell.name) ? 'prepared' as const : grants.known.includes(spell.name) ? 'known' as const : undefined,
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
  for (const entry of race.entries || []) {
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
  const size = (race.size || ['M']).map((s) => sizeMap[s] || s).join(' or ')

  return {
    name: race.name,
    size,
    speed: race.speed || 30,
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
  level: number,
  choice?: string | null
): Promise<{ cantrips: string[]; spells: string[] }> {
  const spells = await getSpellsForClass(className, subclassName, level, choice)
  return {
    cantrips: spells.filter(spell => spell.level === 0).map(spell => spell.name),
    spells: spells.filter(spell => spell.level > 0).map(spell => spell.name),
  }
}

/**
 * Get spellcasting ability for a class/subclass
 */
export async function getSpellcastingAbility(
  className: string,
  subclassName: string
): Promise<string | null> {
  return getSpellcastingAbilityForClass(className, subclassName)
}

/** Deterministic racial increases; choice races follow class priorities. */
export async function getRacialAbilityBonuses(raceName: string, className: string): Promise<Partial<Stats>> {
  const race = await getRaceData(raceName)
  const ability = race?.ability?.[0] as Record<string, unknown> | undefined
  const result: Partial<Stats> = {}
  const priorities = STAT_PRIORITY[className] || STAT_PRIORITY.Fighter
  for (const stat of priorities) if (typeof ability?.[stat] === 'number') result[stat] = ability[stat] as number
  const choose = ability?.choose as { from?: StatName[]; count?: number; amount?: number; weighted?: {from: StatName[]; weights: number[]} } | undefined
  if (choose?.weighted) {
    const choices = priorities.filter(stat => choose.weighted!.from.includes(stat))
    choose.weighted.weights.forEach((amount, index) => { if (choices[index]) result[choices[index]] = (result[choices[index]] || 0) + amount })
  } else if (choose?.from) {
    priorities.filter(stat => choose.from!.includes(stat)).slice(0, choose.count || 1).forEach(stat => { result[stat] = (result[stat] || 0) + (choose.amount || 1) })
  } else if (!ability && race?.lineage) {
    result[priorities[0]] = 2
    result[priorities[1]] = 1
  }
  return result
}
