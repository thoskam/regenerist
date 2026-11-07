// Rules engine: CharacterDoc + PlayState → every number shown on the sheet.
// Pure and deterministic; safe on server and client.

import type { Ability, ActionEntry, Activation, CharacterDoc, Effect, Item, LimitedUse, PlayState, ResetType, SpellEntry } from './types'
import { ABILITIES } from './types'

export const ABILITY_NAMES: Record<Ability, string> = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' }
const ABILITY_SLUG: Record<Ability, string> = { str: 'strength', dex: 'dexterity', con: 'constitution', int: 'intelligence', wis: 'wisdom', cha: 'charisma' }

export const SKILLS: Array<{ key: string; name: string; ability: Ability }> = [
  { key: 'acrobatics', name: 'Acrobatics', ability: 'dex' },
  { key: 'animal-handling', name: 'Animal Handling', ability: 'wis' },
  { key: 'arcana', name: 'Arcana', ability: 'int' },
  { key: 'athletics', name: 'Athletics', ability: 'str' },
  { key: 'deception', name: 'Deception', ability: 'cha' },
  { key: 'history', name: 'History', ability: 'int' },
  { key: 'insight', name: 'Insight', ability: 'wis' },
  { key: 'intimidation', name: 'Intimidation', ability: 'cha' },
  { key: 'investigation', name: 'Investigation', ability: 'int' },
  { key: 'medicine', name: 'Medicine', ability: 'wis' },
  { key: 'nature', name: 'Nature', ability: 'int' },
  { key: 'perception', name: 'Perception', ability: 'wis' },
  { key: 'performance', name: 'Performance', ability: 'cha' },
  { key: 'persuasion', name: 'Persuasion', ability: 'cha' },
  { key: 'religion', name: 'Religion', ability: 'int' },
  { key: 'sleight-of-hand', name: 'Sleight of Hand', ability: 'dex' },
  { key: 'stealth', name: 'Stealth', ability: 'dex' },
  { key: 'survival', name: 'Survival', ability: 'wis' },
]

export const COMBAT_ACTIONS = {
  '2014': ['Attack', 'Cast a Spell', 'Dash', 'Disengage', 'Dodge', 'Grapple', 'Help', 'Hide', 'Improvise', 'Ready', 'Search', 'Shove', 'Use an Object'],
  '2024': ['Attack', 'Dash', 'Disengage', 'Dodge', 'Grapple', 'Help', 'Hide', 'Improvise', 'Influence', 'Magic', 'Ready', 'Search', 'Shove', 'Study', 'Utilize'],
} as const

export type ProfLevel = 'none' | 'half' | 'proficient' | 'expertise'

export interface Resource {
  key: string
  name: string
  max: number
  used: number
  reset: ResetType
  source: string
}

export interface AttackRow {
  id: string
  itemId?: string
  name: string
  subtitle: string
  rarity: Item['rarity']
  range: string
  rangeNote: string
  ability: Ability
  proficient: boolean
  toHit: number
  damage: string
  damageType: string
  extraDamage: Array<{ dice: string; type: string; note?: string }>
  versatile?: string
  /** Active weapon mastery (character can use mastery). */
  mastery?: string
  notes: string[]
  resource?: Resource
}

export interface ActionRow {
  id: string
  name: string
  activation: Activation
  meta: string
  description: string
  snippet?: string
  dice?: string
  resource?: Resource
  kind: 'action' | 'spell'
}

export interface SpellcastingBlock {
  id: string
  label: string
  ability: Ability | null
  dc: number | null
  attack: number | null
  spells: Array<SpellEntry & { resource?: Resource }>
}

