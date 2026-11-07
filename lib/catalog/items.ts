// Item catalog from the local 5etools-format data (data/items-base.json, data/items.json; 2014 books),
// converted into sheet Items with their mechanical effects. Server-only (reads the filesystem).

import fs from 'node:fs'
import path from 'node:path'
import { sanitizeHtml } from '../sheet/sanitize'
import type { ArmorData, Effect, Item, SourceRef, WeaponData } from '../sheet/types'

type Raw = any

export interface CatalogItem {
  key: string
  name: string
  source: string
  type: string
  rarity: Item['rarity']
  weight: number
  attunement: boolean
  magic: boolean
}

const TYPE_LABEL: Record<string, string> = {
  M: 'Weapon', R: 'Weapon', A: 'Ammunition', AF: 'Ammunition', LA: 'Armor', MA: 'Armor', HA: 'Armor', S: 'Shield',
  G: 'Gear', P: 'Potion', RG: 'Ring', RD: 'Rod', WD: 'Wand', SC: 'Scroll', INS: 'Instrument', AT: "Artisan's tools", T: 'Tools',
  GS: 'Gaming set', SCF: 'Spellcasting focus', FD: 'Food and drink', TG: 'Trade good', OTH: 'Other', EXP: 'Explosive',
  $A: 'Treasure', $G: 'Gemstone', $C: 'Coinage', TAH: 'Tack and harness',
}
const SKIP_TYPES = new Set(['MNT', 'VEH', 'SHP', 'AIR', 'SPC', 'IDG'])
const DMG_TYPE: Record<string, string> = { B: 'bludgeoning', P: 'piercing', S: 'slashing', N: 'necrotic', R: 'radiant', F: 'fire', C: 'cold', L: 'lightning', T: 'thunder', O: 'force', A: 'acid', I: 'poison', Y: 'psychic' }
const PROPERTY: Record<string, string> = { F: 'Finesse', L: 'Light', H: 'Heavy', R: 'Reach', T: 'Thrown', '2H': 'Two-Handed', V: 'Versatile', A: 'Ammunition', LD: 'Loading', S: 'Special', RLD: 'Reload', BF: 'Burst Fire' }
const ABILITY_SLUG: Record<string, string> = { str: 'strength', dex: 'dexterity', con: 'constitution', int: 'intelligence', wis: 'wisdom', cha: 'charisma' }

/** 2024 Player's Handbook weapon mastery properties for base weapons. */
export const WEAPON_MASTERY: Record<string, string> = {
  club: 'Slow', dagger: 'Nick', greatclub: 'Push', handaxe: 'Vex', javelin: 'Slow', 'light hammer': 'Nick', mace: 'Sap', quarterstaff: 'Topple',
  sickle: 'Nick', spear: 'Sap', dart: 'Vex', 'light crossbow': 'Slow', shortbow: 'Vex', sling: 'Slow', battleaxe: 'Topple', flail: 'Sap',
  glaive: 'Graze', greataxe: 'Cleave', greatsword: 'Graze', halberd: 'Cleave', lance: 'Topple', longsword: 'Sap', maul: 'Topple',
  morningstar: 'Sap', pike: 'Push', rapier: 'Vex', scimitar: 'Nick', shortsword: 'Vex', trident: 'Topple', warhammer: 'Push',
  'war pick': 'Sap', whip: 'Slow', blowgun: 'Vex', 'hand crossbow': 'Vex', 'heavy crossbow': 'Push', longbow: 'Slow', musket: 'Slow', pistol: 'Vex',
}

const stripTags = (t: string) => t.replace(/\{@\w+\s+([^|}]+)(?:\|[^}]*)?\}/g, '$1').replace(/\{@\w+\}/g, '')
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function entriesToHtml(entries: Raw[] | undefined): string {
  if (!Array.isArray(entries)) return ''
  const out: string[] = []
  for (const e of entries) {
    if (typeof e === 'string') out.push(`<p>${esc(stripTags(e))}</p>`)
    else if (e && typeof e === 'object') {
      if (e.type === 'list') out.push(`<ul>${(e.items || []).map((i: Raw) => `<li>${typeof i === 'string' ? esc(stripTags(i)) : i?.name ? `<strong>${esc(i.name)}.</strong> ${esc(stripTags(i.entry || (i.entries || []).join(' ')))}` : ''}</li>`).join('')}</ul>`)
      else if (e.type === 'table') {
        const head = (e.colLabels || []).map((c: string) => `<th>${esc(stripTags(String(c)))}</th>`).join('')
        const rows = (e.rows || []).map((r: Raw[]) => `<tr>${r.map(c => `<td>${esc(stripTags(typeof c === 'string' || typeof c === 'number' ? String(c) : c?.roll ? `${c.roll.min ?? c.roll.exact}${c.roll.max ? `–${c.roll.max}` : ''}` : ''))}</td>`).join('')}</tr>`).join('')
        out.push(`<table>${e.caption ? `<caption>${esc(e.caption)}</caption>` : ''}${head ? `<thead><tr>${head}</tr></thead>` : ''}<tbody>${rows}</tbody></table>`)
      } else if (e.entries) {
        const inner = entriesToHtml(e.entries)
        out.push(e.name ? inner.replace(/^<p>/, `<p><strong>${esc(e.name)}.</strong> `) || `<p><strong>${esc(e.name)}.</strong></p>` : inner)
      } else if (e.entry) out.push(`<p>${esc(stripTags(String(e.entry)))}</p>`)
    }
  }
  return out.join('')
}

