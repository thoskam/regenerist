// Normalized rules packs (one per edition), produced by scripts/build-rules.cjs into data/rules/.

import type { Ability, Activation, ResetType } from '../sheet/types'

export interface RUses { max?: number; byLevel?: number[]; ability?: Ability; addPb?: boolean; reset: ResetType }

export interface RFeature {
  name: string
  level: number
  /** Sanitized HTML. */
  description: string
  activation?: Activation
  uses?: RUses
  /** Optional class features (e.g. Tasha's) the player may toggle. */
  optional?: boolean
  /** Per-level scaling text from the class table, e.g. Sneak Attack "8d6" (index = class level − 1). */
  scaling?: string[]
  /** Proficiencies granted by the feature itself (e.g. Slippery Mind → WIS saves). */
  grants?: { saves?: Ability[] }
}

export interface RSpellcasting {
  ability: Ability
  progression: 'full' | 'half' | 'third' | 'pact' | 'artificer'
  /** Cantrips known by class level (index = level − 1). */
  cantrips: number[]
  /** Spells known (known casters) by class level. */
  known?: number[]
  /** Spells prepared by class level (2024 tables). */
  prepared?: number[]
  /** 2014 prepared formula: level (or half level) + ability modifier. */
  preparedFormula?: 'level' | 'half'
  /** Spell list name, e.g. "Wizard". */
  list: string
}

export interface RSubclass { name: string; source: string; features: RFeature[]; spellcasting?: RSpellcasting }

export interface RClass {
  name: string
  source: string
  hitDie: number
  saves: Ability[]
  armor: string[]
  weapons: string[]
  tools: string[]
  skillChoices: { count: number; from: string[] }
  subclassTitle: string
  subclassLevel: number
  asiLevels: number[]
  features: RFeature[]
  subclasses: RSubclass[]
  spellcasting?: RSpellcasting
  columns: Array<{ label: string; values: string[] }>
  multiclass: { requirements: Partial<Record<Ability, number>>; anyOf?: boolean; armor: string[]; weapons: string[]; tools: string[]; skills?: { count: number; from: string[] } }
  expertise: Array<{ level: number; count: number }>
}

export interface RSpecies {
  name: string
  source: string
  size: 'small' | 'medium' | 'large' | 'small or medium'
  speed: { walk: number; fly?: number; swim?: number; climb?: number }
  darkvision?: number
  /** Fixed ability increases (2014). */
  abilities?: Partial<Record<Ability, number>>
  /** Flexible increases, e.g. [{count:1, amount:2},{count:1, amount:1}] (MPMM/Tasha's). */
  abilityChoice?: Array<{ count: number; amount: number; from?: Ability[] }>
  resist?: string[]
  languages: string[]
  languageChoice?: number
  skills?: string[]
  skillChoice?: { count: number; from: string[] }
  hpPerLevel?: number
  /** Weapon/armor/tool training granted by the species (e.g. Elf Weapon Training). */
  weapons?: string[]
  armor?: string[]
  tools?: string[]
  traits: Array<{ name: string; description: string; activation?: Activation; uses?: RUses }>
  /** Innate spells (Infernal Legacy, Elven Lineage…), by character level. `option` limits it to one sub-choice. */
  spells?: RSpeciesSpell[]
  /** Sub-choices such as elven lineage or draconic ancestry. */
  options?: { label: string; choices: Array<{ name: string; resist?: string[]; description?: string }> }
}

export interface RSpeciesSpell {
  name: string
  level: number
  option?: string
  /** Casts per long rest without a slot; 'pb' = proficiency bonus. Absent = at will (cantrips). */
  perDay?: number | 'pb'
  /** Always cast at this spell level (Hellish Rebuke as a 2nd-level spell). */
  castAt?: number
  ability?: Ability
  abilityChoice?: Ability[]
}

export interface RBackground {
  name: string
  source: string
  skills: string[]
  tools: string[]
  languages: number
  description: string
  feature?: { name: string; description: string }
  /** 2024: the three abilities this background can raise. */
  abilityOptions?: Ability[]
  /** 2024: origin feat granted. */
  feat?: string
}

export interface RFeat {
  name: string
  source: string
  prerequisite?: string
  description: string
  abilityChoice?: { from: Ability[]; amount: number }
  origin?: boolean
  /** 5etools feat category: O origin, G general, FS fighting style, EB epic boon. */
  category?: string
}

export interface RSpell {
  name: string
  source: string
  level: number
  school: string
  classes: string[]
  castingTime: string
  activation: Activation
  range: string
  components: string
  duration: string
  concentration: boolean
  ritual: boolean
  description: string
  dice?: string
  damageType?: string
  save?: Ability
  attack?: 'melee' | 'ranged'
  scaling?: { kind: 'slot'; dice: string; every: number } | { kind: 'character'; steps: Array<{ level: number; dice: string }> }
}

export interface RulesPack {
  edition: '2014' | '2024'
  builtAt: string
  classes: RClass[]
  species: RSpecies[]
  backgrounds: RBackground[]
  feats: RFeat[]
  spells: RSpell[]
}
