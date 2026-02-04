import { ModifierEngine, getEquipmentModifiers, calculateArmorAC, calculatePassive } from './engine'
import type { CalculatedStats, Modifier } from './types'
import type { InventoryItem } from '@/lib/items/types'
import type { Stats } from '@/lib/types'
import { SKILL_ABILITIES } from '@/lib/proficiencyEngine'
import { calculateProficiencyBonus } from '@/lib/calculations'

interface CharacterData {
  stats: Stats
  level: number
  className: string
  race: string
  baseSpeed: number
  proficiencyBonus?: number
  saveProficiencies: string[]
  skillProficiencies: string[]
  skillExpertise?: string[]
  inventory: InventoryItem[]
  spellcastingAbility?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha' | null
  overrides?: {
    ac?: number
    speed?: number
    [key: string]: number | undefined
  }
}

const ABILITIES: Array<keyof Stats> = ['str', 'dex', 'con', 'int', 'wis', 'cha']

export function calculateCharacterStats(data: CharacterData): CalculatedStats {
  const engine = new ModifierEngine()

  const abilityMods: Record<string, number> = {}
  ABILITIES.forEach((ability) => {
    abilityMods[ability] = Math.floor((data.stats[ability] - 10) / 2)
  })

  const proficiencyBonus = data.proficiencyBonus ?? calculateProficiencyBonus(data.level)

  const equipmentMods = getEquipmentModifiers(data.inventory)
  engine.addModifiers(equipmentMods)

  const armorCalc = calculateArmorAC(
    data.inventory,
    data.stats,
    data.className,
    engine.getTotal('ac')
  )

  const acBonusMods = engine.getBreakdown('ac')
  let totalAC = armorCalc.base
  acBonusMods.forEach((mod) => {
    if (!armorCalc.breakdown.find((existing) => existing.id === mod.id)) {
      totalAC += mod.value
      armorCalc.breakdown.push(mod)
    }
  })

  if (data.overrides?.ac !== undefined) {
    totalAC = data.overrides.ac
    armorCalc.breakdown.push({
      id: 'override',
      type: 'ac',
      source: 'override',
      sourceName: 'Manual Override',
      value: data.overrides.ac,
    })
  }

  const savingThrows: CalculatedStats['savingThrows'] = {}
  ABILITIES.forEach((ability) => {
    const isProficient = data.saveProficiencies.includes(ability)
    const abilityMod = abilityMods[ability]
    const profBonus = isProficient ? proficiencyBonus : 0
    const equipBonus = engine.getTotal('saving-throw', ability)
    const globalSaveBonus = engine.getTotal('saving-throw')

    const breakdown: Modifier[] = [
      {
        id: `${ability}-mod`,
        type: 'saving-throw',
        source: 'ability',
        sourceName: ability,
        value: abilityMod,
        target: ability,
      },
    ]

    if (isProficient) {
      breakdown.push({
        id: `${ability}-prof`,
        type: 'saving-throw',
        source: 'proficiency',
        sourceName: 'Proficiency',
        value: profBonus,
        target: ability,
      })
    }

    if (equipBonus) {
      breakdown.push(...engine.getBreakdown('saving-throw', ability))
    }

    if (globalSaveBonus) {
      breakdown.push(...engine.getBreakdown('saving-throw').filter((mod) => !mod.target))
    }

    savingThrows[ability] = {
      total: abilityMod + profBonus + equipBonus + globalSaveBonus,
      breakdown,
    }
  })

  const skills: CalculatedStats['skills'] = {}
  const expertise = data.skillExpertise ?? []
  Object.entries(SKILL_ABILITIES).forEach(([skill, ability]) => {
    const abilityMod = abilityMods[ability]
    const isProficient = data.skillProficiencies.includes(skill)
    const hasExpertise = expertise.includes(skill)
    const profBonus = isProficient ? proficiencyBonus * (hasExpertise ? 2 : 1) : 0
    const equipBonus = engine.getTotal('skill', skill)

    const breakdown: Modifier[] = [
      {
        id: `${skill}-ability`,
        type: 'skill',
        source: 'ability',
        sourceName: ability,
        value: abilityMod,
        target: skill,
      },
    ]

    if (isProficient) {
      breakdown.push({
        id: `${skill}-prof`,
        type: 'skill',
        source: 'proficiency',
        sourceName: hasExpertise ? 'Expertise' : 'Proficiency',
        value: profBonus,
        target: skill,
      })
    }

    if (equipBonus) {
      breakdown.push(...engine.getBreakdown('skill', skill))
    }

    skills[skill] = {
      total: abilityMod + profBonus + equipBonus,
      breakdown,
    }
  })

  const passives = {
    perception: calculatePassive(skills.Perception?.total ?? 0),
    investigation: calculatePassive(skills.Investigation?.total ?? 0),
    insight: calculatePassive(skills.Insight?.total ?? 0),
  }

  const attackBonus = {
    melee: abilityMods.str + proficiencyBonus + engine.getTotal('attack'),
    ranged: abilityMods.dex + proficiencyBonus + engine.getTotal('attack'),
    breakdown: [
      {
        id: 'str-attack',
        type: 'attack',
        source: 'ability',
        sourceName: 'Strength (melee)',
        value: abilityMods.str,
      },
      {
        id: 'dex-attack',
        type: 'attack',
        source: 'ability',
        sourceName: 'Dexterity (ranged)',
        value: abilityMods.dex,
      },
      {
        id: 'prof-attack',
        type: 'attack',
        source: 'proficiency',
        sourceName: 'Proficiency',
        value: proficiencyBonus,
      },
      ...engine.getBreakdown('attack'),
    ],
  }

  const damageBonus = {
    melee: abilityMods.str + engine.getTotal('damage'),
    ranged: abilityMods.dex + engine.getTotal('damage'),
    breakdown: engine.getBreakdown('damage'),
  }

  const initiative = abilityMods.dex + engine.getTotal('initiative')

  const baseSpeed = data.overrides?.speed ?? data.baseSpeed
  const speed = baseSpeed + engine.getTotal('speed')

  let spellAttack = engine.getTotal('spell-attack')
  let spellSaveDC = engine.getTotal('spell-dc')

  if (data.spellcastingAbility) {
    const castingMod = abilityMods[data.spellcastingAbility]
    spellAttack += castingMod + proficiencyBonus
    spellSaveDC += 8 + castingMod + proficiencyBonus
  }

  return {
    ac: {
      total: totalAC,
      base: armorCalc.base,
      breakdown: armorCalc.breakdown,
    },
    attackBonus,
    damageBonus,
    savingThrows,
    skills,
    passives,
    spellAttack,
    spellSaveDC,
    initiative,
    speed,
    maxHP: 0,
    proficiencyBonus,
  }
}
