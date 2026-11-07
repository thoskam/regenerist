// Character builder: a Build (the player's choices) + a RulesPack → CharacterDoc.
// Pure; used by the server when creating/levelling characters and by tests.

import { sanitizeHtml } from '../sheet/sanitize'
import type { Ability, ActionEntry, CharacterDoc, ClassEntry, Effect, Feature, LimitedUse, SourceRef, SpellEntry, SpellSource } from '../sheet/types'
import { ABILITIES } from '../sheet/types'
import type { RClass, RFeature, RSpell, RSpecies, RulesPack, RUses } from './types'

export interface BuildClass {
  name: string
  subclass?: string | null
  level: number
  /** Skill choices from this class (starting class: full list; multiclass: its smaller list). */
  skills: string[]
  /** Skills (or "thieves-tools") chosen for Expertise. */
  expertise: string[]
  /** Rolled HP for each level after the first in this class (index 0 = class level 2). Missing → average. */
  hpRolls?: number[]
  /** Optional class features the player turned on (2014 Tasha's options). */
  optional?: string[]
}

export interface AsiChoice {
  className: string
  classLevel: number
  kind: 'asi' | 'feat'
  abilities?: Partial<Record<Ability, number>>
  feat?: string
  featAbility?: Ability
}

export interface Build {
  version: 1
  edition: '2014' | '2024'
  name: string
  species: { name: string; option?: string | null; abilityBonuses?: Partial<Record<Ability, number>>; skills?: string[]; languages?: string[] }
  background: { name: string; abilityBonuses?: Partial<Record<Ability, number>>; languages?: string[] }
  abilities: { method: 'standard' | 'pointbuy' | 'manual' | 'roll'; base: Record<Ability, number> }
  /** First entry is the starting class. */
  classes: BuildClass[]
  asi: AsiChoice[]
  /** Extra feats outside ASIs, e.g. 2024 Human "Versatile" origin feat. */
  feats: string[]
  /** Chosen spells per class. */
  spells: Array<{ className: string; name: string }>
  hpMode: 'average' | 'rolled'
  customFeatures?: Array<{ name: string; level?: number; description: string; source?: string }>
  languages?: string[]
}

export const POINT_BUY_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 }
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]
const ABILITY_SLUG: Record<Ability, string> = { str: 'strength', dex: 'dexterity', con: 'constitution', int: 'intelligence', wis: 'wisdom', cha: 'charisma' }
const slug = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/,\s*/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const title = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

export const totalLevel = (b: Build) => b.classes.reduce((t, c) => t + c.level, 0)

export interface BuildIssue { level: 'error' | 'warning'; message: string }

export function findClass(pack: RulesPack, name: string) { return pack.classes.find(c => c.name === name) }
export function findSpecies(pack: RulesPack, name: string) { return pack.species.find(s => s.name === name) }

/** ASI slots a class grants up to its level (each needs an AsiChoice). */
export function asiSlots(pack: RulesPack, b: Build): Array<{ className: string; classLevel: number }> {
  return b.classes.flatMap(c => (findClass(pack, c.name)?.asiLevels ?? []).filter(l => l <= c.level).map(l => ({ className: c.name, classLevel: l })))
}

/** Spells a class may have: cantrips and leveled spells known or prepared at its current level. */
export function spellAllowance(pack: RulesPack, b: Build, c: BuildClass, scores: Record<Ability, number>): { cantrips: number; spells: number; maxLevel: number; list: string; ability: Ability } | null {
  const rc = findClass(pack, c.name)
  const sc = rc?.spellcasting ?? rc?.subclasses.find(s => s.name === c.subclass)?.spellcasting
  if (!sc) return null
  const i = Math.min(20, c.level) - 1
  const mod = Math.floor((scores[sc.ability] - 10) / 2)
  const spells = sc.prepared ? sc.prepared[i] : sc.known ? sc.known[i] : sc.preparedFormula ? Math.max(1, (sc.preparedFormula === 'half' ? Math.floor(c.level / 2) : c.level) + mod) : 0
  const effective = sc.progression === 'full' ? c.level : sc.progression === 'pact' ? c.level : sc.progression === 'third' ? Math.ceil(c.level / 3) : Math.ceil(c.level / 2)
  const maxLevel = sc.progression === 'pact' ? Math.min(5, Math.ceil(c.level / 2)) : Math.min(9, Math.ceil(effective / 2))
  return { cantrips: sc.cantrips[i] ?? 0, spells, maxLevel: sc.progression === 'third' && c.level < 3 ? 0 : maxLevel, list: sc.list, ability: sc.ability }
}

