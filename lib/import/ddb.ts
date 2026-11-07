// D&D Beyond character JSON (character-service v5) → CharacterDoc + initial PlayState.
//
// Only public characters can be fetched. The URL is parsed for its numeric id and the request
// always goes to D&D Beyond's fixed character-service host.

import { sanitizeHtml, htmlToText } from '../sheet/sanitize'
import type {
  Ability, Activation, ActionEntry, CharacterDoc, ClassEntry, Edition, Effect, Feature, Item,
  LimitedUse, PlayState, ResetType, SourceRef, SpellEntry, SpellSource, WeaponData, ArmorData,
} from '../sheet/types'
import { emptyPlayState } from '../sheet/types'

type Json = any

const STAT: Record<number, Ability> = { 1: 'str', 2: 'dex', 3: 'con', 4: 'int', 5: 'wis', 6: 'cha' }
const SIZE: Record<number, CharacterDoc['identity']['size']> = { 2: 'tiny', 3: 'small', 4: 'medium', 5: 'large', 6: 'huge', 7: 'gargantuan' }
const ALIGNMENT: Record<number, string> = { 1: 'Lawful Good', 2: 'Neutral Good', 3: 'Chaotic Good', 4: 'Lawful Neutral', 5: 'Neutral', 6: 'Chaotic Neutral', 7: 'Lawful Evil', 8: 'Neutral Evil', 9: 'Chaotic Evil' }
export const DDB_CONDITIONS: Record<number, string> = { 1: 'Blinded', 2: 'Charmed', 3: 'Deafened', 4: 'Exhaustion', 5: 'Frightened', 6: 'Grappled', 7: 'Incapacitated', 8: 'Invisible', 9: 'Paralyzed', 10: 'Petrified', 11: 'Poisoned', 12: 'Prone', 13: 'Restrained', 14: 'Stunned', 15: 'Unconscious' }
const MASTERY = new Set(['Cleave', 'Graze', 'Nick', 'Push', 'Sap', 'Slow', 'Topple', 'Vex'])
/** D&D Beyond source ids for the 2024 core books and free rules. */
const SOURCES_2024 = new Set([145, 146, 147, 148])
const ITEM_ENTITY_TYPE = 1439493548

// Base-item ids used by D&D Beyond proficiency overrides (characterValues typeId 32/33).
// Weapon ids were checked against base items on an imported sheet; 17 (Shortbow) was inferred.
const DDB_WEAPON_BASE: Record<number, string> = { 3: 'Dagger', 8: 'Javelin', 17: 'Shortbow', 18: 'Sling', 23: 'Halberd', 28: 'Rapier', 29: 'Scimitar', 37: 'Longbow' }
const DDB_ARMOR_BASE: Record<number, string> = { 3: 'Chain Shirt', 12: 'Studded Leather' }

export function parseDdbCharacterId(input: string): string | null {
  const s = String(input || '').trim()
  if (/^\d{3,12}$/.test(s)) return s
  const m = /dndbeyond\.com\/(?:profile\/[^/]+\/)?characters\/(\d{3,12})/i.exec(s)
  return m ? m[1] : null
}

export async function fetchDdbCharacter(id: string, fetchImpl: typeof fetch = fetch): Promise<Json> {
  if (!/^\d{3,12}$/.test(id)) throw new Error('Invalid D&D Beyond character id')
  const res = await fetchImpl(`https://character-service.dndbeyond.com/character/v5/character/${id}?includeCustomItems=true`, {
    headers: { Accept: 'application/json', 'User-Agent': 'Regenerist character sheet' },
    cache: 'no-store',
  })
  if (res.status === 403 || res.status === 404) throw new Error('D&D Beyond refused this character. Set its privacy to Public and try again.')
  if (!res.ok) throw new Error(`D&D Beyond returned ${res.status}`)
  const body = await res.json()
  if (!body?.success || !body?.data) throw new Error(body?.message || 'D&D Beyond did not return a character')
  return body.data
}

/** D&D Beyond rules text can contain templates like {{scalevalue}}; fill what we know, drop the rest. */
function fillTemplates(text: string | null | undefined, scale?: string | null): string {
  if (!text) return ''
  return String(text)
    .replace(/\{\{\s*scalevalue\s*\}\}/gi, scale || 'extra')
    .replace(/\{\{[^}]*\}\}/g, '')
}

