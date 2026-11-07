// Canonical v2 character document.
//
// A CharacterDoc is the durable, edition-aware description of a character: what it *is*.
// PlayState is what changes at the table (HP lost, uses spent, conditions).
// Everything shown on the sheet is derived from both by `computeSheet` — never stored.
//
// Bonuses, proficiencies, resistances, senses and similar grants are all `Effect`s. The effect
// grammar deliberately follows D&D Beyond's modifier vocabulary (type + subType), so imports are
// lossless and the in-app builder can emit the same records.

export type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
export const ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

export type Edition = '2014' | '2024'

export type ResetType = 'short' | 'long' | 'dawn' | 'dusk' | 'consumable' | 'other'

export type Activation = 'action' | 'bonus' | 'reaction' | 'special' | 'none'

export interface SourceRef {
  kind: 'species' | 'class' | 'subclass' | 'background' | 'feat' | 'item' | 'custom'
  /** Stable id of the granting thing (item id, feature id, …). */
  id?: string
  label: string
}

export interface Effect {
  /** e.g. bonus, set, set-base, proficiency, expertise, half-proficiency, advantage, resistance, language, damage, ignore-weapon-property, weapon-property */
  type: string
  /** e.g. dexterity-score, stealth, armor-class, initiative, fire, darkvision, simple-weapons */
  subType: string
  value?: number | null
  /** Add this ability's modifier (e.g. Rakish Audacity adds CHA to initiative). */
  ability?: Ability | null
  dice?: string | null
  restriction?: string | null
  source: SourceRef
  /** Only applies while the granting item is attuned. */
  requiresAttunement?: boolean
}

export interface LimitedUse {
  /** Fixed part of the maximum. */
  max: number
  /** Add this ability's modifier to the maximum (min 1 total). */
  ability?: Ability | null
  /** Add the proficiency bonus to the maximum. */
  addPb?: boolean
  reset: ResetType
  /** Key into PlayState.used. */
  key: string
}

export interface Feature {
  id: string
  name: string
  source: SourceRef
  /** Class level (or character level) at which it is gained. */
  level?: number
  /** Sanitized HTML. */
  description: string
  snippet?: string
  activation?: Activation
  uses?: LimitedUse
}

export interface ActionEntry {
  id: string
  name: string
  activation: Activation
  source: SourceRef
  description: string
  snippet?: string
  uses?: LimitedUse
  /** Optional roll, e.g. Sneak Attack 8d6. */
  dice?: string
  damageType?: string
  save?: { ability: Ability; dc: number }
}

export interface WeaponData {
  /** Base weapon slug, e.g. dagger, halberd, crossbow-hand. Used for proficiency. */
  base: string
  category: 'simple' | 'martial' | 'other'
  kind: 'melee' | 'ranged'
  damage: string | null
  damageType: string
  range: number
  longRange: number
  /** Final property names after item modifications, e.g. Finesse, Light, Thrown, Vex. */
  properties: string[]
  /** 2024 weapon mastery property, when the weapon has one. */
  mastery?: string
}

export interface ArmorData {
  type: 'light' | 'medium' | 'heavy' | 'shield'
  baseAc: number
  stealthDisadvantage?: boolean
  strengthRequirement?: number | null
}

export interface ItemCustomizations {
  name?: string
  notes?: string[]
  hitBonus?: number
  damageBonus?: number
  /** Explicit proficiency override. */
  proficient?: boolean
  /** Hidden from the attack list. */
  hideFromAttacks?: boolean
}

export interface Item {
  id: string
  name: string
  /** Rules type label, e.g. Weapon, Armor, Wondrous item, Potion, Gear. */
  type: string
  subtype?: string
  rarity: 'common' | 'uncommon' | 'rare' | 'very rare' | 'legendary' | 'artifact' | 'varies' | 'unknown'
  quantity: number
  /** Weight of one bundle (bundleSize items). */
  weight: number
  bundleSize: number
  equipped: boolean
  attuned: boolean
  canAttune: boolean
  attunementDescription?: string
  containerId?: string | null
  isContainer?: boolean
  /** 0 for magical containers whose contents weigh nothing. */
  contentsWeightMultiplier?: number
  magic: boolean
  magicBonus?: number
  description: string
  weapon?: WeaponData
  armor?: ArmorData
  effects: Effect[]
  uses?: LimitedUse
  custom?: ItemCustomizations
  homebrew?: boolean
}