export function abilityScores(pack: RulesPack, b: Build): Record<Ability, number> {
  const s = { ...b.abilities.base }
  for (const e of abilityEffects(pack, b)) {
    const a = ABILITIES.find(x => `${ABILITY_SLUG[x]}-score` === e.subType)
    if (a) s[a] += e.value ?? 0
  }
  return s
}

function abilityEffects(pack: RulesPack, b: Build): Effect[] {
  const out: Effect[] = []
  const add = (a: Ability, v: number, source: SourceRef) => { if (v) out.push({ type: 'bonus', subType: `${ABILITY_SLUG[a]}-score`, value: v, source }) }
  const sp = findSpecies(pack, b.species.name)
  for (const [a, v] of Object.entries(sp?.abilities ?? {})) add(a as Ability, v as number, { kind: 'species', label: b.species.name })
  for (const [a, v] of Object.entries(b.species.abilityBonuses ?? {})) add(a as Ability, v as number, { kind: 'species', label: b.species.name })
  for (const [a, v] of Object.entries(b.background.abilityBonuses ?? {})) add(a as Ability, v as number, { kind: 'background', label: b.background.name })
  for (const x of b.asi) {
    if (x.kind === 'asi') for (const [a, v] of Object.entries(x.abilities ?? {})) add(a as Ability, v as number, { kind: 'class', label: `${x.className} ${x.classLevel}: Ability Score Improvement` })
    if (x.kind === 'feat' && x.featAbility) {
      const f = pack.feats.find(f => f.name === x.feat)
      add(x.featAbility, f?.abilityChoice?.amount ?? 1, { kind: 'feat', label: x.feat || 'Feat' })
    }
  }
  return out
}