let cache: { list: CatalogItem[]; raw: Map<string, Raw>; base: Map<string, Raw> } | null = null

function load() {
  if (cache) return cache
  const dir = path.join(process.cwd(), 'data')
  const read = (f: string) => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) } catch { return {} } }
  const baseItems: Raw[] = read('items-base.json').baseitem || []
  const items: Raw[] = read('items.json').item || []
  const raw = new Map<string, Raw>()
  const base = new Map<string, Raw>()
  for (const b of baseItems) base.set(`${String(b.name).toLowerCase()}|${String(b.source).toLowerCase()}`, b)
  const list: CatalogItem[] = []
  for (const x of [...baseItems, ...items]) {
    const code = String(x.type || '').split('|')[0]
    if (SKIP_TYPES.has(code) || x._copy || x.age) continue
    const key = `${x.name}|${x.source}`
    if (raw.has(key)) continue
    raw.set(key, x)
    const resolved = resolveBase(x, base)
    list.push({
      key, name: x.name, source: x.source, type: typeLabel(resolved), rarity: rarityOf(x.rarity),
      weight: Number(resolved.weight) || 0, attunement: !!x.reqAttune, magic: x.rarity && x.rarity !== 'none',
    })
  }
  list.sort((a, b) => a.name.localeCompare(b.name))
  cache = { list, raw, base }
  return cache
}

function resolveBase(x: Raw, base: Map<string, Raw>): Raw {
  if (!x.baseItem) return x
  const b = base.get(String(x.baseItem).toLowerCase().replace(/\|$/, '')) || base.get(`${String(x.baseItem).split('|')[0].toLowerCase()}|phb`)
  return b ? { ...b, ...x } : x
}

function typeLabel(x: Raw): string {
  const code = String(x.type || '').split('|')[0]
  if (TYPE_LABEL[code]) return TYPE_LABEL[code]
  if (x.wondrous) return 'Wondrous item'
  if (x.staff) return 'Staff'
  if (x.weapon || x.weaponCategory) return 'Weapon'
  if (x.armor) return 'Armor'
  return 'Gear'
}

function rarityOf(r: unknown): Item['rarity'] {
  const s = String(r || 'none').toLowerCase()
  if (s === 'none' || s === 'common') return 'common'
  return (['uncommon', 'rare', 'very rare', 'legendary', 'artifact', 'varies'] as const).includes(s as never) ? (s as Item['rarity']) : 'unknown'
}

export function searchCatalog(q: string, limit = 40): CatalogItem[] {
  const { list } = load()
  const term = q.trim().toLowerCase()
  if (!term) return list.filter(i => !i.magic).slice(0, limit)
  const starts = list.filter(i => i.name.toLowerCase().startsWith(term))
  const contains = list.filter(i => !i.name.toLowerCase().startsWith(term) && i.name.toLowerCase().includes(term))
  return [...starts, ...contains].slice(0, limit)
}

const bonus = (v: unknown) => { const n = parseInt(String(v ?? ''), 10); return Number.isFinite(n) ? n : 0 }