const slug = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/,\s*/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d)

function reset(r: unknown): ResetType {
  if (r === 1 || r === 'Short Rest' || r === 'ShortRest') return 'short'
  if (r === 2 || r === 'Long Rest' || r === 'LongRest') return 'long'
  if (r === 3 || r === 'Dawn') return 'dawn'
  if (r === 'Dusk') return 'dusk'
  if (r === 'Consumable') return 'consumable'
  return 'other'
}

function activation(type: unknown): Activation {
  if (type === 1) return 'action'
  if (type === 3) return 'bonus'
  if (type === 4) return 'reaction'
  return 'special'
}

function toEffect(m: Json, source: SourceRef): Effect {
  return {
    type: String(m.type), subType: String(m.subType),
    value: m.fixedValue ?? m.value ?? null,
    ability: m.statId ? STAT[m.statId] ?? null : null,
    dice: m.dice?.diceString ?? m.die?.diceString ?? null,
    restriction: m.restriction || null,
    requiresAttunement: !!m.requiresAttunement,
    source,
  }
}

function limitedUse(lu: Json, key: string): LimitedUse | undefined {
  if (!lu) return undefined
  const ability = lu.statModifierUsesId ? STAT[lu.statModifierUsesId] ?? null : null
  const addPb = !!lu.useProficiencyBonus
  const max = num(lu.maxUses)
  if (max <= 0 && !ability && !addPb) return undefined
  return { max, ability, addPb: addPb || undefined, reset: reset(lu.resetType), key }
}

function editionOf(sources: Json[] | undefined): Edition | null {
  if (!Array.isArray(sources) || !sources.length) return null
  if (sources.some(s => SOURCES_2024.has(s.sourceId))) return '2024'
  return '2014'
}

function durationText(d: Json): string {
  if (!d) return ''
  if (d.durationType === 'Instantaneous' || d.durationType === 'Special') return d.durationType
  const unit = d.durationUnit ? `${d.durationInterval} ${String(d.durationUnit).toLowerCase()}${d.durationInterval === 1 ? '' : 's'}` : ''
  if (d.durationType === 'Concentration') return `Concentration, up to ${unit}`
  if (d.durationType === 'Until Dispelled') return 'Until dispelled'
  return unit || String(d.durationType || '')
}

function castingTime(a: Json): string {
  if (!a) return ''
  const t = a.activationTime || 1
  switch (a.activationType) {
    case 1: return `${t} action`
    case 3: return `${t} bonus action`
    case 4: return `${t} reaction`
    case 6: return `${t} minute${t === 1 ? '' : 's'}`
    case 7: return `${t} hour${t === 1 ? '' : 's'}`
    default: return 'Special'
  }
}

function rangeText(r: Json): string {
  if (!r) return ''
  const aoe = r.aoeType ? ` (${r.aoeValue}-ft ${String(r.aoeType).toLowerCase()})` : ''
  if (r.origin === 'Ranged') return `${r.rangeValue} ft${aoe}`
  return `${r.origin}${aoe}`
}

export interface DdbImportResult {
  doc: CharacterDoc
  state: PlayState
  avatarUrl: string | null
}

