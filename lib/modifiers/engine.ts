import type { Modifier, ModifierCollection, ModifierType } from './types'
import type { InventoryItem } from '@/lib/items/types'
import { calculateAC } from '@/lib/calculations'
import type { Stats } from '@/lib/types'

export class ModifierEngine {
  private modifiers: ModifierCollection = {
    ac: [],
    attack: [],
    damage: [],
    savingThrow: [],
    abilityCheck: [],
    skill: [],
    spellAttack: [],
    spellDc: [],
    initiative: [],
    speed: [],
    hpMax: [],
  }

  clear() {
    Object.keys(this.modifiers).forEach((key) => {
      this.modifiers[key as keyof ModifierCollection] = []
    })
  }

  addModifier(modifier: Modifier) {
    const typeKey = this.typeToKey(modifier.type)
    if (typeKey) {
      this.modifiers[typeKey].push(modifier)
    }
  }

  addModifiers(modifiers: Modifier[]) {
    modifiers.forEach((modifier) => this.addModifier(modifier))
  }

  getTotal(type: ModifierType, target?: string): number {
    const typeKey = this.typeToKey(type)
    if (!typeKey) return 0

    let mods = this.modifiers[typeKey]
    if (target) {
      mods = mods.filter((modifier) => !modifier.target || modifier.target === target)
    }

    const stackGroups: Record<string, number> = {}
    let total = 0

    for (const mod of mods) {
      if (mod.stackGroup) {
        if (stackGroups[mod.stackGroup] === undefined || mod.value > stackGroups[mod.stackGroup]) {
          stackGroups[mod.stackGroup] = mod.value
        }
      } else {
        total += mod.value
      }
    }

    Object.values(stackGroups).forEach((value) => {
      total += value
    })

    return total
  }

  getBreakdown(type: ModifierType, target?: string): Modifier[] {
    const typeKey = this.typeToKey(type)
    if (!typeKey) return []

    let mods = this.modifiers[typeKey]
    if (target) {
      mods = mods.filter((modifier) => !modifier.target || modifier.target === target)
    }

    return [...mods]
  }

  private typeToKey(type: ModifierType): keyof ModifierCollection | null {
    const map: Record<ModifierType, keyof ModifierCollection> = {
      ac: 'ac',
      attack: 'attack',
      damage: 'damage',
      'saving-throw': 'savingThrow',
      'ability-check': 'abilityCheck',
      skill: 'skill',
      'spell-attack': 'spellAttack',
      'spell-dc': 'spellDc',
      initiative: 'initiative',
      speed: 'speed',
      'hp-max': 'hpMax',
      'hp-per-level': 'hpMax',
    }

    return map[type] || null
  }
}

export function getEquipmentModifiers(inventory: InventoryItem[]): Modifier[] {
  const modifiers: Modifier[] = []

  const equippedItems = inventory.filter((item) => item.equipped)

  for (const invItem of equippedItems) {
    const item = invItem.item
    if (!item?.bonuses) continue

    if (item.requiresAttunement && !invItem.attuned) continue

    for (const bonus of item.bonuses) {
      const target = bonus.skill || bonus.ability || bonus.save
      const type = bonus.type === 'ability' ? 'ability-check' : bonus.type
      modifiers.push({
        id: `${invItem.id}-${bonus.type}-${target || 'all'}`,
        type: type as ModifierType,
        source: invItem.attuned ? 'attunement' : 'equipment',
        sourceName: invItem.customName || item.name,
        value: bonus.value,
        target,
      })
    }
  }

  return modifiers
}

export function calculateArmorAC(
  inventory: InventoryItem[],
  stats: Stats,
  className: string,
  otherBonuses: number = 0
): { base: number; breakdown: Modifier[] } {
  const equipped = inventory.filter((item) => item.equipped)
  const breakdown: Modifier[] = []

  const armor = equipped.find((item) => item.equipSlot === 'armor' && item.item?.armor)
  const shield = equipped.find(
    (item) => item.equipSlot === 'shield' || item.item?.category === 'shield'
  )

  let baseAC = 10

  if (armor?.item?.armor) {
    const armorData = armor.item.armor
    baseAC = armorData.baseAC

    breakdown.push({
      id: 'armor-base',
      type: 'ac',
      source: 'equipment',
      sourceName: armor.customName || armor.item.name,
      value: armorData.baseAC,
    })

    let dexBonus = Math.floor((stats.dex - 10) / 2)
    if (armorData.maxDexBonus !== undefined) {
      dexBonus = Math.min(dexBonus, armorData.maxDexBonus)
    }

    if (dexBonus !== 0) {
      baseAC += dexBonus
      breakdown.push({
        id: 'dex-to-ac',
        type: 'ac',
        source: 'ability',
        sourceName: 'Dexterity',
        value: dexBonus,
      })
    }

    if (armor.item.magicBonus) {
      baseAC += armor.item.magicBonus
      breakdown.push({
        id: 'armor-magic',
        type: 'ac',
        source: 'equipment',
        sourceName: `${armor.item.name} (+${armor.item.magicBonus})`,
        value: armor.item.magicBonus,
      })
    }
  } else {
    baseAC = calculateAC(stats, className)
    breakdown.push({
      id: 'base-ac',
      type: 'ac',
      source: 'base',
      sourceName: 'Base AC',
      value: baseAC,
    })
  }

  if (shield?.item) {
    const shieldAC = shield.item.armor?.baseAC || 2
    baseAC += shieldAC

    breakdown.push({
      id: 'shield',
      type: 'ac',
      source: 'equipment',
      sourceName: shield.customName || shield.item.name,
      value: shieldAC,
    })

    if (shield.item.magicBonus) {
      baseAC += shield.item.magicBonus
      breakdown.push({
        id: 'shield-magic',
        type: 'ac',
        source: 'equipment',
        sourceName: `${shield.item.name} (+${shield.item.magicBonus})`,
        value: shield.item.magicBonus,
      })
    }
  }

  if (otherBonuses) {
    baseAC += otherBonuses
  }

  return { base: baseAC, breakdown }
}

export function calculatePassive(
  skillMod: number,
  bonuses: number = 0,
  advantage: boolean = false,
  disadvantage: boolean = false
): number {
  let passive = 10 + skillMod + bonuses

  if (advantage && !disadvantage) passive += 5
  if (disadvantage && !advantage) passive -= 5

  return passive
}
