// Convert an imported (D&D Beyond) character into builder choices, so it can be levelled and
// edited in the app. The goal is the same sheet: anything the rules pack can't reproduce is
// carried over as adjustments, kept spells/actions, or custom features, and listed in the report.

import { computeSheet, SKILLS } from '../sheet/compute'
import type { Ability, ActionEntry, CharacterDoc, Effect, SpellSource } from '../sheet/types'
import { ABILITIES, emptyPlayState } from '../sheet/types'
import { ADJUSTMENT_TYPES, asiSlots, findClass, generateDoc, type AsiChoice, type Build, type BuildAdjustment } from './build'
import type { RulesPack } from './types'

export interface ConversionReport {
  /** Things the player should check or redo in the builder. */
  notes: string[]
  /** Final numbers that still differ from the imported sheet. */
  differences: string[]
}

const ABILITY_SLUG: Record<Ability, string> = { str: 'strength', dex: 'dexterity', con: 'constitution', int: 'intelligence', wis: 'wisdom', cha: 'charisma' }
const SCORE_SUBTYPES = new Set(Object.values(ABILITY_SLUG).map(a => `${a}-score`))
const SKILL_KEYS = new Set(SKILLS.map(s => s.key))
const words = (s: string) => s.toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9]+/).filter(Boolean).sort().join(' ')
const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "'").replace(/\s*\([^)]*\)\s*/g, ' ').replace(/[^a-z0-9']+/g, ' ').trim()

/** Match a D&D Beyond name ("High Elf", "Variant Human") to a pack name ("Elf (High)", "Human (Variant)"). */
function matchName<T extends { name: string }>(list: T[], name: string | null | undefined): T | undefined {
  if (!name) return undefined
  return list.find(x => x.name === name) ?? list.find(x => x.name.toLowerCase() === name.toLowerCase()) ?? list.find(x => words(x.name) === words(name))
}

const effectKey = (e: { type: string; subType: string; ability?: Ability | null }) => `${e.type}|${e.subType}|${e.ability ?? ''}`

/** Spell sources and actions that the builder can't regenerate (species, feat, item spells; custom actions). */
export function keptFromImport(doc: CharacterDoc, pack: RulesPack): NonNullable<Build['kept']> {
  const spellSources: SpellSource[] = []
  for (const src of doc.spellSources) {
    if (src.id.startsWith('class-')) {
      // Class spells come back through the builder; keep only the ones the pack doesn't know.
      const unknown = src.spells.filter(s => !pack.spells.some(p => p.name === s.name))
      if (unknown.length) spellSources.push({ ...src, id: `kept-${src.id}`, label: `${src.label} (carried over)`, spells: unknown })
    } else spellSources.push({ ...src, id: `kept-${src.id}` })
  }
  const actions: ActionEntry[] = doc.actions.filter(a => a.source.kind === 'custom').map(a => ({ ...a, id: `kept-${a.id}` }))
  return { spellSources, actions }
}

export function importToBuild(pack: RulesPack, doc: CharacterDoc): { build: Build; report: ConversionReport } {
  const notes: string[] = []
  const differences: string[] = []
  const target = computeSheet(doc, emptyPlayState())
  const own = doc.effects.filter(e => e.source.kind !== 'item')

  // Species, background, classes.
  const species = matchName(pack.species, doc.identity.species)
  if (!species) notes.push(`Species “${doc.identity.species}” isn’t in the ${pack.edition} rules here. Pick the closest one on the Species step.`)
  const bg = matchName(pack.backgrounds, doc.identity.background)
  if (!bg) notes.push(`Background “${doc.identity.background ?? 'none'}” isn’t in the ${pack.edition} rules here. Pick one on the Background step.`)
  if (species?.options) notes.push(`Choose your ${species.options.label.toLowerCase()} on the Species step.`)

  const ordered = [...doc.classes].sort((a, b) => Number(b.isStartingClass) - Number(a.isStartingClass))
  const classes = ordered.map(c => {
    const rc = matchName(pack.classes, c.name)
    if (!rc) notes.push(`Class “${c.name}” isn’t in the ${pack.edition} rules here.`)
    let subclass = c.subclass ?? null
    if (rc && subclass) {
      const sub = matchName(rc.subclasses, subclass) ?? rc.subclasses.find(s => norm(s.name) === norm(subclass!))
      if (sub) subclass = sub.name
      else if (rc.subclasses.length) notes.push(`${rc.subclassTitle} “${subclass}” isn’t in the rules here; its features are kept as custom features.`)
    }
    // Optional class features (Tasha's) the character has on D&D Beyond.
    // (D&D Beyond lists optional features only as actions, not class features.)
    const have = new Set([...doc.features.filter(f => f.source.label === c.name).map(f => f.name), ...doc.actions.filter(a => a.source.kind === 'class').map(a => a.name)].map(norm))
    const optional = [...new Set((rc?.features ?? []).filter(f => f.optional && f.level <= c.level && have.has(norm(f.name))).map(f => f.name))]
    return { name: rc?.name ?? c.name, subclass, level: c.level, skills: [] as string[], expertise: [] as string[], optional }
  })

  // Species/background ability bonuses: fixed ones come from the pack; flexible ones from the import.
  const scoreBonus = (kind: string) => {
    const out: Partial<Record<Ability, number>> = {}
    for (const e of own) if (e.source.kind === kind && e.type === 'bonus' && SCORE_SUBTYPES.has(e.subType)) {
      const a = ABILITIES.find(x => `${ABILITY_SLUG[x]}-score` === e.subType)!
      out[a] = (out[a] ?? 0) + (e.value ?? 0)
    }
    return out
  }
  const speciesBonuses = species && !species.abilities ? scoreBonus('species') : {}
  const backgroundBonuses = pack.edition === '2024' ? scoreBonus('background') : {}

  // Skills: whatever the species and background don't already give goes to the starting class.
  const skillProfs = new Set(own.filter(e => e.type === 'proficiency' && (SKILL_KEYS.has(e.subType) || e.subType === 'thieves-tools')).map(e => e.subType))
  const auto = new Set([...(species?.skills ?? []), ...(bg?.skills ?? [])])
  const speciesSkills = species?.skillChoice ? own.filter(e => e.source.kind === 'species' && e.type === 'proficiency' && SKILL_KEYS.has(e.subType)).map(e => e.subType).filter(s => !auto.has(s)).slice(0, species.skillChoice.count) : []
  speciesSkills.forEach(s => auto.add(s))
  if (classes[0]) {
    classes[0].skills = [...skillProfs].filter(s => SKILL_KEYS.has(s) && !auto.has(s))
    classes[0].expertise = [...new Set(own.filter(e => e.type === 'expertise').map(e => e.subType))]
  }

  const build: Build = {
    version: 1, edition: pack.edition, name: doc.name,
    species: { name: species?.name ?? doc.identity.species, option: null, abilityBonuses: speciesBonuses, skills: speciesSkills },
    background: { name: bg?.name ?? doc.identity.background ?? '', abilityBonuses: backgroundBonuses },
    abilities: { method: 'manual', base: { ...doc.abilities.base } },
    classes, asi: [], feats: [], spells: [], hpMode: 'average', customFeatures: [], languages: [],
    adjustments: [], extraProficiencies: { armor: [...doc.extraProficiencies.armor], weapons: [...doc.extraProficiencies.weapons], tools: [...doc.extraProficiencies.tools], languages: [...doc.extraProficiencies.languages] },
    hpBonus: 0,
  }

  // Ability Score Improvements: class-granted score bonuses, grouped by the feature that gave them, fill
  // the ASI slots in order; feats take the remaining slots.
  const asiGroups = new Map<string, Partial<Record<Ability, number>>>()
  for (const e of own) if (e.source.kind === 'class' && e.type === 'bonus' && SCORE_SUBTYPES.has(e.subType)) {
    const a = ABILITIES.find(x => `${ABILITY_SLUG[x]}-score` === e.subType)!
    const g = asiGroups.get(e.source.id ?? e.source.label) ?? {}
    g[a] = (g[a] ?? 0) + (e.value ?? 0)
    asiGroups.set(e.source.id ?? e.source.label, g)
  }
  const groups = [...asiGroups.entries()].sort((x, y) => Number(x[0]) - Number(y[0]) || x[0].localeCompare(y[0])).map(x => x[1])
  const slots = asiSlots(pack, build)
  const featNames = doc.features.filter(f => f.source.kind === 'feat').map(f => f.name).filter(n => n !== bg?.feat)
  const asi: AsiChoice[] = []
  for (const slot of slots) {
    const g = groups.shift()
    if (g) { asi.push({ ...slot, kind: 'asi', abilities: g }); continue }
    const feat = featNames.shift()
    if (feat) {
      const known = pack.feats.find(f => f.name === feat)
      const fe = own.find(e => e.source.kind === 'feat' && e.source.label === feat && e.type === 'bonus' && SCORE_SUBTYPES.has(e.subType))
      asi.push({ ...slot, kind: 'feat', feat: known?.name ?? feat, featAbility: fe ? ABILITIES.find(x => `${ABILITY_SLUG[x]}-score` === fe.subType) : undefined })
    }
  }
  build.asi = asi
  build.feats = featNames.map(n => pack.feats.find(f => f.name === n)?.name ?? n) // e.g. Variant Human, 2024 Versatile
  for (const g of groups) for (const [a, v] of Object.entries(g)) build.abilities.base[a as Ability] += v as number // more bonuses than slots
  const missingSlots = slots.length - asi.length
  if (missingSlots > 0) notes.push(`${missingSlots} Ability Score Improvement${missingSlots > 1 ? 's were' : ' was'} not used on D&D Beyond; choose on the Improvements step.`)

  // Spells chosen from class lists.
  for (const src of doc.spellSources.filter(s => s.id.startsWith('class-'))) {
    const cls = classes.find(c => c.name === src.label) ?? classes.find(c => findClass(pack, c.name)?.spellcasting) ?? classes[0]
    for (const s of src.spells) if (cls && pack.spells.some(p => p.name === s.name)) build.spells.push({ className: cls.name, name: s.name })
  }
  build.kept = keptFromImport(doc, pack)
  build.snippets = Object.fromEntries([...doc.features, ...doc.actions].filter(x => x.snippet && x.source.kind !== 'custom').map(x => [x.name, x.snippet!]))
  if (build.kept.spellSources.length) notes.push(`Kept as-is: ${build.kept.spellSources.map(s => s.label).join(', ')} spells.`)

  // Effects the rules don't produce: compare by type/subType and carry over the rest.
  let draft = generateDoc(pack, build, doc)
  const have = new Set(draft.effects.map(effectKey))
  // Same proficiency under another name ("Hand Crossbow" vs crossbow-hand).
  const dp = computeSheet(draft, emptyPlayState()).proficiencies
  const profNames = new Set([...dp.armor, ...dp.weapons, ...dp.tools].map(n => words(n.replace(/s\b/g, ''))))
  const adjustments: BuildAdjustment[] = []
  for (const e of own) {
    if (SCORE_SUBTYPES.has(e.subType) || e.subType === 'subclass' || !(ADJUSTMENT_TYPES as readonly string[]).includes(e.type)) continue
    if (e.type === 'language' || ((e.type === 'proficiency' || e.type === 'expertise') && (SKILL_KEYS.has(e.subType) || e.subType === 'thieves-tools'))) continue
    if (e.value != null && e.value !== 0 && !e.ability && e.type === 'bonus') {
      // Numeric bonuses: carry over only the difference.
      const sum = (list: Effect[]) => list.filter(x => effectKey(x) === effectKey(e)).reduce((t, x) => t + (x.value ?? 0), 0)
      const diff = sum(own) - sum(draft.effects) - adjustments.filter(a => effectKey(a) === effectKey(e)).reduce((t, a) => t + (a.value ?? 0), 0)
      if (diff) adjustments.push({ type: e.type, subType: e.subType, value: diff, label: e.source.label })
      continue
    }
    if (have.has(effectKey(e)) || (e.type === 'proficiency' && profNames.has(words(e.subType.replace(/s\b/g, ''))))) continue
    have.add(effectKey(e))
    adjustments.push({ type: e.type, subType: e.subType, value: e.value ?? null, ability: e.ability ?? null, label: e.source.label })
  }
  build.adjustments = adjustments

  // Languages the rules don't give.
  draft = generateDoc(pack, build, doc)
  const langs = new Set(computeSheet(draft, emptyPlayState()).proficiencies.languages.map(l => l.toLowerCase()))
  for (const e of own.filter(x => x.type === 'language')) {
    const name = computeSheet({ ...draft, effects: [e], extraProficiencies: { armor: [], weapons: [], tools: [], languages: [] } }, emptyPlayState()).proficiencies.languages[0]
    if (name && !langs.has(name.toLowerCase())) { build.languages!.push(name); langs.add(name.toLowerCase()) }
  }

  // Features the rules don't describe (homebrew, unknown subclass, feats missing from the pack).
  draft = generateDoc(pack, build, doc)
  const known = new Set([...draft.features.map(f => norm(f.name)), 'ability score improvement', 'ability score increase'])
  // Feature names the rules know but don't list on the sheet (placeholders like "Roguish Archetype").
  for (const c of classes) {
    const rc = findClass(pack, c.name)
    for (const n of [rc?.subclassTitle, ...(rc?.features ?? []).map(f => f.name)]) if (n) known.add(norm(n))
  }
  for (const f of doc.features) {
    if (known.has(norm(f.name))) continue
    known.add(norm(f.name))
    build.customFeatures!.push({ name: f.name, level: f.level, description: f.description, source: f.source.label })
  }

  // Final numbers: fix ability scores and hit points to match, then report anything else.
  draft = generateDoc(pack, build, doc)
  let now = computeSheet(draft, emptyPlayState())
  for (const a of ABILITIES) {
    const diff = target.abilities[a].score - now.abilities[a].score
    if (!diff) continue
    const base = build.abilities.base[a] + diff
    if (base >= 3 && base <= 20) build.abilities.base[a] = base
    else build.adjustments.push({ type: 'bonus', subType: `${ABILITY_SLUG[a]}-score`, value: diff, label: 'Carried over from D&D Beyond' })
  }
  draft = generateDoc(pack, build, doc)
  now = computeSheet(draft, emptyPlayState())
  if (now.hp.max !== target.hp.max) build.hpBonus = target.hp.max - now.hp.max

  now = computeSheet(generateDoc(pack, build, doc), emptyPlayState())
  const cmp = (label: string, a: unknown, b: unknown) => { if (JSON.stringify(a) !== JSON.stringify(b)) differences.push(`${label}: D&D Beyond ${fmt(a)}, here ${fmt(b)}`) }
  cmp('Armor Class', target.ac.value, now.ac.value)
  cmp('Initiative', target.initiative, now.initiative)
  cmp('Hit points', target.hp.max, now.hp.max)
  for (const a of ABILITIES) cmp(`${a.toUpperCase()} save`, target.abilities[a].save, now.abilities[a].save)
  for (const s of target.skills) cmp(s.name, s.bonus, now.skills.find(x => x.key === s.key)?.bonus)
  cmp('Speed', target.speeds, now.speeds)
  cmp('Senses', target.senses, now.senses)
  cmp('Resistances', target.defenses.resistances, now.defenses.resistances)
  for (const atk of target.attacks) {
    const mine = now.attacks.find(x => x.name === atk.name)
    cmp(`${atk.name} attack`, [atk.toHit, atk.damage], mine ? [mine.toHit, mine.damage] : null)
  }
  return { build, report: { notes, differences } }
}

const fmt = (v: unknown) => (Array.isArray(v) ? v.map(x => (typeof x === 'object' ? Object.values(x as object).join(' ') : String(x))).join(', ') || 'none' : v == null ? 'missing' : String(v))