/** Build a sheet Item from a catalog entry. `magicBonus` turns a mundane weapon/armor into +1/+2/+3. */
export function catalogToItem(key: string, opts: { id: string; quantity?: number; magicBonus?: number; edition?: '2014' | '2024' }): Item | null {
  const { raw, base } = load()
  const src = raw.get(key)
  if (!src) return null
  const x = resolveBase(src, base)
  const code = String(x.type || '').split('|')[0]
  const extra = Math.max(0, Math.min(3, Math.trunc(opts.magicBonus || 0)))
  const name = extra ? `${x.name}, +${extra}` : x.name
  const source: SourceRef = { kind: 'item', id: opts.id, label: name }
  const reqAttune = !!x.reqAttune
  const effects: Effect[] = []
  const add = (type: string, subType: string, value: number | null = null, extraProps: Partial<Effect> = {}) => effects.push({ type, subType, value, source, requiresAttunement: reqAttune, ...extraProps })

  let weapon: WeaponData | undefined
  if ((code === 'M' || code === 'R' || x.weapon || x.weaponCategory) && x.dmg1) {
    const baseName = String(x.baseItem ? String(x.baseItem).split('|')[0] : x.name).toLowerCase()
    const props = (x.property || []).map((p: string) => PROPERTY[String(p).split('|')[0]] || p)
    if (x.dmg2 && props.includes('Versatile')) props[props.indexOf('Versatile')] = `Versatile (${x.dmg2})`
    const [r, lr] = String(x.range || '').split('/').map(Number)
    const mastery = opts.edition === '2024' ? WEAPON_MASTERY[baseName] : undefined
    weapon = {
      base: baseName.replace(/[^a-z0-9]+/g, '-'), category: x.weaponCategory === 'martial' ? 'martial' : x.weaponCategory === 'simple' ? 'simple' : 'other',
      kind: code === 'R' ? 'ranged' : 'melee', damage: x.dmg1, damageType: DMG_TYPE[x.dmgType] || String(x.dmgType || '').toLowerCase(),
      range: r || 5, longRange: lr || r || 5, properties: props, mastery,
    }
  }
  let armor: ArmorData | undefined
  if (['LA', 'MA', 'HA', 'S'].includes(code) && x.ac) {
    armor = { type: code === 'LA' ? 'light' : code === 'MA' ? 'medium' : code === 'HA' ? 'heavy' : 'shield', baseAc: Number(x.ac), stealthDisadvantage: !!x.stealth, strengthRequirement: x.strength ? Number(x.strength) : null }
    if (extra) add('bonus', 'armor-class', extra, { requiresAttunement: false })
  }
  const magicBonus = (weapon ? extra : 0) + bonus(x.bonusWeapon)
  if (bonus(x.bonusAc)) add('bonus', 'armor-class', bonus(x.bonusAc))
  if (bonus(x.bonusSavingThrow)) add('bonus', 'saving-throws', bonus(x.bonusSavingThrow))
  if (bonus(x.bonusSpellAttack)) add('bonus', 'spell-attacks', bonus(x.bonusSpellAttack))
  if (bonus(x.bonusSpellSaveDc)) add('bonus', 'spell-save-dc', bonus(x.bonusSpellSaveDc))
  for (const r of x.resist || []) if (typeof r === 'string') add('resistance', r)
  for (const r of x.immune || []) if (typeof r === 'string') add('immunity', r)
  for (const r of x.conditionImmune || []) if (typeof r === 'string') add('immunity', r)
  if (x.ability?.static) for (const [k, v] of Object.entries(x.ability.static)) if (ABILITY_SLUG[k]) add('set', `${ABILITY_SLUG[k]}-score`, Number(v))
  for (const [k, v] of Object.entries(x.ability || {})) if (ABILITY_SLUG[k] && typeof v === 'number') add('bonus', `${ABILITY_SLUG[k]}-score`, v)
  const speedName: Record<string, string> = { fly: 'flying', climb: 'climbing', swim: 'swimming', burrow: 'burrowing' }
  for (const k of Object.keys(x.modifySpeed?.equal || {})) if (speedName[k]) add('set', `innate-speed-${speedName[k]}`, null)
  for (const [k, v] of Object.entries(x.modifySpeed?.static || {})) if (speedName[k]) add('set', `innate-speed-${speedName[k]}`, Number(v))
  for (const [k, v] of Object.entries(x.modifySpeed?.bonus || {})) if (k === 'walk' || k === '*') add('bonus', 'speed', Number(v))

  const charges = Number(x.charges) || 0
  const reset = x.recharge === 'dawn' ? 'dawn' : x.recharge === 'dusk' ? 'dusk' : x.recharge === 'restLong' ? 'long' : x.recharge === 'restShort' ? 'short' : 'other'
  const isContainer = !!x.containerCapacity || code === 'G' && /^(backpack|bag|pouch|chest|sack|quiver|case)/i.test(x.name)
  return {
    id: opts.id, name, type: typeLabel(x), subtype: weapon || armor ? String(x.baseItem ? String(x.baseItem).split('|')[0] : x.name).replace(/\b\w/g, c => c.toUpperCase()) : undefined,
    rarity: extra ? (extra === 1 ? 'uncommon' : extra === 2 ? 'rare' : 'very rare') : rarityOf(x.rarity),
    quantity: Math.max(1, Math.min(100000, Math.trunc(opts.quantity || 1))), weight: Number(x.weight) || 0, bundleSize: 1,
    equipped: false, attuned: false, canAttune: reqAttune, attunementDescription: typeof x.reqAttune === 'string' ? x.reqAttune : undefined,
    containerId: null, isContainer, contentsWeightMultiplier: isContainer ? (x.containerCapacity?.weightless ? 0 : 1) : undefined,
    magic: extra > 0 || (!!x.rarity && x.rarity !== 'none'), magicBonus: magicBonus || undefined,
    description: sanitizeHtml(entriesToHtml(x.entries)), weapon, armor, effects,
    uses: charges ? { max: charges, reset, key: `item-${opts.id}` } : undefined,
  }
}
