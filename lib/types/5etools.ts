// 5eTools data type definitions

// Entry types for recursive content rendering
export type EntryString = string

export interface EntryList {
  type: 'list'
  items: Entry[]
  style?: string
  name?: string
}

export interface EntryTable {
  type: 'table'
  caption?: string
  colLabels?: string[]
  colStyles?: string[]
  rows: (string | Entry)[][]
}

export interface EntryEntries {
  type: 'entries'
  name?: string
  entries: Entry[]
}

export interface EntrySection {
  type: 'section'
  name?: string
  entries: Entry[]
}

export interface EntryInset {
  type: 'inset'
  name?: string
  entries: Entry[]
}

export interface EntryInsetReadaloud {
  type: 'insetReadaloud'
  entries: Entry[]
}

export interface EntryQuote {
  type: 'quote'
  entries: Entry[]
  by?: string
}

export interface EntryOptionalFeature {
  type: 'refOptionalfeature'
  optionalfeature: string
}

export interface EntryClassFeature {
  type: 'refClassFeature'
  classFeature: string
}

export interface EntrySubclassFeature {
  type: 'refSubclassFeature'
  subclassFeature: string
}

// Union type for all entry types
export type Entry =
  | EntryString
  | EntryList
  | EntryTable
  | EntryEntries
  | EntrySection
  | EntryInset
  | EntryInsetReadaloud
  | EntryQuote
  | EntryOptionalFeature
  | EntryClassFeature
  | EntrySubclassFeature

// Class data structures
export interface ClassFeature {
  name: string
  source: string
  page?: number
  className: string
  classSource: string
  level: number
  entries: Entry[]
  srd?: boolean
  basicRules?: boolean
  isClassFeatureVariant?: boolean
}

export interface SubclassFeature {
  name: string
  source: string
  page?: number
  className: string
  classSource: string
  subclassShortName: string
  subclassSource: string
  level: number
  entries: Entry[]
  srd?: boolean
  basicRules?: boolean
}

export interface StartingProficiencies {
  armor?: string[]
  weapons?: string[]
  tools?: (string | { choose: { from: string[]; count: number } })[]
  skills?: ({ choose: { from: string[]; count: number } })[]
}

export interface StartingEquipment {
  additionalFromBackground?: boolean
  default?: string[]
  goldAlternative?: string
  defaultData?: Record<string, unknown>[]
}

export interface SubclassData {
  name: string
  shortName: string
  source: string
  className: string
  classSource: string
  page?: number
  spellcastingAbility?: string
  casterProgression?: string
  cantripProgression?: number[]
  spellsKnownProgression?: number[]
  additionalSpells?: unknown[]
  subclassFeatures: (string | { subclassFeature: string; gainSubclassFeature?: boolean })[]
  srd?: boolean
  basicRules?: boolean
}

export interface ClassData {
  name: string
  source: string
  page?: number
  hd: { number: number; faces: number }
  proficiency: string[]
  startingProficiencies: StartingProficiencies
  startingEquipment?: StartingEquipment
  multiclassing?: {
    requirements: Record<string, unknown>
    proficienciesGained?: Record<string, unknown>
  }
  classFeatures: (string | { classFeature: string; gainSubclassFeature?: boolean })[]
  subclassTitle?: string
  srd?: boolean
  basicRules?: boolean
}

export interface ClassFileData {
  class: ClassData[]
  subclass: SubclassData[]
  classFeature: ClassFeature[]
  subclassFeature: SubclassFeature[]
}

// Race data structures
export interface RaceAbility {
  [key: string]: number
}

export interface RaceSpeed {
  walk?: number
  fly?: number
  swim?: number
  climb?: number
  burrow?: number
}

export interface RaceData {
  name: string
  source: string
  page?: number
  size: string[]
  speed: number | RaceSpeed
  ability?: RaceAbility[]
  entries: Entry[]
  traitTags?: string[]
  languageProficiencies?: Record<string, boolean>[]
  skillProficiencies?: Record<string, boolean>[]
  darkvision?: number
  srd?: boolean
  basicRules?: boolean
  age?: { mature?: number; max?: number }
  lineage?: string
  creatureTypes?: string[]
  _copy?: { name: string; source: string }
}

export interface RaceFileData {
  race: RaceData[]
}