export function validateBuild(pack: RulesPack, b: Build): BuildIssue[] {
  const issues: BuildIssue[] = []
  const err = (m: string) => issues.push({ level: 'error', message: m })
  const warn = (m: string) => issues.push({ level: 'warning', message: m })
  if (!b.name.trim()) err('Give your character a name.')
  if (!b.classes.length) err('Choose a class.')
  const lvl = totalLevel(b)
  if (lvl < 1 || lvl > 20) err('Total level must be between 1 and 20.')
  if (new Set(b.classes.map(c => c.name)).size !== b.classes.length) err('Each class can appear only once.')
  for (const c of b.classes) {
    const rc = findClass(pack, c.name)
    if (!rc) { err(`Unknown class: ${c.name}`); continue }
    if (c.level >= rc.subclassLevel && !c.subclass) warn(`Choose a ${rc.subclassTitle} for ${c.name}.`)
    if (c.subclass && rc.subclasses.length && !rc.subclasses.some(s => s.name === c.subclass)) err(`Unknown ${rc.subclassTitle}: ${c.subclass}`)
  }
  if (!findSpecies(pack, b.species.name)) err('Choose a species.')
  if (!pack.backgrounds.some(x => x.name === b.background.name)) err('Choose a background.')
  for (const a of ABILITIES) if (!(b.abilities.base[a] >= 3 && b.abilities.base[a] <= 20)) err('Base ability scores must be between 3 and 20.')
  if (b.abilities.method === 'pointbuy') {
    const cost = ABILITIES.reduce((t, a) => t + (POINT_BUY_COST[b.abilities.base[a]] ?? 99), 0)
    if (cost > 27) err(`Point buy uses ${cost} of 27 points.`)
  }
  if (b.abilities.method === 'standard' && [...ABILITIES.map(a => b.abilities.base[a])].sort((x, y) => y - x).join() !== STANDARD_ARRAY.join()) err('Standard array must use 15, 14, 13, 12, 10, 8 once each.')
  if (b.edition === '2024') {
    const bonus = Object.values(b.background.abilityBonuses ?? {}).filter(Boolean) as number[]
    const ok = (bonus.length === 2 && bonus.sort().join() === '1,2') || (bonus.length === 3 && bonus.every(v => v === 1))
    if (!ok) warn('2024 backgrounds give +2 and +1, or +1 to three abilities.')
    const bg = pack.backgrounds.find(x => x.name === b.background.name)
    if (bg?.abilityOptions?.length && Object.keys(b.background.abilityBonuses ?? {}).some(a => !bg.abilityOptions!.includes(a as Ability))) err(`${bg.name} can only raise ${bg.abilityOptions.map(a => a.toUpperCase()).join(', ')}.`)
  }
  const scores = abilityScores(pack, b)
  for (const a of ABILITIES) if (scores[a] > 20) warn(`${a.toUpperCase()} is above 20.`)
  // Multiclassing prerequisites (PHB): the new class and the starting class.
  if (b.classes.length > 1) for (const c of b.classes) {
    const req = findClass(pack, c.name)?.multiclass
    if (!req) continue
    const entries = Object.entries(req.requirements) as Array<[Ability, number]>
    const met = req.anyOf ? entries.some(([a, n]) => scores[a] >= n) : entries.every(([a, n]) => scores[a] >= n)
    if (entries.length && !met) warn(`${c.name} multiclassing needs ${entries.map(([a, n]) => `${a.toUpperCase()} ${n}`).join(req.anyOf ? ' or ' : ' and ')}.`)
  }
  const slots = asiSlots(pack, b)
  const missing = slots.filter(s => !b.asi.some(x => x.className === s.className && x.classLevel === s.classLevel))
  if (missing.length) warn(`${missing.length} Ability Score Improvement choice${missing.length > 1 ? 's' : ''} not made yet.`)
  for (const c of b.classes) {
    const al = spellAllowance(pack, b, c, scores)
    if (!al) continue
    const chosen = b.spells.filter(s => s.className === c.name).map(s => pack.spells.find(x => x.name === s.name)).filter(Boolean) as RSpell[]
    const cantrips = chosen.filter(s => s.level === 0).length
    const leveled = chosen.filter(s => s.level > 0).length
    if (cantrips > al.cantrips) warn(`${c.name}: ${cantrips} cantrips chosen, ${al.cantrips} allowed.`)
    if (leveled > al.spells) warn(`${c.name}: ${leveled} spells chosen, ${al.spells} allowed.`)
    if (chosen.some(s => s.level > al.maxLevel)) warn(`${c.name}: a chosen spell is above level ${al.maxLevel}.`)
  }
  return issues
}

const maxUsesAt = (u: RUses, classLevel: number) => (u.byLevel ? u.byLevel[Math.min(20, classLevel) - 1] : u.max ?? 0)
const toLimitedUse = (u: RUses | undefined, key: string, classLevel: number): LimitedUse | undefined =>
  u ? { max: maxUsesAt(u, classLevel), ability: u.ability ?? null, addPb: u.addPb || undefined, reset: u.reset, key } : undefined

function featureToDoc(f: RFeature, source: SourceRef, classLevel: number, id: string): { feature: Feature; action?: ActionEntry } {
  const scale = f.scaling?.[Math.min(20, classLevel) - 1]
  const dice = scale && /^\d+d\d+/.test(scale) ? scale : undefined
  const uses = toLimitedUse(f.uses, `feat-${id}`, classLevel)
  const name = scale && !dice ? `${f.name} (${scale})` : f.name
  const feature: Feature = { id, name, source, level: f.level, description: f.description, activation: f.activation, uses }
  const action = f.activation || uses || dice
    ? { id: `act-${id}`, name: f.name, activation: f.activation ?? 'special', source, description: f.description, uses, dice }
    : undefined
  return { feature, action }
}

function spellEntry(s: RSpell, key: string): SpellEntry {
  return {
    id: key, name: s.name, level: s.level, school: s.school, castingTime: s.castingTime, activation: s.activation, range: s.range,
    components: s.components, duration: s.duration, concentration: s.concentration, ritual: s.ritual, description: s.description,
    dice: s.dice ?? null, damageType: s.damageType ?? null, save: s.save ?? null, attack: s.attack ?? null, scaling: s.scaling ?? null, usesSlot: s.level > 0,
  }
}