export interface Sheet {
  name: string
  level: number
  pb: number
  classLabel: string
  xp: { current: number; levelStart: number; nextLevel: number | null }
  abilities: Record<Ability, { score: number; mod: number; save: number; saveProf: boolean }>
  skills: Array<{ key: string; name: string; ability: Ability; bonus: number; prof: ProfLevel; advantage: boolean; disadvantage: boolean }>
  passives: { perception: number; investigation: number; insight: number }
  initiative: number
  ac: { value: number; breakdown: string[] }
  speeds: Array<{ kind: string; value: number }>
  hp: { max: number; current: number; temp: number }
  hitDice: Array<{ die: number; total: number; used: number }>
  senses: string[]
  defenses: { resistances: string[]; immunities: string[]; vulnerabilities: string[]; conditionImmunities: string[] }
  savingThrowNotes: string[]
  proficiencies: { armor: string[]; weapons: string[]; tools: string[]; languages: string[] }
  attacks: AttackRow[]
  actions: ActionRow[]
  combatActions: readonly string[]
  spellcasting: SpellcastingBlock[]
  resources: Resource[]
  inventory: { weight: number; capacity: number; attuned: number; attuneMax: number }
  hasWeaponMastery: boolean
  spellSlots: Array<{ level: number; max: number; used: number }>
  pactSlots: { level: number; max: number; used: number } | null
}