// Skill data structures
export interface SkillData {
  name: string
  source: string
  page?: number
  ability: string
  entries: Entry[]
  srd?: boolean
  basicRules?: boolean
}

export interface SkillFileData {
  skill: SkillData[]
}

// Spell data structures
export interface SpellTime {
  number: number
  unit: string
  condition?: string
}

export interface SpellRange {
  type: string
  distance?: {
    type: string
    amount?: number
  }
}

export interface SpellComponents {
  v?: boolean
  s?: boolean
  m?: string | { text: string; cost?: number; consume?: boolean }
}

export interface SpellDuration {
  type: string
  duration?: {
    type: string
    amount: number
  }
  concentration?: boolean
}

export interface SpellData {
  name: string
  source: string
  page?: number
  level: number
  school: string
  time: SpellTime[]
  range: SpellRange
  components: SpellComponents
  duration: SpellDuration[]
  entries: Entry[]
  entriesHigherLevel?: Entry[]
  damageInflict?: string[]
  savingThrow?: string[]
  conditionInflict?: string[]
  spellAttack?: string[]
  miscTags?: string[]
  areaTags?: string[]
  classes?: {
    fromClassList?: { name: string; source: string }[]
    fromSubclass?: { class: { name: string; source: string }; subclass: { name: string; source: string } }[]
  }
  srd?: boolean
  basicRules?: boolean
}

export interface SpellFileData {
  spell: SpellData[]
}

// Hydrated character data (returned from API)
export interface HydratedClassInfo {
  name: string
  hitDie: number
  savingThrows: string[]
  armorProficiencies: string[]
  weaponProficiencies: string[]
  features: {
    name: string
    level: number
    description: string
  }[]
}

export interface HydratedSubclassInfo {
  name: string
  shortName: string
  features: {
    name: string
    level: number
    description: string
  }[]
}

export interface HydratedRaceInfo {
  name: string
  size: string
  speed: number | RaceSpeed
  traits: {
    name: string
    description: string
  }[]
}

export interface HydratedSpell {
  name: string
  level: number
  school: string
  castingTime: string
  range: string
  components: string
  duration: string
  description: string
}

// Spellbook types for smart spell selection
export interface Spellbook {
  spellNames: string[]
  archivistNote: string
}

export interface HydratedSpellbook {
  spells: HydratedSpell[]
  archivistNote: string
}

/** Active state runtime resource (from Prisma ActiveState) */
export interface HydratedActiveState {
  id: string
  lifeId: number
  currentHp: number
  tempHp: number
  spellSlots: Record<string, { used: number; max: number }>
  pactSlotsUsed: number
  pactSlotsMax: number
  pactSlotLevel: number
  hitDice: Record<string, { used: number; max: number }>
  limitedFeatures: Record<string, { name: string; max: number; used: number; recharge: string }>
  deathSaveSuccesses: number
  deathSaveFailures: number
  conditions: string[]
  exhaustionLevel: number
  concentratingOn: string | null
  shortRestsTaken: number
  longRestsTaken: number
  updatedAt: string
}

export interface HydratedCharacterData {
  classInfo: HydratedClassInfo
  subclassInfo: HydratedSubclassInfo | null
  raceInfo: HydratedRaceInfo | null
  spells: HydratedSpell[] | null
  selectedSpellbook: HydratedSpellbook | null
  isSpellcaster: boolean
  spellcastingAbility: string | null
  maxSpellLevel: number | null
  savingThrowProficiencies: string[]
  activeState: HydratedActiveState | null
}

// Valid class names for security validation
export const VALID_CLASSES = [
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

export type ValidClassName = (typeof VALID_CLASSES)[number]

// Spellcasting classifications
export const FULL_CASTERS = ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard'] as const
export const HALF_CASTERS = ['Paladin', 'Ranger', 'Artificer'] as const
export const THIRD_CASTER_SUBCLASSES: Record<string, string[]> = {
  Fighter: ['Eldritch Knight'],
  Rogue: ['Arcane Trickster'],
}

// School abbreviation mapping
export const SPELL_SCHOOLS: Record<string, string> = {
  A: 'Abjuration',
  C: 'Conjuration',
  D: 'Divination',
  E: 'Enchantment',
  V: 'Evocation',
  I: 'Illusion',
  N: 'Necromancy',
  T: 'Transmutation',
}