/** Mechanics of well-known class features that the rules text alone can't apply. */
function featureEffects(name: string, className: string, classLevel: number, source: SourceRef): Effect[] {
  const e = (type: string, subType: string, value: number | null = null, ability: Ability | null = null): Effect => ({ type, subType, value, ability, source })
  switch (name) {
    case 'Rakish Audacity': return [e('bonus', 'initiative', 0, 'cha')]
    case 'Jack of All Trades': return [e('half-proficiency', 'ability-checks')]
    case 'Unarmored Defense': return className === 'Monk' ? [e('set', 'unarmored-armor-class', 0, 'wis')] : [e('set', 'unarmored-armor-class', 0, 'con')]
    case 'Draconic Resilience': return [e('set', 'unarmored-armor-class', 3), e('bonus', 'hit-points-per-level', 1)]
    case 'Fast Movement': return [e('bonus', 'speed', 10)]
    case 'Unarmored Movement': return [e('bonus', 'speed', classLevel >= 18 ? 30 : classLevel >= 14 ? 25 : classLevel >= 10 ? 20 : classLevel >= 6 ? 15 : 10)]
    case 'Aura of Protection': return [e('bonus', 'saving-throws', 0, 'cha')]
    case 'Diamond Soul': return ABILITIES.map(a => e('proficiency', `${ABILITY_SLUG[a]}-saving-throws`))
    case 'Primal Champion': return [e('bonus', 'strength-score', 4), e('bonus', 'constitution-score', 4)]
    case 'Body and Mind': return [e('bonus', 'dexterity-score', 4), e('bonus', 'wisdom-score', 4)]
    default: return []
  }
}

const skillName = (k: string) => k === 'thieves-tools' ? 'thieves-tools' : slug(k)

