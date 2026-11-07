// Regenerist: random but rules-valid builds.
import type { Ability } from '../sheet/types'
import { ABILITIES } from '../sheet/types'
import { STANDARD_ARRAY, abilityScores, asiSlots, findClass, spellAllowance, type Build } from './build'
import type { RulesPack } from './types'

type Rng = () => number
const pick = <T,>(xs: T[], rng: Rng): T => xs[Math.floor(rng() * xs.length)]
const sample = <T,>(xs: T[], n: number, rng: Rng): T[] => {
  const pool = [...xs]; const out: T[] = []
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0])
  return out
}

/** Ability priorities by class (first two get the best scores). */
const PRIORITY: Record<string, Ability[]> = {
  Barbarian: ['str', 'con', 'dex'], Bard: ['cha', 'dex', 'con'], Cleric: ['wis', 'con', 'str'], Druid: ['wis', 'con', 'dex'],
  Fighter: ['str', 'con', 'dex'], Monk: ['dex', 'wis', 'con'], Paladin: ['str', 'cha', 'con'], Ranger: ['dex', 'wis', 'con'],
  Rogue: ['dex', 'con', 'wis'], Sorcerer: ['cha', 'con', 'dex'], Warlock: ['cha', 'con', 'dex'], Wizard: ['int', 'con', 'dex'],
  Artificer: ['int', 'con', 'dex'],
}
const SKILL_KEYS = ['acrobatics', 'animal-handling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight-of-hand', 'stealth', 'survival']

/** Regenerist level drift: current level ± (1d4 − 2), kept within 1–20. */
export function driftLevel(level: number, rng: Rng = Math.random): number {
  return Math.max(1, Math.min(20, level + (1 + Math.floor(rng() * 4)) - 2))
}

export function randomBuild(pack: RulesPack, opts: { name: string; level: number; rng?: Rng }): Build {
  const rng = opts.rng ?? Math.random
  const cls = pick(pack.classes, rng)
  const level = Math.max(1, Math.min(20, opts.level))
  const priority = [...(PRIORITY[cls.name] ?? (cls.spellcasting ? [cls.spellcasting.ability, 'con', 'dex'] as Ability[] : ['dex', 'con', 'str'] as Ability[]))]
  const order = [...priority, ...ABILITIES.filter(a => !priority.includes(a))]
  const base = Object.fromEntries(order.map((a, i) => [a, STANDARD_ARRAY[i]])) as Record<Ability, number>

  const species = pick(pack.species, rng)
  const speciesBonuses: Partial<Record<Ability, number>> = {}
  for (const ch of species.abilityChoice ?? []) {
    const from = ((ch.from as Ability[] | undefined) ?? order).filter(a => !speciesBonuses[a])
    for (const a of order.filter(x => from.includes(x)).slice(0, ch.count)) speciesBonuses[a] = ch.amount
  }
  const background = pick(pack.backgrounds, rng)
  const bgBonuses: Partial<Record<Ability, number>> = {}
  if (background.abilityOptions?.length) {
    const ranked = order.filter(a => background.abilityOptions!.includes(a))
    bgBonuses[ranked[0]] = 2
    if (ranked[1]) bgBonuses[ranked[1]] = 1
  }
  const fixed = new Set([...background.skills, ...(species.skills ?? [])])
  const speciesSkills = species.skillChoice ? sample((species.skillChoice.from.length ? species.skillChoice.from : SKILL_KEYS).filter(s => !fixed.has(s)), species.skillChoice.count, rng) : []
  speciesSkills.forEach(s => fixed.add(s))
  const classSkillsFrom = (cls.skillChoices.from.length ? cls.skillChoices.from : SKILL_KEYS).filter(s => !fixed.has(s))
  const skills = sample(classSkillsFrom, cls.skillChoices.count, rng)
  const expertiseCount = cls.expertise.filter(e => e.level <= level).reduce((t, e) => t + e.count, 0)
  const expertise = sample([...fixed, ...skills], expertiseCount, rng)
  const subclass = level >= cls.subclassLevel && cls.subclasses.length ? pick(cls.subclasses, rng).name : null

  const b: Build = {
    version: 1, edition: pack.edition, name: opts.name,
    species: { name: species.name, option: species.options ? pick(species.options.choices, rng).name : null, abilityBonuses: speciesBonuses, skills: speciesSkills },
    background: { name: background.name, abilityBonuses: bgBonuses },
    abilities: { method: 'standard', base },
    classes: [{ name: cls.name, subclass, level, skills, expertise }],
    asi: [], feats: [], spells: [], hpMode: 'average', customFeatures: [],
  }
  // Ability Score Improvements go to the class's top abilities, never past 20.
  for (const slot of asiSlots(pack, b)) {
    const scores = abilityScores(pack, b)
    const target = order.find(a => scores[a] <= 18) ?? order[0]
    b.asi.push({ ...slot, kind: 'asi', abilities: { [target]: 2 } })
  }
  // Spells: fill the allowance from the class list.
  const al = spellAllowance(pack, b, b.classes[0], abilityScores(pack, b))
  if (al && findClass(pack, cls.name)) {
    const list = pack.spells.filter(s => s.classes.includes(al.list))
    const cantrips = sample(list.filter(s => s.level === 0).map(s => s.name), al.cantrips, rng)
    const leveled = sample(list.filter(s => s.level > 0 && s.level <= al.maxLevel).map(s => s.name), al.spells, rng)
    b.spells = [...new Set([...cantrips, ...leveled])].map(name => ({ className: cls.name, name }))
  }
  return b
}
