import { Prisma, Life } from '@prisma/client'
import { Stats, getStatModifier } from './statMapper'
import { getSpellSelectionLimits, getSpellcastingAbilityForClass } from './spellSlots'
import { applyASIs } from './asiCalculator'
import { ALL_SKILLS, selectSkillProficiencies } from './proficiencyEngine'
import { calculateMaxHp } from './calculations'
import classes from './data/classes.json'
import races from './data/races.json'
import { getAvailableSpellNames, getRacialAbilityBonuses, getSubclassSpellGrants } from './dndApi'

export class InputError extends Error {}
export function integer(value: unknown, min: number, max: number, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw new InputError(`${label} must be an integer from ${min} to ${max}`)
  return value
}
export function scores(value: unknown): Stats {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InputError('Six ability scores are required')
  const result = {} as Stats
  for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const) result[key] = integer((value as Record<string, unknown>)[key], 1, 30, key)
  return result
}
export function textValue(value: unknown, label: string, max = 50000): string {
  if (typeof value !== 'string' || value.length > max) throw new InputError(`Invalid ${label}`)
  return value
}
export function validateIdentity(race: string, className: string, subclass: string) {
  if (!races.includes(race)) throw new InputError('Unknown race')
  if (!classes.includes(`${className}: ${subclass}`)) throw new InputError('Unknown class/subclass combination')
}
export async function prepareLifeUpdate(existing: Life, body: Record<string, unknown>): Promise<Prisma.LifeUncheckedUpdateInput> {
  const allowed = ['race', 'class', 'subclass', 'level', 'stats', 'baseStats', 'currentHp', 'maxHp', 'story', 'spellbook', 'skillProficiencies', 'subclassChoice', 'effect', 'pointBuyStats', 'gameplayState']
  if (Object.keys(body).some(key => !allowed.includes(key))) throw new InputError('Unsupported life field')
  const className = body.class === undefined ? existing.class : textValue(body.class, 'class', 100)
  const subclass = body.subclass === undefined ? existing.subclass : textValue(body.subclass, 'subclass', 100)
  const race = body.race === undefined ? existing.race : textValue(body.race, 'race', 100)
  const level = body.level === undefined ? existing.level : integer(body.level, 1, 20, 'Level')
  if (body.race !== undefined || body.class !== undefined || body.subclass !== undefined) validateIdentity(race, className, subclass)
  const data: Prisma.LifeUncheckedUpdateInput = {}
  for (const field of ['story', 'effect', 'subclassChoice'] as const) if (body[field] !== undefined) data[field] = textValue(body[field], field)
  if (body.race !== undefined) data.race = race
  if (body.class !== undefined) data.class = className
  if (body.subclass !== undefined) data.subclass = subclass
  if (body.level !== undefined) data.level = level
  let finalStats = scores(existing.stats)
  if (body.pointBuyStats !== undefined) {
    const pointBuy = scores(body.pointBuyStats)
    const costs: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 }
    const values = Object.values(pointBuy)
    if (values.some(value => costs[value] === undefined) || values.reduce((sum, value) => sum + costs[value], 0) > 27) throw new InputError('Point buy must use scores 8–15 within 27 points')
    const bonuses = await getRacialAbilityBonuses(race, className)
    const base = { ...pointBuy }
    for (const key of Object.keys(base) as (keyof Stats)[]) base[key] += bonuses[key] || 0
    data.baseStats = { ...base }
    finalStats = applyASIs(base, className, level)
    data.stats = { ...finalStats }
  } else if (body.baseStats !== undefined) {
    const base = scores(body.baseStats)
    data.baseStats = { ...base }
    finalStats = applyASIs(base, className, level)
    data.stats = { ...finalStats }
  } else if (body.stats !== undefined) {
    finalStats = scores(body.stats)
    data.stats = { ...finalStats }
    // Manual final scores cannot safely be reverse-engineered into pre-ASI scores.
    data.baseStats = Prisma.DbNull
  } else if ((level !== existing.level || className !== existing.class) && existing.baseStats) {
    finalStats = applyASIs(scores(existing.baseStats), className, level)
    data.stats = { ...finalStats }
  }
  const mechanical = level !== existing.level || className !== existing.class || race !== existing.race || subclass !== existing.subclass || ['stats', 'baseStats', 'pointBuyStats'].some(key => body[key] !== undefined)
  const maxHp = mechanical ? calculateMaxHp(className, level, Math.floor((finalStats.con - 10) / 2), { race, subclass }) : body.maxHp === undefined ? existing.maxHp : integer(body.maxHp, 1, 10000, 'Maximum HP')
  if (mechanical || body.maxHp !== undefined) data.maxHp = maxHp
  if (mechanical || body.currentHp !== undefined || body.maxHp !== undefined) {
    const current = body.currentHp === undefined ? existing.currentHp : integer(body.currentHp, 0, 10000, 'Current HP')
    data.currentHp = Math.min(current, maxHp)
  }
  if (className !== existing.class || subclass !== existing.subclass) {
    data.spellbook = Prisma.DbNull
    data.subclassChoice = null
    if (className !== existing.class) data.skillProficiencies = selectSkillProficiencies(className)
  }
  if (body.skillProficiencies !== undefined) {
    if (!Array.isArray(body.skillProficiencies) || body.skillProficiencies.length > 18 || body.skillProficiencies.some(s => typeof s !== 'string' || !ALL_SKILLS.includes(s))) throw new InputError('Invalid skill proficiencies')
    data.skillProficiencies = Array.from(new Set(body.skillProficiencies))
  }
  if (body.spellbook !== undefined) {
    const book = body.spellbook as { spellNames?: unknown; archivistNote?: unknown }
    if (!book || !Array.isArray(book.spellNames) || book.spellNames.length > 200 || book.spellNames.some(s => typeof s !== 'string' || s.length > 200)) throw new InputError('Invalid spellbook')
    data.spellbook = { spellNames: Array.from(new Set(book.spellNames)) as string[], archivistNote: book.archivistNote === undefined ? '' : textValue(book.archivistNote, 'spellbook note', 5000) }
  }
  if (body.spellbook !== undefined || ((level !== existing.level || mechanical || (body.subclassChoice !== undefined && body.subclassChoice !== existing.subclassChoice)) && className === existing.class && subclass === existing.subclass)) {
    const selected = body.spellbook === undefined ? existing.spellbook : body.spellbook
    if (selected && typeof selected === 'object' && !Array.isArray(selected)) {
      const book = selected as { spellNames?: string[]; archivistNote?: string }
      const available = await getAvailableSpellNames(className, subclass, level, (body.subclassChoice === undefined ? existing.subclassChoice : body.subclassChoice) as string | undefined)
      const names = [...available.cantrips, ...available.spells]
      const choice = (body.subclassChoice === undefined ? existing.subclassChoice : body.subclassChoice) as string | undefined
      const grants = await getSubclassSpellGrants(className, subclass, level, choice)
      const fixedNames = new Set([...grants.prepared, ...grants.known].map(name => name.toLowerCase()))
      const ability = getSpellcastingAbilityForClass(className, subclass)
      const limits = getSpellSelectionLimits(className, subclass, level, ability ? getStatModifier(finalStats[ability as keyof Stats]) : 0)
      const requested = Array.from(new Set((book.spellNames || []).map(name => name.toLowerCase())))
      const legal = requested.map(name => names.find(candidate => candidate.toLowerCase() === name)).filter((name): name is string => !!name)
      if (body.spellbook !== undefined && legal.length !== requested.length) throw new InputError('Spell selection contains spells unavailable to this class or level')
      let cantrips = 0
      let leveled = 0
      const withinLimits = legal.filter(name => {
        if (fixedNames.has(name.toLowerCase())) return true
        return available.cantrips.includes(name) ? ++cantrips <= limits.cantrips : ++leveled <= limits.spells
      })
      if (body.spellbook !== undefined && withinLimits.length !== legal.length) throw new InputError(`Select at most ${limits.cantrips} ordinary cantrips and ${limits.spells} ordinary spells; subclass grants are additional`)
      data.spellbook = { spellNames: withinLimits, archivistNote: book.archivistNote || '' }
    }
  }
  if (body.gameplayState !== undefined || level !== existing.level || className !== existing.class) {
    const state = (body.gameplayState === undefined ? {} : body.gameplayState) as Record<string, unknown>
    if (!state || typeof state !== 'object' || Array.isArray(state)) throw new InputError('Invalid gameplay state')
    if (Object.keys(state).some(key => !['tempHp', 'deathSuccesses', 'deathFailures', 'slotsUsed', 'concentration', 'armor', 'shield', 'acBonus', 'weapon', 'weaponBonus', 'weaponProficient', 'weaponAbility', 'weaponTwoHanded', 'hitDiceUsed'].includes(key))) throw new InputError('Unknown gameplay resource')
    const old = existing.gameplayState && typeof existing.gameplayState === 'object' && !Array.isArray(existing.gameplayState) ? existing.gameplayState : {}
    const merged = { ...old } as Record<string, Prisma.InputJsonValue | null>
    for (const key of ['tempHp', 'deathSuccesses', 'deathFailures'] as const) if (state[key] !== undefined) merged[key] = integer(state[key], 0, key === 'tempHp' ? 10000 : 3, key)
    if (state.hitDiceUsed !== undefined) merged.hitDiceUsed = integer(state.hitDiceUsed, 0, level, 'Hit dice used')
    if (state.weapon !== undefined) merged.weapon = textValue(state.weapon, 'weapon', 100)
    if (state.weaponBonus !== undefined) merged.weaponBonus = integer(state.weaponBonus, -5, 10, 'Weapon bonus')
    for (const key of ['weaponProficient', 'weaponTwoHanded'] as const) if (state[key] !== undefined) {
      if (typeof state[key] !== 'boolean') throw new InputError(`Invalid ${key}`)
      merged[key] = state[key]
    }
    if (state.weaponAbility !== undefined) {
      if (!['auto', 'str', 'dex'].includes(state.weaponAbility as string)) throw new InputError('Invalid weapon ability')
      merged.weaponAbility = state.weaponAbility as string
    }
    if (state.armor !== undefined) merged.armor = textValue(state.armor, 'armor', 100)
    if (state.acBonus !== undefined) merged.acBonus = integer(state.acBonus, -10, 20, 'AC bonus')
    if (state.shield !== undefined) {
      if (typeof state.shield !== 'boolean') throw new InputError('Invalid shield selection')
      merged.shield = state.shield
    }
    if (state.concentration !== undefined) merged.concentration = state.concentration === null ? null : textValue(state.concentration, 'concentration', 200)
    if (state.slotsUsed !== undefined) {
      if (!state.slotsUsed || typeof state.slotsUsed !== 'object' || Array.isArray(state.slotsUsed)) throw new InputError('Invalid spell slot usage')
      const slots: Record<string, number> = {}
      for (const [key, value] of Object.entries(state.slotsUsed)) {
        if (!/^[1-9]$/.test(key) && key !== 'pact') throw new InputError('Invalid spell slot level')
        slots[key] = integer(value, 0, 20, 'Spell slots used')
      }
      merged.slotsUsed = slots
    }
    if (typeof merged.hitDiceUsed === 'number') merged.hitDiceUsed = Math.min(level, merged.hitDiceUsed)
    if (className !== existing.class) { merged.slotsUsed = {}; merged.concentration = null }
    data.gameplayState = merged
  }
  return data
}