/** Generate a CharacterDoc from a build. `prev` keeps inventory, currency, notes, theme, and identity details. */
export function generateDoc(pack: RulesPack, b: Build, prev?: CharacterDoc | null): CharacterDoc {
  const level = Math.max(1, totalLevel(b))
  const effects: Effect[] = abilityEffects(pack, b)
  const features: Feature[] = []
  const actions: ActionEntry[] = []
  const prof = (subType: string, source: SourceRef, type = 'proficiency') => effects.push({ type, subType, source })
  const species = findSpecies(pack, b.species.name) as RSpecies | undefined
  const bg = pack.backgrounds.find(x => x.name === b.background.name)
  const speciesSrc: SourceRef = { kind: 'species', label: b.species.name }
  const bgSrc: SourceRef = { kind: 'background', label: b.background.name }

  // Classes.
  const classes: ClassEntry[] = []
  let hpBase = 0
  b.classes.forEach((c, idx) => {
    const rc = findClass(pack, c.name) as RClass | undefined
    if (!rc) return
    const sub = rc.subclasses.find(s => s.name === c.subclass)
    const sc = rc.spellcasting ?? sub?.spellcasting
    classes.push({ name: rc.name, subclass: c.subclass ?? null, level: c.level, hitDie: rc.hitDie, isStartingClass: idx === 0, edition: b.edition, spellcasting: sc ? { ability: sc.ability, progression: sc.progression } : null })
    const src: SourceRef = { kind: 'class', label: rc.name }
    // Hit points: max die at character level 1, then rolls or the fixed average.
    for (let l = 1; l <= c.level; l++) {
      if (idx === 0 && l === 1) hpBase += rc.hitDie
      else hpBase += b.hpMode === 'rolled' && c.hpRolls?.[l - 2] ? Math.min(rc.hitDie, Math.max(1, c.hpRolls[l - 2])) : rc.hitDie / 2 + 1
    }
    if (idx === 0) {
      for (const a of rc.saves) prof(`${ABILITY_SLUG[a]}-saving-throws`, src)
      for (const a of rc.armor) prof(slug(a), src)
      for (const w of rc.weapons) prof(slug(w), src)
      for (const t of rc.tools) if (!/^choose|^one /i.test(t)) prof(slug(t), src)
    } else {
      for (const a of rc.multiclass.armor) prof(slug(a), src)
      for (const w of rc.multiclass.weapons) prof(slug(w), src)
      for (const t of rc.multiclass.tools) if (t) prof(slug(t), src)
    }
    for (const s of c.skills) prof(skillName(s), src)
    for (const s of c.expertise) prof(skillName(s), src, 'expertise')
    const placeholder = new RegExp(`^(${rc.subclassTitle}( feature)?|Subclass Feature|${rc.name} Subclass)$`, 'i')
    for (const f of rc.features) {
      if (f.level > c.level || placeholder.test(f.name) || (f.optional && !(c.optional ?? []).includes(f.name))) continue
      if (/^Ability Score Improvement$|^Expertise$/.test(f.name) && features.some(x => x.name === f.name && x.source.label === rc.name)) continue
      const { feature, action } = featureToDoc(f, src, c.level, `${slug(rc.name)}-${slug(f.name)}-${f.level}`)
      features.push(feature); if (action) actions.push(action)
      effects.push(...featureEffects(f.name, rc.name, c.level, { kind: 'class', label: f.name }))
      for (const a of f.grants?.saves ?? []) prof(`${ABILITY_SLUG[a]}-saving-throws`, { kind: 'class', label: f.name })
    }
    if (sub) {
      const ssrc: SourceRef = { kind: 'subclass', label: sub.name }
      for (const f of sub.features) {
        if (f.level > c.level) continue
        const { feature, action } = featureToDoc(f, ssrc, c.level, `${slug(sub.name)}-${slug(f.name)}-${f.level}`)
        features.push(feature); if (action) actions.push(action)
        effects.push(...featureEffects(f.name, rc.name, c.level, { kind: 'subclass', label: f.name }))
      }
    }
  })

  // Species.
  if (species) {
    if (species.darkvision) effects.push({ type: 'set-base', subType: 'darkvision', value: species.darkvision, source: speciesSrc })
    for (const r of species.resist ?? []) effects.push({ type: 'resistance', subType: r, source: speciesSrc })
    const opt = species.options?.choices.find(o => o.name === b.species.option)
    for (const r of opt?.resist ?? []) effects.push({ type: 'resistance', subType: r, source: { kind: 'species', label: `${b.species.name} (${opt!.name})` } })
    for (const s of species.skills ?? []) prof(skillName(s), speciesSrc)
    for (const s of b.species.skills ?? []) prof(skillName(s), speciesSrc)
    for (const l of species.languages) prof(slug(l), speciesSrc, 'language')
    for (const w of species.weapons ?? []) prof(slug(w), speciesSrc)
    for (const a of species.armor ?? []) prof(slug(a), speciesSrc)
    for (const t of species.tools ?? []) prof(slug(t), speciesSrc)
    if (species.hpPerLevel) effects.push({ type: 'bonus', subType: 'hit-points-per-level', value: species.hpPerLevel, source: speciesSrc })
    species.traits.forEach((t, i) => {
      const id = `species-${slug(species.name)}-${i}`
      const uses = toLimitedUse(t.uses, `feat-${id}`, level)
      const desc = opt && i === species.traits.length - 1 && opt.description ? `${t.description}<p><strong>${opt.name}.</strong> ${opt.description}</p>` : t.description
      features.push({ id, name: t.name, source: speciesSrc, description: desc, activation: t.activation, uses })
      if (t.activation || uses) actions.push({ id: `act-${id}`, name: t.name, activation: t.activation ?? 'special', source: speciesSrc, description: desc, uses })
    })
    if (opt && !species.traits.some(t => t.name === opt.name)) features.push({ id: `species-option-${slug(opt.name)}`, name: `${species.options!.label}: ${opt.name}`, source: speciesSrc, description: opt.description ? `<p>${opt.description}</p>` : '' })
  }
  for (const l of [...(b.species.languages ?? []), ...(b.background.languages ?? []), ...(b.languages ?? [])]) prof(slug(l), speciesSrc, 'language')

  // Background.
  if (bg) {
    for (const s of bg.skills) prof(skillName(s), bgSrc)
    for (const t of bg.tools) if (!/^choose|^one /i.test(t)) prof(slug(t), bgSrc)
    if (bg.feature) features.push({ id: `bg-${slug(bg.name)}`, name: bg.feature.name, source: bgSrc, description: bg.feature.description })
    else features.push({ id: `bg-${slug(bg.name)}`, name: bg.name, source: bgSrc, description: bg.description })
  }

  // Feats: background origin feat (2024), extra feats, ASI-slot feats.
  const featNames = [...(bg?.feat ? [bg.feat] : []), ...b.feats, ...b.asi.filter(x => x.kind === 'feat' && x.feat).map(x => x.feat!)]
  featNames.forEach((name, i) => {
    const f = pack.feats.find(x => x.name === name || name.startsWith(`${x.name} (`))
    features.push({ id: `feat-${slug(name)}-${i}`, name, source: { kind: 'feat', label: 'Feat' }, description: f?.description ?? '' })
    const fsrc: SourceRef = { kind: 'feat', label: name }
    // Alert: +5 initiative (2014); add proficiency bonus (2024).
    if (/^Alert$/.test(name)) effects.push({ type: 'bonus', subType: 'initiative', value: b.edition === '2024' ? Math.ceil(level / 4) + 1 : 5, source: fsrc })
    if (/^Tough$/.test(name)) effects.push({ type: 'bonus', subType: 'hit-points-per-level', value: 2, source: fsrc })
    if (/^Lucky$/.test(name)) actions.push({ id: `act-feat-lucky-${i}`, name: 'Lucky', activation: 'special', source: fsrc, description: f?.description ?? '', uses: b.edition === '2024' ? { max: 0, addPb: true, reset: 'long', key: `feat-lucky-${i}` } : { max: 3, reset: 'long', key: `feat-lucky-${i}` } })
  })

  for (const cf of b.customFeatures ?? []) features.push({ id: `custom-${slug(cf.name)}-${cf.level ?? 0}`, name: cf.name, level: cf.level, source: { kind: 'custom', label: cf.source || 'Custom' }, description: sanitizeHtml(cf.description) })

  // Spells.
  const spellSources: SpellSource[] = []
  for (const c of b.classes) {
    const cls = classes.find(x => x.name === c.name)
    if (!cls?.spellcasting) continue
    const chosen = b.spells.filter(s => s.className === c.name).map(s => pack.spells.find(x => x.name === s.name)).filter(Boolean) as RSpell[]
    if (!chosen.length) continue
    spellSources.push({ id: `class-${slug(c.name)}`, label: c.name, ability: cls.spellcasting.ability, spells: chosen.sort((x, y) => x.level - y.level || x.name.localeCompare(y.name)).map(s => spellEntry(s, `spell-${slug(c.name)}-${slug(s.name)}`)) })
  }

  const blank = { personality: undefined } as CharacterDoc['notes']
  return {
    schema: 1, name: b.name.trim() || prev?.name || 'New character', edition: b.edition, rulesLabel: `${b.edition} rules`,
    identity: {
      ...(prev?.identity ?? {}), species: b.species.option ? `${b.species.name} (${b.species.option})` : b.species.name, speciesEdition: b.edition,
      background: b.background.name, size: species?.size === 'small' ? 'small' : 'medium',
    },
    classes,
    abilities: { base: { ...b.abilities.base }, override: {} },
    speeds: { walk: species?.speed.walk ?? 30, fly: species?.speed.fly, swim: species?.speed.swim, climb: species?.speed.climb },
    hitPoints: { base: Math.round(hpBase), bonus: 0, override: null },
    xp: prev?.xp ?? 0,
    effects, features, actions,
    inventory: prev?.inventory ?? [],
    currency: prev?.currency ?? { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    spellSources,
    extraProficiencies: { armor: [], weapons: [], tools: [], languages: [] },
    notes: prev?.notes ?? blank,
    preferences: prev?.preferences ?? { ignoreCoinWeight: true, encumbrance: 'standard', combatActions: b.edition },
    theme: prev?.theme ?? { name: 'ember', accent: null },
    import: null,
    build: b,
    regenerist: prev?.regenerist ?? null,
  }
}

export const languageTitle = title

/** Coerce untrusted input into a Build (shape and bounds only; rules checks live in validateBuild). */
export function normalizeBuild(input: unknown): Build {
  const x = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const str = (v: unknown, n = 80) => (typeof v === 'string' ? v.trim().slice(0, n) : '')
  const strs = (v: unknown, max = 40, n = 80) => (Array.isArray(v) ? v.filter(s => typeof s === 'string').slice(0, max).map(s => (s as string).slice(0, n)) : [])
  const int = (v: unknown, lo: number, hi: number, d: number) => { const k = Math.trunc(Number(v)); return Number.isFinite(k) ? Math.min(hi, Math.max(lo, k)) : d }
  const abil = (v: unknown): Partial<Record<Ability, number>> => {
    const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
    return Object.fromEntries(ABILITIES.filter(a => o[a] !== undefined).map(a => [a, int(o[a], -4, 4, 0)]))
  }
  const sp = (x.species ?? {}) as Record<string, unknown>
  const bg = (x.background ?? {}) as Record<string, unknown>
  const ab = (x.abilities ?? {}) as Record<string, unknown>
  const base = (ab.base ?? {}) as Record<string, unknown>
  const isAbility = (a: unknown): a is Ability => typeof a === 'string' && (ABILITIES as string[]).includes(a)
  return {
    version: 1, edition: x.edition === '2024' ? '2024' : '2014', name: str(x.name),
    species: { name: str(sp.name), option: str(sp.option) || null, abilityBonuses: abil(sp.abilityBonuses), skills: strs(sp.skills, 6), languages: strs(sp.languages, 6) },
    background: { name: str(bg.name), abilityBonuses: abil(bg.abilityBonuses), languages: strs(bg.languages, 6) },
    abilities: { method: (['standard', 'pointbuy', 'manual', 'roll'] as const).find(m => m === ab.method) ?? 'manual', base: Object.fromEntries(ABILITIES.map(a => [a, int(base[a], 3, 20, 10)])) as Record<Ability, number> },
    classes: (Array.isArray(x.classes) ? x.classes : []).slice(0, 13).map((c: Record<string, unknown>) => ({
      name: str(c?.name), subclass: str(c?.subclass) || null, level: int(c?.level, 1, 20, 1), skills: strs(c?.skills, 8), expertise: strs(c?.expertise, 8),
      hpRolls: Array.isArray(c?.hpRolls) ? (c.hpRolls as unknown[]).slice(0, 19).map(v => int(v, 1, 12, 1)) : undefined, optional: strs(c?.optional, 20),
    })),
    asi: (Array.isArray(x.asi) ? x.asi : []).slice(0, 40).map((a: Record<string, unknown>) => ({
      className: str(a?.className), classLevel: int(a?.classLevel, 1, 20, 4), kind: a?.kind === 'feat' ? 'feat' as const : 'asi' as const,
      abilities: abil(a?.abilities), feat: str(a?.feat) || undefined, featAbility: isAbility(a?.featAbility) ? a.featAbility : undefined,
    })),
    feats: strs(x.feats, 10),
    spells: (Array.isArray(x.spells) ? x.spells : []).slice(0, 200).map((s: Record<string, unknown>) => ({ className: str(s?.className), name: str(s?.name) })).filter(s => s.name),
    hpMode: x.hpMode === 'rolled' ? 'rolled' : 'average',
    customFeatures: (Array.isArray(x.customFeatures) ? x.customFeatures : []).slice(0, 50).map((f: Record<string, unknown>) => ({ name: str(f?.name), level: f?.level ? int(f.level, 1, 20, 1) : undefined, description: str(f?.description, 8000), source: str(f?.source) || undefined })).filter(f => f.name),
    languages: strs(x.languages, 10),
  }
}

/** Light version of a pack for the browser builder (no long descriptions). */
export function lightPack(pack: RulesPack) {
  const strip = <T extends { description?: string }>(o: T) => ({ ...o, description: '' })
  return {
    edition: pack.edition,
    classes: pack.classes.map(c => ({ ...c, features: c.features.map(strip), subclasses: c.subclasses.map(s => ({ ...s, features: s.features.map(strip) })) })),
    species: pack.species.map(s => ({ ...s, traits: s.traits.map(strip), description: '' })),
    backgrounds: pack.backgrounds.map(b => ({ ...b, description: '', feature: b.feature ? { name: b.feature.name, description: '' } : undefined })),
    feats: pack.feats.map(strip),
    spells: pack.spells.map(s => ({ ...s, description: '' })),
  }
}