export interface SpellEntry {
  id: string
  name: string
  level: number
  school: string
  castingTime: string
  activation: Activation
  range: string
  components: string
  duration: string
  concentration: boolean
  ritual: boolean
  description: string
  /** Cast at a fixed higher level (e.g. Hellish Rebuke as a 2nd-level spell). */
  castAtLevel?: number | null
  prepared?: boolean
  alwaysPrepared?: boolean
  uses?: LimitedUse
  save?: Ability | null
  attack?: 'melee' | 'ranged' | null
  /** Primary damage/healing dice at base level, if any. */
  dice?: string | null
  /** Dice when cast at castAtLevel, from the spell's own higher-level scaling. */
  castDice?: string | null
  /** How the dice grow: per slot level above the spell's level, or by character level (cantrips). */
  scaling?: { kind: 'slot'; dice: string; every: number } | { kind: 'character'; steps: Array<{ level: number; dice: string }> } | null
  /** Casting spends a spell slot (class spells); racial/item spells use `uses` instead. */
  usesSlot?: boolean
  damageType?: string | null
}

export interface SpellSource {
  id: string
  label: string
  /** Ability used for DC and attack. Null = item with fixed values or no attack/save. */
  ability: Ability | null
  fixedDc?: number | null
  fixedAttack?: number | null
  spells: SpellEntry[]
}

export interface ClassEntry {
  name: string
  subclass?: string | null
  level: number
  hitDie: number
  isStartingClass: boolean
  edition: Edition
  spellcasting?: { ability: Ability; progression: 'full' | 'half' | 'third' | 'pact' | 'artificer' } | null
}

export interface Currency { cp: number; sp: number; ep: number; gp: number; pp: number }

export interface Notes {
  personality?: string
  ideals?: string
  bonds?: string
  flaws?: string
  appearance?: string
  backstory?: string
  allies?: string
  organizations?: string
  enemies?: string
  possessions?: string
  holdings?: string
  other?: string
}

export type ThemeName = 'ember' | 'arcane' | 'parchment'

export interface CharacterDoc {
  schema: 1
  name: string
  /** Rules used by classes/species. Items carry their own data, so mixed sheets are allowed. */
  edition: Edition
  /** Human label, e.g. "2014 class · 2024 items". */
  rulesLabel: string
  identity: {
    species: string
    speciesEdition: Edition
    background?: string | null
    gender?: string | null
    age?: string | null
    height?: string | null
    weight?: string | null
    eyes?: string | null
    hair?: string | null
    skin?: string | null
    faith?: string | null
    alignment?: string | null
    size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan'
  }
  classes: ClassEntry[]
  abilities: {
    base: Record<Ability, number>
    /** Hard overrides of final scores. */
    override: Partial<Record<Ability, number>>
  }
  speeds: { walk: number; fly?: number; swim?: number; climb?: number; burrow?: number }
  hitPoints: {
    /** Sum of hit-die results/averages, before Constitution. */
    base: number
    bonus: number
    override?: number | null
  }
  xp: number
  effects: Effect[]
  features: Feature[]
  actions: ActionEntry[]
  inventory: Item[]
  currency: Currency
  spellSources: SpellSource[]
  /** Proficiencies granted outside effects (manual overrides from the source sheet). */
  extraProficiencies: { armor: string[]; weapons: string[]; tools: string[]; languages: string[] }
  notes: Notes
  preferences: {
    ignoreCoinWeight: boolean
    encumbrance: 'none' | 'standard' | 'variant'
    /** Basic actions list follows this edition. */
    combatActions: Edition
  }
  theme: { name: ThemeName; accent?: string | null }
  import?: { source: 'ddb'; id: string; url: string; importedAt: string } | null
}

export interface PlayState {
  hpRemoved: number
  tempHp: number
  deathSaves: { success: number; fail: number }
  inspiration: boolean
  conditions: string[]
  exhaustion: number
  /** Spent uses by LimitedUse.key. */
  used: Record<string, number>
  /** Spent spell slots by level ("1".."9"), and pact slots under "pact". */
  slotsUsed: Record<string, number>
  /** Spent hit dice by die size ("8"). */
  hitDiceUsed: Record<string, number>
  concentration?: string | null
}

export const emptyPlayState = (): PlayState => ({
  hpRemoved: 0, tempHp: 0, deathSaves: { success: 0, fail: 0 }, inspiration: false,
  conditions: [], exhaustion: 0, used: {}, slotsUsed: {}, hitDiceUsed: {}, concentration: null,
})
