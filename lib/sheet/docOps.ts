// Validated edits to a CharacterDoc's inventory and currency.
// Pure: the client applies them optimistically, the server re-applies them authoritatively.

import { sanitizeHtml } from './sanitize'
import type { ArmorData, CharacterDoc, Currency, Effect, Item, WeaponData } from './types'

export class DocOpError extends Error {}

export type DocOp =
  | { op: 'item.update'; id: string; equipped?: boolean; attuned?: boolean; quantity?: number; containerId?: string | null; custom?: { name?: string | null; notes?: string | null; hitBonus?: number | null; damageBonus?: number | null; proficient?: boolean | null; hideFromAttacks?: boolean | null } }
  | { op: 'item.remove'; id: string }
  | { op: 'item.insert'; item: Item }
  | { op: 'currency.set'; currency: Partial<Currency> }
  | { op: 'currency.adjust'; delta: Partial<Currency> }

const ID = /^[A-Za-z0-9_-]{1,64}$/
const COINS: Array<keyof Currency> = ['cp', 'sp', 'ep', 'gp', 'pp']
const int = (v: unknown, min: number, max: number) => {
  const n = Math.trunc(Number(v))
  if (!Number.isFinite(n)) throw new DocOpError('Expected a number.')
  return Math.min(max, Math.max(min, n))
}
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

function find(doc: CharacterDoc, id: string): Item {
  const item = doc.inventory.find(i => i.id === id)
  if (!item) throw new DocOpError('Item not found.')
  return item
}

/** Would placing `id` inside `containerId` create a loop? */
function createsCycle(doc: CharacterDoc, id: string, containerId: string): boolean {
  let cur: string | null | undefined = containerId
  const seen = new Set<string>()
  while (cur && !seen.has(cur)) {
    if (cur === id) return true
    seen.add(cur)
    cur = doc.inventory.find(i => i.id === cur)?.containerId
  }
  return false
}

export function applyDocOp(doc: CharacterDoc, op: DocOp): CharacterDoc {
  switch (op.op) {
    case 'item.update': {
      const item = find(doc, op.id)
      const next: Item = { ...item }
      if (op.equipped !== undefined) next.equipped = !!op.equipped
      if (op.attuned !== undefined) {
        if (op.attuned && !item.canAttune) throw new DocOpError('This item does not require attunement.')
        next.attuned = !!op.attuned
      }
      if (op.quantity !== undefined) next.quantity = int(op.quantity, 0, 100000)
      if (op.containerId !== undefined) {
        if (op.containerId === null) next.containerId = null
        else {
          const c = find(doc, op.containerId)
          if (!c.isContainer) throw new DocOpError('That item is not a container.')
          if (createsCycle(doc, item.id, c.id)) throw new DocOpError('An item cannot go inside itself.')
          next.containerId = c.id
          next.equipped = false
        }
      }
      if (op.custom) {
        const c = { ...(item.custom || {}) }
        const k = op.custom
        if (k.name !== undefined) { const v = str(k.name, 80); if (v) c.name = v; else delete c.name }
        if (k.notes !== undefined) { const v = str(k.notes, 2000); if (v) c.notes = [v]; else delete c.notes }
        if (k.hitBonus !== undefined) { if (k.hitBonus === null || k.hitBonus === 0) delete c.hitBonus; else c.hitBonus = int(k.hitBonus, -20, 20) }
        if (k.damageBonus !== undefined) { if (k.damageBonus === null || k.damageBonus === 0) delete c.damageBonus; else c.damageBonus = int(k.damageBonus, -20, 20) }
        if (k.proficient !== undefined) { if (k.proficient === null) delete c.proficient; else c.proficient = !!k.proficient }
        if (k.hideFromAttacks !== undefined) { if (!k.hideFromAttacks) delete c.hideFromAttacks; else c.hideFromAttacks = true }
        next.custom = Object.keys(c).length ? c : undefined
      }
      return { ...doc, inventory: doc.inventory.map(i => (i.id === item.id ? next : i)) }
    }
    case 'item.remove': {
      find(doc, op.id)
      // Contents of a removed container move to the top level rather than vanishing.
      return { ...doc, inventory: doc.inventory.filter(i => i.id !== op.id).map(i => (i.containerId === op.id ? { ...i, containerId: null } : i)) }
    }
    case 'item.insert': {
      const item = validateItem(op.item)
      if (doc.inventory.some(i => i.id === item.id)) throw new DocOpError('Duplicate item id.')
      if (doc.inventory.length >= 1000) throw new DocOpError('Inventory is full (1,000 items).')
      return { ...doc, inventory: [...doc.inventory, item] }
    }
    case 'currency.set': {
      const currency = { ...doc.currency }
      for (const c of COINS) if (op.currency[c] !== undefined) currency[c] = int(op.currency[c], 0, 1e9)
      return { ...doc, currency }
    }
    case 'currency.adjust': {
      const currency = { ...doc.currency }
      for (const c of COINS) {
        if (op.delta[c] === undefined) continue
        const v = currency[c] + int(op.delta[c], -1e9, 1e9)
        if (v < 0) throw new DocOpError(`Not enough ${c.toUpperCase()}.`)
        currency[c] = v
      }
      return { ...doc, currency }
    }
    default:
      throw new DocOpError('Unknown operation.')
  }
}