const SLOT_TABLE: number[][] = [
  [], [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
]

/** Spellcasting caster level for the shared slot table (PHB multiclassing rules; single-class tables round up). */
export function casterLevel(classes: CharacterDoc['classes']): number {
  const casters = classes.filter(c => c.spellcasting && c.spellcasting.progression !== 'pact')
  if (!casters.length) return 0
  if (casters.length === 1) {
    const c = casters[0]; const p = c.spellcasting!.progression
    if (p === 'full') return c.level
    if (p === 'artificer') return Math.ceil(c.level / 2)
    if (p === 'half') return c.edition === '2024' || c.level >= 2 ? Math.ceil(c.level / 2) : 0
    if (p === 'third') return c.level >= 3 ? Math.ceil(c.level / 3) : 0
    return 0
  }
  return casters.reduce((t, c) => {
    const p = c.spellcasting!.progression
    if (p === 'full') return t + c.level
    if (p === 'artificer') return t + Math.ceil(c.level / 2)
    if (p === 'half') return t + (c.edition === '2024' ? Math.ceil(c.level / 2) : Math.floor(c.level / 2))
    if (p === 'third') return t + Math.floor(c.level / 3)
    return t
  }, 0)
}

export function pactMagic(level: number): { level: number; max: number } | null {
  if (level <= 0) return null
  const max = level === 1 ? 1 : level <= 10 ? 2 : level <= 16 ? 3 : 4
  return { level: Math.min(5, Math.ceil(level / 2)), max }
}

export const mod = (score: number) => Math.floor((score - 10) / 2)
export const fmtMod = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`)
const title = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const XP_TABLE = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000]

const ARMOR_PROF_NAMES: Record<string, string> = { 'light-armor': 'Light Armor', 'medium-armor': 'Medium Armor', 'heavy-armor': 'Heavy Armor', shields: 'Shields' }
const WEAPON_GROUPS: Record<string, string> = { 'simple-weapons': 'Simple Weapons', 'martial-weapons': 'Martial Weapons' }
const TOOL_HINT = /(tools|kit|supplies|set|instrument|utensils|vehicles|bagpipes|drum|dulcimer|flute|lute|lyre|horn|pan-flute|shawm|viol)/
const SKILL_KEYS = new Set(SKILLS.map(s => s.key))
const SAVE_KEYS = new Set(ABILITIES.map(a => `${ABILITY_SLUG[a]}-saving-throws`))
const NOT_WEAPON = new Set([...Object.keys(ARMOR_PROF_NAMES), ...SKILL_KEYS, ...SAVE_KEYS])

/** Effects active right now: character effects plus those of equipped (and attuned, when required) items. */
export function activeEffects(doc: CharacterDoc): Effect[] {
  const out = [...doc.effects]
  for (const item of doc.inventory) {
    if (!item.equipped) continue
    for (const e of item.effects) if (!e.requiresAttunement || item.attuned) out.push(e)
  }
  return out
}

export function resolveUses(u: LimitedUse, pb: number, mods: Record<Ability, number>): number {
  let max = u.max
  if (u.ability) max += mods[u.ability]
  if (u.addPb) max += pb
  return Math.max(u.ability || u.addPb ? 1 : 0, max)
}

export function computeSheet(doc: CharacterDoc, state: PlayState): Sheet {
  const effects = activeEffects(doc)
  const level = Math.max(1, doc.classes.reduce((a, c) => a + c.level, 0))
  const pb = Math.ceil(level / 4) + 1
  const of = (type: string, subType?: string) => effects.filter(e => e.type === type && (subType === undefined || e.subType === subType))
  const has = (type: string, subType: string) => effects.some(e => e.type === type && e.subType === subType)

  // Ability scores.
  const scores = {} as Record<Ability, number>
  for (const a of ABILITIES) {
    const key = `${ABILITY_SLUG[a]}-score`
    let s = doc.abilities.base[a] + of('bonus', key).reduce((t, e) => t + (e.value ?? 0), 0)
    for (const e of of('set', key)) if (e.value != null) s = Math.max(s, e.value)
    if (doc.abilities.override[a] != null) s = doc.abilities.override[a]!
    scores[a] = s
  }
  const mods = Object.fromEntries(ABILITIES.map(a => [a, mod(scores[a])])) as Record<Ability, number>
  const effectValue = (e: Effect) => (e.value ?? 0) + (e.ability ? mods[e.ability] : 0)
  const sumBonus = (...subTypes: string[]) => of('bonus').filter(e => subTypes.includes(e.subType) && !e.dice).reduce((t, e) => t + effectValue(e), 0)

  const abilities = {} as Sheet['abilities']
  for (const a of ABILITIES) {
    const saveKey = `${ABILITY_SLUG[a]}-saving-throws`
    const prof = has('proficiency', saveKey)
    abilities[a] = { score: scores[a], mod: mods[a], saveProf: prof, save: mods[a] + (prof ? pb : 0) + sumBonus('saving-throws', saveKey) }
  }

  const jack = has('half-proficiency', 'ability-checks')
  const jackUp = has('half-proficiency-round-up', 'ability-checks')
  const skills = SKILLS.map(s => {
    const prof: ProfLevel = has('expertise', s.key) ? 'expertise' : has('proficiency', s.key) ? 'proficient' : (jack || jackUp || has('half-proficiency', s.key)) ? 'half' : 'none'
    const profBonus = prof === 'expertise' ? pb * 2 : prof === 'proficient' ? pb : prof === 'half' ? (jackUp ? Math.ceil(pb / 2) : Math.floor(pb / 2)) : 0
    return {
      key: s.key, name: s.name, ability: s.ability, prof,
      bonus: mods[s.ability] + profBonus + sumBonus(s.key, 'ability-checks', `${ABILITY_SLUG[s.ability]}-ability-checks`),
      advantage: has('advantage', s.key), disadvantage: has('disadvantage', s.key),
    }
  })
  const skill = (k: string) => skills.find(s => s.key === k)!
  const passive = (k: string) => {
    const s = skill(k)
    return 10 + s.bonus + (s.advantage && !s.disadvantage ? 5 : 0) - (s.disadvantage && !s.advantage ? 5 : 0) + sumBonus(`passive-${k}`)
  }

  // Armor class.
  const equippedArmor = doc.inventory.find(i => i.equipped && i.armor && i.armor.type !== 'shield')
  const shield = doc.inventory.find(i => i.equipped && i.armor?.type === 'shield')
  let acValue: number
  const breakdown: string[] = []
  if (equippedArmor?.armor) {
    const t = equippedArmor.armor.type
    const dex = t === 'light' ? mods.dex : t === 'medium' ? Math.min(2, mods.dex) + (has('set', 'medium-armor-max-dex') ? 1 : 0) : 0
    acValue = equippedArmor.armor.baseAc + dex
    breakdown.push(`${equippedArmor.custom?.name || equippedArmor.name} ${equippedArmor.armor.baseAc}`)
    if (dex) breakdown.push(`DEX ${fmtMod(dex)}`)
    acValue += sumBonus('armored-armor-class')
  } else {
    const unarmored = of('set', 'unarmored-armor-class')
    const best = unarmored.reduce((m, e) => Math.max(m, (e.value ?? 0) + (e.ability ? mods[e.ability] : 0)), 0)
    acValue = 10 + mods.dex + best
    breakdown.push(`Unarmored 10`, `DEX ${fmtMod(mods.dex)}`)
    if (best) breakdown.push(`Unarmored Defense ${fmtMod(best)}`)
    acValue += sumBonus('unarmored-armor-class')
  }
  if (shield?.armor) { acValue += shield.armor.baseAc; breakdown.push(`Shield +${shield.armor.baseAc}`) }
  for (const e of of('bonus', 'armor-class')) { acValue += effectValue(e); breakdown.push(`${e.source.label} ${fmtMod(effectValue(e))}`) }

  // Speeds.
  const walk = doc.speeds.walk + sumBonus('speed', 'speed-walking')
  const speeds: Sheet['speeds'] = [{ kind: 'walking', value: walk }]
  for (const kind of ['fly', 'swim', 'climb', 'burrow'] as const) {
    const label = { fly: 'flying', swim: 'swimming', climb: 'climbing', burrow: 'burrowing' }[kind]
    let v = doc.speeds[kind] ?? 0
    if (effects.some(e => (e.type === 'set' || e.type === 'set-base') && e.subType === `innate-speed-${label}` && !e.value)) v = Math.max(v, walk)
    for (const e of effects) if ((e.type === 'set' || e.type === 'set-base') && e.subType === `innate-speed-${label}` && e.value) v = Math.max(v, e.value)
    if (v) speeds.push({ kind: label, value: v })
  }

  // Hit points.
  const hpMax = doc.hitPoints.override ?? Math.max(1, doc.hitPoints.base + mods.con * level + doc.hitPoints.bonus + sumBonus('hit-points-per-level') * level + sumBonus('hit-points'))
  const hp = { max: hpMax, current: Math.max(0, hpMax - state.hpRemoved), temp: state.tempHp }

  const hitDiceMap = new Map<number, number>()
  for (const c of doc.classes) hitDiceMap.set(c.hitDie, (hitDiceMap.get(c.hitDie) || 0) + c.level)
  const hitDice = [...hitDiceMap].sort((a, b) => b[0] - a[0]).map(([die, total]) => ({ die, total, used: Math.min(total, state.hitDiceUsed[String(die)] || 0) }))

  // Senses and defenses.
  const senseMap = new Map<string, number>()
  for (const e of effects) {
    if ((e.type === 'set-base' || e.type === 'sense') && ['darkvision', 'blindsight', 'tremorsense', 'truesight'].includes(e.subType)) senseMap.set(e.subType, Math.max(senseMap.get(e.subType) || 0, e.value ?? 0))
  }
  for (const e of of('bonus').filter(e => ['darkvision', 'blindsight', 'tremorsense', 'truesight'].includes(e.subType))) senseMap.set(e.subType, (senseMap.get(e.subType) || 0) + (e.value ?? 0))
  const senses = [...senseMap].filter(([, v]) => v > 0).map(([k, v]) => `${title(k)} ${v} ft`)
  const uniq = (xs: string[]) => [...new Set(xs)]
  const defenses = {
    resistances: uniq(of('resistance').map(e => title(e.subType))),
    immunities: uniq(of('immunity').filter(e => !/^(blinded|charmed|deafened|exhaustion|frightened|grappled|incapacitated|invisible|paralyzed|petrified|poisoned|prone|restrained|stunned|unconscious)$/.test(e.subType)).map(e => title(e.subType))),
    vulnerabilities: uniq(of('vulnerability').map(e => title(e.subType))),
    conditionImmunities: uniq(of('immunity').filter(e => /^(blinded|charmed|deafened|exhaustion|frightened|grappled|incapacitated|invisible|paralyzed|petrified|poisoned|prone|restrained|stunned|unconscious)$/.test(e.subType)).map(e => title(e.subType))),
  }
  const savingThrowNotes = uniq(of('advantage').filter(e => /saving-throws$/.test(e.subType)).map(e => `Advantage on ${e.subType === 'saving-throws' ? 'saving throws' : title(e.subType.replace('-saving-throws', '')) + ' saves'}${e.restriction ? ` ${e.restriction}` : ''}`))

  // Proficiencies.
  const profEffects = of('proficiency').map(e => e.subType).concat(of('expertise').map(e => e.subType))
  const armorP = profEffects.filter(s => ARMOR_PROF_NAMES[s]).map(s => ARMOR_PROF_NAMES[s])
  const weaponP = profEffects.filter(s => !NOT_WEAPON.has(s) && !TOOL_HINT.test(s) && (WEAPON_GROUPS[s] || !/-saving-throws$/.test(s))).map(s => WEAPON_GROUPS[s] || title(s.replace(/^crossbow-hand$/, 'crossbow, hand')))
  const toolP = profEffects.filter(s => TOOL_HINT.test(s) && !SKILL_KEYS.has(s)).map(s => title(s).replace(/s Tools$/, 's’ Tools').replace(/^Thieves Tools$/, 'Thieves’ Tools'))
  const sortU = (xs: string[]) => uniq(xs).sort((a, b) => a.localeCompare(b))
  const proficiencies = {
    armor: sortU([...armorP, ...doc.extraProficiencies.armor]),
    weapons: sortU([...weaponP, ...doc.extraProficiencies.weapons]),
    tools: sortU([...toolP, ...doc.extraProficiencies.tools]),
    languages: sortU([...of('language').map(e => title(e.subType).replace(/s Cant$/, 's’ Cant').replace(/^Thieves Cant$/, 'Thieves’ Cant')), ...doc.extraProficiencies.languages]),
  }
  const weaponProfSlugs = new Set([...profEffects, ...doc.extraProficiencies.weapons.map(w => w.toLowerCase().replace(/,\s*/g, '-').replace(/[^a-z0-9]+/g, '-'))])

  // Limited-use resources.
  const resources: Resource[] = []
  const resource = (u: LimitedUse | undefined, name: string, source: string): Resource | undefined => {
    if (!u) return undefined
    const max = resolveUses(u, pb, mods)
    if (max <= 0) return undefined
    const r: Resource = { key: u.key, name, max, used: Math.min(max, state.used[u.key] || 0), reset: u.reset, source }
    resources.push(r)
    return r
  }

  // Attacks.
  const hasWeaponMastery = doc.features.some(f => /^Weapon Mastery\b/.test(f.name))
  const attacks: AttackRow[] = []
  const atkBonus = (kind: 'melee' | 'ranged') => sumBonus('weapon-attacks', `${kind}-weapon-attacks`, `${kind}-attacks`)
  const dmgBonus = (kind: 'melee' | 'ranged') => sumBonus('weapon-damage', `${kind}-weapon-damage`)
  for (const item of doc.inventory) {
    const w = item.weapon
    if (!w || !item.equipped || item.custom?.hideFromAttacks) continue
    const finesse = w.properties.includes('Finesse')
    const thrown = w.properties.includes('Thrown')
    const ability: Ability = finesse ? (mods.dex >= mods.str ? 'dex' : 'str') : w.kind === 'ranged' ? 'dex' : 'str'
    const proficient = item.custom?.proficient ?? (weaponProfSlugs.has(`${w.category}-weapons`) || weaponProfSlugs.has(w.base) || weaponProfSlugs.has(`${w.base}s`))
    const magic = item.magicBonus ?? 0
    const toHit = mods[ability] + (proficient ? pb : 0) + magic + (item.custom?.hitBonus ?? 0) + atkBonus(w.kind)
    const dmgMod = mods[ability] + magic + (item.custom?.damageBonus ?? 0) + dmgBonus(w.kind)
    const damage = w.damage ? `${w.damage}${dmgMod ? (dmgMod > 0 ? `+${dmgMod}` : `${dmgMod}`) : ''}` : `${Math.max(1, 1 + dmgMod)}`
    const extraDamage = item.effects.filter(e => e.type === 'damage' && (!e.requiresAttunement || item.attuned)).map(e => ({ dice: e.dice || String(e.value ?? ''), type: e.subType, note: e.restriction || undefined }))
    const reach = w.properties.includes('Reach') ? 10 : 5
    let range: string; let rangeNote: string
    if (w.kind === 'ranged' || thrown) { range = `${w.range}`; rangeNote = `(${w.longRange})` } else { range = `${reach} ft.`; rangeNote = 'Reach' }
    const versatile = w.properties.find(p => /^Versatile/.test(p))
    const notes = [
      ...extraDamage.map(x => `+${x.dice} ${x.type}`),
      ...(item.uses ? [`${resolveUses(item.uses, pb, mods)} charge${resolveUses(item.uses, pb, mods) === 1 ? '' : 's'}`] : []),
      w.category === 'martial' ? 'Martial' : w.category === 'simple' ? 'Simple' : '',
      ...(!hasWeaponMastery && w.mastery ? [w.mastery] : []),
      ...w.properties.filter(p => p !== 'Range' && (p !== 'Reach' || w.kind === 'melee')),
      ...(w.kind === 'ranged' || thrown ? [`Range (${w.range}/${w.longRange})`] : []),
      ...(item.custom?.notes ?? []),
    ].filter(Boolean)
    attacks.push({
      id: `atk-${item.id}`, itemId: item.id, name: item.custom?.name || item.name,
      subtitle: `${w.kind === 'ranged' ? 'Ranged' : 'Melee'} Weapon${item.custom?.name ? ` · ${item.name}` : ''}${item.homebrew ? ' · Custom' : ''}`,
      rarity: item.rarity, range, rangeNote, ability, proficient, toHit, damage, damageType: w.damageType, extraDamage,
      versatile, mastery: hasWeaponMastery ? w.mastery : undefined, notes,
      resource: resource(item.uses, item.custom?.name || item.name, 'Item'),
    })
  }
  attacks.sort((a, b) => a.name.localeCompare(b.name))
  const unarmedBonus = mods.str + pb + atkBonus('melee')
  attacks.push({
    id: 'atk-unarmed', name: 'Unarmed Strike', subtitle: 'Melee Attack', rarity: 'common', range: '5 ft.', rangeNote: 'Reach',
    ability: 'str', proficient: true, toHit: unarmedBonus, damage: String(Math.max(1, 1 + mods.str)), damageType: 'bludgeoning', extraDamage: [], notes: [],
  })

  // Actions (features with activations + spells with limited uses that act like actions).
  const actionMeta = (a: ActionEntry) => [
    a.activation === 'action' ? 'Action' : a.activation === 'bonus' ? 'Bonus action' : a.activation === 'reaction' ? 'Reaction' : 'Special',
    a.source.kind === 'custom' ? 'Custom' : a.source.label !== a.name ? a.source.label : '',
  ].filter(Boolean).join(' · ')
  const actions: ActionRow[] = doc.actions.map(a => ({
    id: a.id, name: a.name, activation: a.activation, meta: actionMeta(a), description: a.description, snippet: a.snippet, dice: a.dice,
    resource: resource(a.uses, a.name, a.source.label), kind: 'action' as const,
  }))
  for (const item of doc.inventory) {
    if (item.uses && !item.weapon && item.equipped) resource(item.uses, item.custom?.name || item.name, 'Item')
  }

  // Spellcasting.
  const spellcasting: SpellcastingBlock[] = doc.spellSources.map(src => {
    const ability = src.ability
    const dc = src.fixedDc ?? (ability ? 8 + pb + mods[ability] + sumBonus('spell-save-dc') : null)
    const attack = src.fixedAttack ?? (ability ? pb + mods[ability] + sumBonus('spell-attacks') : null)
    const spells = src.spells.map(s => ({ ...s, resource: resource(s.uses, s.name, src.label) }))
    return { id: src.id, label: src.label, ability, dc, attack, spells }
  })
  for (const block of spellcasting) {
    for (const s of block.spells) {
      if (!s.uses || s.activation === 'special') continue
      const lvl = s.castAtLevel ?? s.level
      actions.push({
        id: `act-${s.id}`, name: s.name, activation: s.activation,
        meta: [s.activation === 'action' ? 'Action' : s.activation === 'bonus' ? 'Bonus action' : 'Reaction', block.label, lvl ? `${ordinal(lvl)} level` : 'Cantrip'].join(' · '),
        description: s.description, dice: s.castDice ?? s.dice ?? undefined, resource: s.resource, kind: 'spell',
      })
    }
  }

  // Inventory summary.
  const byId = new Map(doc.inventory.map(i => [i.id, i]))
  const multiplierFor = (i: Item): number => {
    let m = 1
    let parent = i.containerId ? byId.get(i.containerId) : undefined
    const seen = new Set<string>()
    while (parent && !seen.has(parent.id)) {
      seen.add(parent.id)
      m *= parent.contentsWeightMultiplier ?? 1
      parent = parent.containerId ? byId.get(parent.containerId) : undefined
    }
    return m
  }
  let weight = doc.inventory.reduce((t, i) => t + (i.weight * i.quantity / (i.bundleSize || 1)) * multiplierFor(i), 0)
  if (!doc.preferences.ignoreCoinWeight) weight += (doc.currency.cp + doc.currency.sp + doc.currency.ep + doc.currency.gp + doc.currency.pp) / 50
  const sizeMult = { tiny: 0.5, small: 1, medium: 1, large: 2, huge: 4, gargantuan: 8 }[doc.identity.size]
  const capacity = scores.str * 15 * sizeMult
  const attuneMax = 3 + sumBonus('attunement-slots')

  const classLabel = doc.classes.map(c => `${c.name} ${c.level}${c.subclass ? ` (${c.subclass})` : ''}`).join(' / ')
  const lvlIdx = Math.min(level, 20) - 1
  return {
    name: doc.name, level, pb, classLabel,
    xp: { current: doc.xp, levelStart: XP_TABLE[lvlIdx], nextLevel: level >= 20 ? null : XP_TABLE[lvlIdx + 1] },
    abilities, skills,
    passives: { perception: passive('perception'), investigation: passive('investigation'), insight: passive('insight') },
    initiative: mods.dex + sumBonus('initiative'),
    ac: { value: acValue, breakdown },
    speeds, hp, hitDice, senses, defenses, savingThrowNotes, proficiencies,
    attacks, actions, combatActions: COMBAT_ACTIONS[doc.preferences.combatActions],
    spellcasting, resources,
    inventory: { weight: Math.round(weight * 100) / 100, capacity, attuned: doc.inventory.filter(i => i.attuned).length, attuneMax },
    hasWeaponMastery,
    spellSlots: (SLOT_TABLE[Math.min(20, casterLevel(doc.classes))] || []).map((max, i) => ({ level: i + 1, max, used: Math.min(max, state.slotsUsed[String(i + 1)] || 0) })),
    pactSlots: (() => {
      const warlock = doc.classes.filter(c => c.spellcasting?.progression === 'pact').reduce((t, c) => t + c.level, 0)
      const p = pactMagic(warlock)
      return p ? { ...p, used: Math.min(p.max, state.slotsUsed.pact || 0) } : null
    })(),
  }
}

export const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`