export function convertDdbCharacter(c: Json, now = new Date()): DdbImportResult {
  const charId = String(c.id)
  const stats: Record<Ability, number> = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
  for (const s of c.stats || []) if (STAT[s.id]) stats[STAT[s.id]] = num(s.value, 10)
  const override: Partial<Record<Ability, number>> = {}
  for (const s of c.overrideStats || []) if (STAT[s.id] && typeof s.value === 'number') override[STAT[s.id]] = s.value

  const effects: Effect[] = []
  for (const s of c.bonusStats || []) {
    if (STAT[s.id] && typeof s.value === 'number' && s.value) {
      effects.push({ type: 'bonus', subType: `${({ str: 'strength', dex: 'dexterity', con: 'constitution', int: 'intelligence', wis: 'wisdom', cha: 'charisma' } as const)[STAT[s.id]]}-score`, value: s.value, source: { kind: 'custom', label: 'Other bonus' } })
    }
  }

  // Lookups for labelling effects by what granted them.
  const raceTraits = new Map<number, string>((c.race?.racialTraits || []).map((t: Json) => [t.definition.id, t.definition.name]))
  const classFeatureNames = new Map<number, string>()
  for (const cls of c.classes || []) for (const f of cls.classFeatures || []) classFeatureNames.set(f.definition.id, f.definition.name)
  const featNames = new Map<number, string>((c.feats || []).map((f: Json) => [f.definition.id, f.definition.name]))
  const speciesName = c.race?.fullName || c.race?.baseName || 'Unknown'
  const backgroundName = c.background?.definition?.name || c.background?.customBackground?.name || null

  const groups: Array<[string, SourceRef['kind'], (id: number) => string]> = [
    ['race', 'species', id => raceTraits.get(id) || speciesName],
    ['class', 'class', id => classFeatureNames.get(id) || 'Class'],
    ['background', 'background', () => backgroundName || 'Background'],
    ['feat', 'feat', id => featNames.get(id) || 'Feat'],
  ]
  for (const [key, kind, label] of groups) {
    for (const m of c.modifiers?.[key] || []) effects.push(toEffect(m, { kind, id: String(m.componentId), label: label(m.componentId) }))
  }
  // Item modifiers are attached to each item (they only apply while equipped/attuned).

  // Classes.
  const classes: ClassEntry[] = (c.classes || []).map((cls: Json) => {
    const def = cls.definition || {}
    const sub = cls.subclassDefinition
    const rules = def.canCastSpells ? def.spellRules : sub?.spellRules
    const divisor = rules?.multiClassSpellSlotDivisor
    const ability = def.spellCastingAbilityId ? STAT[def.spellCastingAbilityId] : null
    const progression = def.name === 'Warlock' ? 'pact' : def.name === 'Artificer' ? 'artificer' : divisor === 1 ? 'full' : divisor === 2 ? 'half' : divisor === 3 ? 'third' : null
    const subAbility = sub?.spellCastingAbilityId ? STAT[sub.spellCastingAbilityId] : null
    const casts = def.canCastSpells || sub?.canCastSpells
    return {
      name: def.name, subclass: sub?.name ?? null, level: num(cls.level, 1), hitDie: num(def.hitDice, 8),
      isStartingClass: !!cls.isStartingClass, edition: editionOf(def.sources) ?? '2014',
      spellcasting: casts && (ability || subAbility) && progression ? { ability: (ability || subAbility)!, progression } : null,
    }
  })

  // Features.
  const features: Feature[] = []
  const HIDDEN_FEATURES = new Set(['Hit Points', 'Proficiencies', 'Equipment', 'Ability Score Increase', 'Age', 'Alignment', 'Size', 'Speed', 'Languages', 'Creature Type'])
  const levelScaleDice = new Map<string, string>()
  for (const cls of c.classes || []) {
    const subId = cls.subclassDefinition?.id
    const byName = new Map<string, Feature>()
    for (const f of cls.classFeatures || []) {
      const d = f.definition
      if (!d || d.hideInSheet || HIDDEN_FEATURES.has(d.name) || d.requiredLevel > cls.level) continue
      if (f.levelScale?.dice?.diceString) levelScaleDice.set(d.name, f.levelScale.dice.diceString)
      const isSub = subId != null && d.classId === subId
      const existing = byName.get(d.name)
      if (existing) continue
      const name = f.levelScale?.description && d.name === 'Sneak Attack' ? `${d.name} (${f.levelScale.description})` : d.name
      const feat: Feature = {
        id: `class-${d.id}`, name,
        source: { kind: isSub ? 'subclass' : 'class', id: String(d.id), label: isSub ? cls.subclassDefinition.name : cls.definition.name },
        level: d.requiredLevel, description: sanitizeHtml(fillTemplates(d.description, f.levelScale?.description)), snippet: htmlToText(fillTemplates(d.snippet, f.levelScale?.description)) || undefined,
      }
      byName.set(d.name, feat)
      features.push(feat)
    }
  }
  for (const t of c.race?.racialTraits || []) {
    const d = t.definition
    if (!d || d.hideInSheet || HIDDEN_FEATURES.has(d.name)) continue
    features.push({ id: `race-${d.id}`, name: d.name, source: { kind: 'species', id: String(d.id), label: speciesName }, description: sanitizeHtml(d.description), snippet: htmlToText(d.snippet) || undefined })
  }
  const bg = c.background?.definition
  if (bg?.featureName) {
    features.push({ id: `bg-${bg.id}`, name: bg.featureName, source: { kind: 'background', id: String(bg.id), label: bg.name }, description: sanitizeHtml(bg.featureDescription) })
  }
  for (const f of c.feats || []) {
    const d = f.definition
    features.push({ id: `feat-${d.id}`, name: d.name, source: { kind: 'feat', id: String(d.id), label: 'Feat' }, description: sanitizeHtml(d.description), snippet: htmlToText(d.snippet) || undefined })
  }

  // Actions.
  const actions: ActionEntry[] = []
  const actionKinds: Array<[string, SourceRef['kind']]> = [['race', 'species'], ['class', 'class'], ['background', 'background'], ['feat', 'feat'], ['item', 'item']]
  for (const [key, kind] of actionKinds) {
    for (const a of c.actions?.[key] || []) {
      const id = `action-${key}-${a.id}`
      actions.push({
        id, name: a.name, activation: activation(a.activation?.activationType ?? a.actionType),
        source: { kind, id: String(a.componentId), label: classFeatureNames.get(a.componentId) || raceTraits.get(a.componentId) || a.name },
        description: sanitizeHtml(fillTemplates(a.description, levelScaleDice.get(a.name))), snippet: htmlToText(fillTemplates(a.snippet, levelScaleDice.get(a.name))) || undefined,
        uses: limitedUse(a.limitedUse, id),
        dice: a.dice?.diceString || levelScaleDice.get(a.name) || undefined,
        save: a.saveStatId && STAT[a.saveStatId] && a.fixedSaveDc ? { ability: STAT[a.saveStatId], dc: a.fixedSaveDc } : undefined,
      })
    }
  }
  for (const a of c.customActions || []) {
    actions.push({
      id: `action-custom-${a.id}`, name: a.name, activation: activation(a.activationType ?? a.actionType),
      source: { kind: 'custom', label: 'Custom' }, description: sanitizeHtml(a.description), snippet: htmlToText(a.snippet) || undefined,
      dice: a.diceCount && a.diceType ? `${a.diceCount}d${a.diceType}${a.fixedValue ? `+${a.fixedValue}` : ''}` : undefined,
    })
  }

  // Item customizations live in characterValues keyed by inventory id.
  const custom = new Map<string, NonNullable<Item['custom']>>()
  const extraProficiencies = { armor: [] as string[], weapons: [] as string[], tools: [] as string[], languages: [] as string[] }
  for (const v of c.characterValues || []) {
    if (v.valueTypeId === String(ITEM_ENTITY_TYPE) || v.valueTypeId === ITEM_ENTITY_TYPE) {
      const k = String(v.valueId)
      const entry = custom.get(k) || {}
      switch (v.typeId) {
        case 8: entry.name = String(v.value); break
        case 9: (entry.notes ||= []).push(String(v.value)); break
        case 10: entry.damageBonus = Number(v.value) || 0; break
        case 12: entry.hitBonus = Number(v.value) || 0; break
        // Matches D&D Beyond's sheet: items flagged with typeId 18 are left out of the attack list.
        case 18: if (v.value === true || v.value === 'True' || v.value === 'true') entry.hideFromAttacks = true; break
      }
      custom.set(k, entry)
    } else if (v.typeId === 33 && Number(v.value) >= 3) {
      extraProficiencies.weapons.push(DDB_WEAPON_BASE[Number(v.valueId)] || `Weapon #${v.valueId}`)
    } else if (v.typeId === 32 && Number(v.value) >= 3) {
      extraProficiencies.armor.push(DDB_ARMOR_BASE[Number(v.valueId)] || `Armor #${v.valueId}`)
    }
  }
  for (const p of c.customProficiencies || []) {
    const name = String(p.name || '').trim()
    if (!name) continue
    const bucket = p.type === 1 ? 'weapons' : p.type === 2 ? 'armor' : p.type === 4 ? 'languages' : 'tools'
    extraProficiencies[bucket].push(name)
  }

  // Inventory.
  const itemEditions = new Set<Edition>()
  const inventory: Item[] = (c.inventory || []).map((i: Json): Item => {
    const d = i.definition || {}
    const id = String(i.id)
    const ed = editionOf(d.sources)
    if (ed) itemEditions.add(ed)
    const source: SourceRef = { kind: 'item', id, label: custom.get(id)?.name || d.name }
    const granted: Json[] = d.grantedModifiers || []
    const magicBonus = granted.filter(m => m.type === 'bonus' && m.subType === 'magic').reduce((a, m) => a + num(m.fixedValue ?? m.value), 0)
    let weapon: WeaponData | undefined
    if (d.filterType === 'Weapon' && d.damage?.diceString !== undefined && d.attackType) {
      let props: string[] = (d.properties || []).map((p: Json) => p.name)
      const ignore = new Set(granted.filter(m => m.type === 'ignore-weapon-property').map(m => String(m.subType).toLowerCase()))
      props = props.filter(p => !ignore.has(slug(p)))
      for (const m of granted.filter(m => m.type === 'weapon-property')) {
        const name = String(m.subType).replace(/(^|-)([a-z])/g, (_x: string, a: string, b: string) => (a ? ' ' : '') + b.toUpperCase())
        if (!props.includes(name)) props.push(name)
      }
      const mastery = props.find(p => MASTERY.has(p))
      weapon = {
        base: slug(d.type || d.name), category: d.categoryId === 1 ? 'simple' : d.categoryId === 2 ? 'martial' : 'other',
        kind: d.attackType === 2 ? 'ranged' : 'melee', damage: d.damage?.diceString ?? null,
        damageType: String(d.damageType || '').toLowerCase(), range: num(d.range, 5), longRange: num(d.longRange, num(d.range, 5)),
        properties: props.filter(p => !MASTERY.has(p)), mastery,
      }
    }
    let armor: ArmorData | undefined
    if (d.filterType === 'Armor' && d.armorTypeId) {
      armor = { type: ({ 1: 'light', 2: 'medium', 3: 'heavy', 4: 'shield' } as const)[d.armorTypeId as 1 | 2 | 3 | 4] ?? 'light', baseAc: num(d.armorClass), stealthDisadvantage: d.stealthCheck === 2, strengthRequirement: d.strengthRequirement ?? null }
    }
    const rarity = String(d.rarity || 'unknown').toLowerCase() as Item['rarity']
    return {
      id, name: d.name || 'Unnamed item', type: d.filterType || (d.isHomebrew ? 'Custom' : 'Gear'), subtype: d.type || undefined,
      rarity: (['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact', 'varies'] as const).includes(rarity as never) ? rarity : 'unknown',
      quantity: num(i.quantity, 1), weight: num(d.weight), bundleSize: num(d.bundleSize, 1) || 1,
      equipped: !!i.equipped, attuned: !!i.isAttuned, canAttune: !!d.canAttune, attunementDescription: d.attunementDescription || undefined,
      containerId: i.containerEntityId != null && String(i.containerEntityId) !== charId ? String(i.containerEntityId) : null,
      isContainer: !!d.isContainer, contentsWeightMultiplier: d.isContainer ? num(d.weightMultiplier, 1) : undefined,
      magic: !!d.magic || magicBonus > 0, magicBonus: magicBonus || undefined,
      description: sanitizeHtml(d.description), weapon, armor,
      effects: granted.filter(m => !(m.type === 'bonus' && m.subType === 'magic') && m.type !== 'ignore-weapon-property' && m.type !== 'weapon-property').map(m => toEffect(m, source)),
      uses: i.limitedUse ? limitedUse({ ...i.limitedUse, resetType: i.limitedUse.resetType }, `item-${id}`) : undefined,
      custom: custom.get(id),
      homebrew: !!d.isHomebrew || !d.sources?.length,
    }
  })

  // Spells.
  const itemByDefinition = new Map<number, Item>()
  for (const i of c.inventory || []) itemByDefinition.set(i.definition?.id, inventory.find(x => x.id === String(i.id))!)
  const spellSources: SpellSource[] = []
  const pushSpell = (sourceKey: string, label: string, ability: Ability | null, s: Json) => {
    let src = spellSources.find(x => x.id === sourceKey)
    if (!src) { src = { id: sourceKey, label, ability, spells: [] }; spellSources.push(src) }
    const d = s.definition || {}
    const dmg = (d.modifiers || []).find((m: Json) => m.type === 'damage' && m.die?.diceString)
    const heal = (d.modifiers || []).find((m: Json) => m.type === 'bonus' && m.subType === 'hit-points' && m.die?.diceString)
    const key = `spell-${sourceKey}-${s.id ?? d.id}`
    const scaled = dmg || heal
    let castDice: string | null = null
    const per = scaled?.atHigherLevels?.higherLevelDefinitions?.find((h: Json) => h?.dice?.diceValue)
    if (scaled?.die?.diceCount && per && s.castAtLevel && s.castAtLevel > num(d.level) && num(d.level) > 0) {
      const steps = Math.floor((s.castAtLevel - num(d.level)) / Math.max(1, num(per.level, 1)))
      const count = scaled.die.diceCount + steps * num(per.dice.diceCount, 1)
      castDice = `${count}d${scaled.die.diceValue}${scaled.die.fixedValue ? `+${scaled.die.fixedValue}` : ''}`
    }
    src.spells.push({
      id: key, name: d.name, level: num(d.level), school: d.school || '', castingTime: castingTime(s.activation || d.activation),
      activation: activation((s.activation || d.activation)?.activationType), range: rangeText(s.range || d.range),
      components: (d.components || []).map((n: number) => ({ 1: 'V', 2: 'S', 3: 'M' } as Record<number, string>)[n]).filter(Boolean).join(', ') + (d.componentsDescription ? ` (${d.componentsDescription})` : ''),
      duration: durationText(d.duration), concentration: !!d.concentration, ritual: !!d.ritual,
      description: sanitizeHtml(d.description), castAtLevel: s.castAtLevel ?? null,
      prepared: !!s.prepared, alwaysPrepared: !!s.alwaysPrepared,
      uses: limitedUse(s.limitedUse, key),
      save: d.saveDcAbilityId ? STAT[d.saveDcAbilityId] ?? null : null,
      attack: d.attackType === 1 ? 'melee' : d.attackType === 2 ? 'ranged' : null,
      dice: dmg?.die?.diceString ?? heal?.die?.diceString ?? null, castDice, damageType: dmg ? String(dmg.subType) : heal ? 'healing' : null,
    })
  }
  for (const s of c.spells?.race || []) pushSpell(`race-${s.componentId}`, raceTraits.get(s.componentId) || speciesName, STAT[s.spellCastingAbilityId] ?? null, s)
  for (const s of c.spells?.feat || []) pushSpell(`feat-${s.componentId}`, featNames.get(s.componentId) || 'Feat', STAT[s.spellCastingAbilityId] ?? null, s)
  for (const s of c.spells?.class || []) pushSpell(`classfeature-${s.componentId}`, classFeatureNames.get(s.componentId) || 'Class feature', STAT[s.spellCastingAbilityId] ?? null, s)
  for (const s of c.spells?.background || []) pushSpell(`background`, backgroundName || 'Background', STAT[s.spellCastingAbilityId] ?? null, s)
  for (const s of c.spells?.item || []) {
    const item = itemByDefinition.get(s.componentId)
    pushSpell(`item-${s.componentId}`, item ? (item.custom?.name || item.name) : 'Items', STAT[s.spellCastingAbilityId] ?? null, s)
  }
  for (const cs of c.classSpells || []) {
    const cls = (c.classes || []).find((k: Json) => k.id === cs.characterClassId)
    const entry = classes.find(k => k.name === cls?.definition?.name)
    for (const s of cs.spells || []) pushSpell(`class-${cs.characterClassId}`, entry?.name || 'Class', entry?.spellcasting?.ability ?? null, s)
  }

  const classEdition: Edition = classes.some(k => k.edition === '2024') ? '2024' : '2014'
  const speciesEdition: Edition = c.race?.isLegacy ? '2014' : editionOf(c.race?.sources) ?? classEdition
  const itemsEdition: Edition | null = itemEditions.has('2024') ? '2024' : itemEditions.has('2014') ? '2014' : null
  const rulesLabel = itemsEdition && itemsEdition !== classEdition ? `${classEdition} class · ${itemsEdition} items` : `${classEdition} rules`

  const notes = c.notes || {}
  const traits = c.traits || {}
  const walk = c.race?.weightSpeeds?.normal || {}

  const doc: CharacterDoc = {
    schema: 1, name: c.name || 'Unnamed', edition: classEdition, rulesLabel,
    identity: {
      species: speciesName, speciesEdition, background: backgroundName,
      gender: c.gender || null, age: c.age != null ? String(c.age) : null, height: c.height || null, weight: c.weight != null ? String(c.weight) : null,
      eyes: c.eyes || null, hair: c.hair || null, skin: c.skin || null, faith: c.faith || null,
      alignment: ALIGNMENT[c.alignmentId] || null, size: SIZE[c.race?.sizeId] || 'medium',
    },
    classes,
    abilities: { base: stats, override },
    speeds: { walk: num(walk.walk, 30), fly: num(walk.fly) || undefined, swim: num(walk.swim) || undefined, climb: num(walk.climb) || undefined, burrow: num(walk.burrow) || undefined },
    hitPoints: { base: num(c.baseHitPoints), bonus: num(c.bonusHitPoints), override: c.overrideHitPoints ?? null },
    xp: num(c.currentXp),
    effects, features, actions, inventory,
    currency: { cp: num(c.currencies?.cp), sp: num(c.currencies?.sp), ep: num(c.currencies?.ep), gp: num(c.currencies?.gp), pp: num(c.currencies?.pp) },
    spellSources,
    extraProficiencies,
    notes: {
      personality: traits.personalityTraits || undefined, ideals: traits.ideals || undefined, bonds: traits.bonds || undefined,
      flaws: traits.flaws || undefined, appearance: traits.appearance || undefined,
      backstory: notes.backstory || undefined, allies: notes.allies || undefined, organizations: notes.organizations || undefined,
      enemies: notes.enemies || undefined, possessions: notes.personalPossessions || undefined, holdings: notes.otherHoldings || undefined,
      other: notes.otherNotes || undefined,
    },
    preferences: {
      ignoreCoinWeight: c.preferences?.ignoreCoinWeight !== false,
      encumbrance: c.preferences?.encumbranceType === 3 ? 'variant' : c.preferences?.encumbranceType === 2 ? 'none' : 'standard',
      // D&D Beyond lists the 2024 basic actions (Study, Influence, Utilize) on every sheet.
      combatActions: '2024',
    },
    theme: { name: 'ember', accent: null },
    import: { source: 'ddb', id: charId, url: `https://www.dndbeyond.com/characters/${charId}`, importedAt: now.toISOString() },
  }

  // Trim whitespace-only notes.
  for (const k of Object.keys(doc.notes) as Array<keyof typeof doc.notes>) {
    const v = doc.notes[k]?.trim()
    if (v) doc.notes[k] = v; else delete doc.notes[k]
  }

  const state = emptyPlayState()
  state.hpRemoved = num(c.removedHitPoints)
  state.tempHp = num(c.temporaryHitPoints)
  state.inspiration = !!c.inspiration
  state.deathSaves = { success: num(c.deathSaves?.successCount), fail: num(c.deathSaves?.failCount) }
  for (const cond of c.conditions || []) {
    if (cond.id === 4) state.exhaustion = num(cond.level, 1)
    else if (DDB_CONDITIONS[cond.id]) state.conditions.push(DDB_CONDITIONS[cond.id])
  }
  for (const i of c.inventory || []) if (i.limitedUse?.numberUsed) state.used[`item-${i.id}`] = i.limitedUse.numberUsed
  for (const a of doc.actions) {
    const raw = [...(c.actions?.race || []), ...(c.actions?.class || []), ...(c.actions?.feat || [])].find((x: Json) => a.id.endsWith(`-${x.id}`))
    if (a.uses && raw?.limitedUse?.numberUsed) state.used[a.uses.key] = raw.limitedUse.numberUsed
  }
  for (const src of doc.spellSources) for (const s of src.spells) {
    const raw = Object.values(c.spells || {}).flat().find((x: Json) => s.id.endsWith(`-${x?.id ?? ''}`)) as Json
    if (s.uses && raw?.limitedUse?.numberUsed) state.used[s.uses.key] = raw.limitedUse.numberUsed
  }
  for (const slot of c.spellSlots || []) if (slot.used) state.slotsUsed[String(slot.level)] = slot.used
  for (const slot of c.pactMagic || []) if (slot.used) state.slotsUsed.pact = (state.slotsUsed.pact || 0) + slot.used
  for (const cls of c.classes || []) if (cls.hitDiceUsed) state.hitDiceUsed[String(cls.definition.hitDice)] = (state.hitDiceUsed[String(cls.definition.hitDice)] || 0) + cls.hitDiceUsed

  return { doc, state, avatarUrl: c.decorations?.avatarUrl || null }
}