const RARITIES: Item['rarity'][] = ['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact', 'varies', 'unknown']
const EFFECT_TYPES = new Set(['bonus', 'set', 'resistance', 'immunity', 'vulnerability', 'advantage', 'damage', 'proficiency', 'language', 'sense', 'set-base'])
const DICE = /^\d{1,2}d\d{1,3}([+-]\d{1,3})?$/

/** Coerce an untrusted Item (homebrew editor, catalog result) into a safe one. */
export function validateItem(input: unknown): Item {
  const x = (input && typeof input === 'object' ? input : {}) as Record<string, any>
  const id = String(x.id || '')
  if (!ID.test(id)) throw new DocOpError('Invalid item id.')
  const name = str(x.name, 80)
  if (!name) throw new DocOpError('Items need a name.')
  const source = { kind: 'item' as const, id, label: name }
  let weapon: WeaponData | undefined
  if (x.weapon && typeof x.weapon === 'object') {
    const w = x.weapon
    const damage = str(w.damage, 20)
    if (damage && !DICE.test(damage) && !/^\d{1,3}$/.test(damage)) throw new DocOpError('Weapon damage must look like 1d8 or 1d8+1.')
    weapon = {
      base: str(w.base, 40).toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'custom',
      category: w.category === 'martial' ? 'martial' : w.category === 'simple' ? 'simple' : 'other',
      kind: w.kind === 'ranged' ? 'ranged' : 'melee', damage: damage || null, damageType: str(w.damageType, 20).toLowerCase() || 'bludgeoning',
      range: int(w.range ?? 5, 0, 2000), longRange: int(w.longRange ?? w.range ?? 5, 0, 5000),
      properties: Array.isArray(w.properties) ? w.properties.map((p: unknown) => str(p, 30)).filter(Boolean).slice(0, 12) : [],
      mastery: str(w.mastery, 20) || undefined,
    }
  }
  let armor: ArmorData | undefined
  if (x.armor && typeof x.armor === 'object') {
    const a = x.armor
    armor = { type: ['light', 'medium', 'heavy', 'shield'].includes(a.type) ? a.type : 'light', baseAc: int(a.baseAc, 0, 30), stealthDisadvantage: !!a.stealthDisadvantage, strengthRequirement: a.strengthRequirement ? int(a.strengthRequirement, 0, 30) : null }
  }
  const effects: Effect[] = (Array.isArray(x.effects) ? x.effects : []).slice(0, 30).flatMap((e: any): Effect[] => {
    if (!e || !EFFECT_TYPES.has(e.type)) return []
    const subType = str(e.subType, 60).toLowerCase()
    if (!/^[a-z0-9-]+$/.test(subType)) return []
    const dice = e.dice ? str(e.dice, 20) : null
    return [{ type: e.type, subType, value: e.value == null ? null : int(e.value, -100, 1000), dice: dice && DICE.test(dice) ? dice : null, restriction: str(e.restriction, 200) || null, requiresAttunement: !!e.requiresAttunement, source }]
  })
  const uses = x.uses && typeof x.uses === 'object' && Number(x.uses.max) > 0
    ? { max: int(x.uses.max, 1, 100), reset: (['short', 'long', 'dawn', 'dusk', 'consumable', 'other'].includes(x.uses.reset) ? x.uses.reset : 'other'), key: `item-${id}` } as Item['uses']
    : undefined
  return {
    id, name, type: str(x.type, 40) || 'Gear', subtype: str(x.subtype, 40) || undefined,
    rarity: RARITIES.includes(x.rarity) ? x.rarity : 'common',
    quantity: int(x.quantity ?? 1, 0, 100000), weight: Math.max(0, Math.min(10000, Number(x.weight) || 0)), bundleSize: Math.max(1, int(x.bundleSize ?? 1, 1, 1000)),
    equipped: !!x.equipped, attuned: false, canAttune: !!x.canAttune, attunementDescription: str(x.attunementDescription, 120) || undefined,
    containerId: null, isContainer: !!x.isContainer, contentsWeightMultiplier: x.isContainer ? (Number(x.contentsWeightMultiplier) === 0 ? 0 : 1) : undefined,
    magic: !!x.magic || Number(x.magicBonus) > 0, magicBonus: x.magicBonus ? int(x.magicBonus, -5, 10) : undefined,
    description: sanitizeHtml(String(x.description || '').slice(0, 20000)), weapon, armor, effects, uses,
    homebrew: !!x.homebrew,
  }
}
