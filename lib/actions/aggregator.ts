import type { CharacterAction, ActionTiming } from './types'
import type { HydratedClassInfo, HydratedRaceInfo, HydratedSubclassInfo } from '@/lib/types/5etools'
import type { Stats } from '@/lib/types'
import { STANDARD_ACTIONS } from '@/lib/data/standardActions'
import { CLASS_ACTION_MAPPINGS, SUBCLASS_ACTION_MAPPINGS } from './classActions'
import { enhanceAllActionMechanics } from './mechanicsEnhancer'

interface LimitedFeatureState {
  name: string
  max: number
  used: number
  recharge?: string
}

interface AggregateActionsParams {
  life: {
    class: string
    subclass: string
    race: string
    level: number
    stats: Stats
    activeState?: {
      limitedFeatures?: Record<string, LimitedFeatureState>
    } | null
  }
  classInfo: HydratedClassInfo
  subclassInfo: HydratedSubclassInfo | null
  raceInfo: HydratedRaceInfo | null
  isSpellcaster: boolean
  proficiencyBonus: number
  abilityModifiers: Record<string, number>
}

export function aggregateActions(params: AggregateActionsParams): CharacterAction[] {
  const actions: CharacterAction[] = []
  const { isSpellcaster, life, abilityModifiers, proficiencyBonus } = params

  actions.push(...getStandardActions(isSpellcaster))
  actions.push(...getWeaponAttacks(params))
  actions.push(...getClassFeatureActions(params))
  actions.push(...getSubclassFeatureActions(params))
  actions.push(...getRacialActions(params))

  // Enhance actions with calculated damage dice, save DCs, and scaling notes
  return enhanceAllActionMechanics(actions, {
    className: life.class,
    classLevel: life.level,
    characterLevel: life.level,
    abilityModifiers,
    proficiencyBonus,
    raceName: life.race,
  })
}

function getStandardActions(isSpellcaster: boolean): CharacterAction[] {
  return STANDARD_ACTIONS.filter((action) => (action.id === 'cast-spell' ? isSpellcaster : true)).map(
    (action) => ({
    id: `standard-${action.id}`,
    name: action.name,
    timing: action.timing,
    source: 'standard',
    sourceName: 'Standard Actions',
    description: action.description,
    shortDescription: action.shortDescription,
    isStandard: true,
    })
  )
}

function getWeaponAttacks(params: AggregateActionsParams): CharacterAction[] {
  const { proficiencyBonus, abilityModifiers, life } = params
  const actions: CharacterAction[] = []

  const strMod = abilityModifiers.str ?? 0
  const dexMod = abilityModifiers.dex ?? 0
  const classLower = life.class.toLowerCase()
  let extraAttackNote = ''

  if (['fighter', 'paladin', 'ranger', 'barbarian', 'monk'].includes(classLower)) {
    if (life.level >= 5) extraAttackNote = ' (Extra Attack: 2 attacks)'
    if (classLower === 'fighter' && life.level >= 11) extraAttackNote = ' (Extra Attack: 3 attacks)'
    if (classLower === 'fighter' && life.level >= 20) extraAttackNote = ' (Extra Attack: 4 attacks)'
  }

  actions.push({
    id: 'weapon-melee',
    name: `Melee Weapon Attack${extraAttackNote}`,
    timing: 'action',
    source: 'weapon',
    sourceName: 'Equipped Weapon',
    isAttack: true,
    attackBonus: proficiencyBonus + Math.max(strMod, dexMod),
    damage: `Weapon die + ${strMod} (STR) or ${dexMod} (DEX for finesse)`,
    description:
      'Make a melee attack with your equipped weapon. Add STR modifier to hit and damage (or DEX for finesse weapons).',
    shortDescription: `+${proficiencyBonus + strMod} to hit (STR) or +${proficiencyBonus + dexMod} (DEX/finesse)`,
  })

  actions.push({
    id: 'weapon-ranged',
    name: `Ranged Weapon Attack${extraAttackNote}`,
    timing: 'action',
    source: 'weapon',
    sourceName: 'Equipped Weapon',
    isAttack: true,
    attackBonus: proficiencyBonus + dexMod,
    damage: `Weapon die + ${dexMod}`,
    description: 'Make a ranged attack with your equipped weapon. Add DEX modifier to hit and damage.',
    shortDescription: `+${proficiencyBonus + dexMod} to hit`,
  })

  actions.push({
    id: 'weapon-unarmed',
    name: 'Unarmed Strike',
    timing: 'action',
    source: 'weapon',
    sourceName: 'Natural Weapons',
    isAttack: true,
    attackBonus: proficiencyBonus + strMod,
    damage: `1+${strMod} bludgeoning`,
    damageType: 'bludgeoning',
    range: '5 ft',
    description: 'Strike with your fist, elbow, knee, or other body part.',
  })

  return actions
}

function getClassFeatureActions(params: AggregateActionsParams): CharacterAction[] {
  const { classInfo, life } = params
  const actions: CharacterAction[] = []

  const classLower = life.class.toLowerCase()
  const mappings = CLASS_ACTION_MAPPINGS[classLower] || []

  for (const feature of classInfo.features) {
    const mapping = mappings.find((m) =>
      feature.name.toLowerCase().includes(m.featureName.toLowerCase())
    )
    if (!mapping) continue

    let usesRemaining: number | undefined
    let maxUses: number | undefined
    if (mapping.isLimited && mapping.featureKey && life.activeState?.limitedFeatures) {
      const featureState = life.activeState.limitedFeatures[mapping.featureKey]
      if (featureState) {
        usesRemaining = featureState.max - featureState.used
        maxUses = featureState.max
      }
    }

    actions.push({
      id: `class-${feature.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: feature.name,
      timing: mapping.timing,
      source: 'class',
      sourceName: life.class,
      description: mapping.description || feature.description || '',
      isLimited: mapping.isLimited,
      featureKey: mapping.featureKey,
      usesRemaining,
      maxUses,
      recharge: mapping.recharge,
      mechanicsKey: mapping.mechanicsKey,
    })
  }

  return actions
}

function getSubclassFeatureActions(params: AggregateActionsParams): CharacterAction[] {
  const { subclassInfo, life } = params
  const actions: CharacterAction[] = []
  if (!subclassInfo) return actions

  const subclassLower = life.subclass.toLowerCase()
  const mappings = SUBCLASS_ACTION_MAPPINGS[subclassLower] || []

  for (const feature of subclassInfo.features) {
    const mapping = mappings.find((m) =>
      feature.name.toLowerCase().includes(m.featureName.toLowerCase())
    )
    if (!mapping) continue

    let usesRemaining: number | undefined
    let maxUses: number | undefined
    if (mapping.isLimited && mapping.featureKey && life.activeState?.limitedFeatures) {
      const featureState = life.activeState.limitedFeatures[mapping.featureKey]
      if (featureState) {
        usesRemaining = featureState.max - featureState.used
        maxUses = featureState.max
      }
    }

    actions.push({
      id: `subclass-${feature.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: feature.name,
      timing: mapping.timing,
      source: 'class',
      sourceName: `${life.class} (${life.subclass})`,
      description: mapping.description || feature.description || '',
      isLimited: mapping.isLimited,
      featureKey: mapping.featureKey,
      usesRemaining,
      maxUses,
      recharge: mapping.recharge,
      mechanicsKey: mapping.mechanicsKey,
    })
  }

  return actions
}

function getRacialActions(params: AggregateActionsParams): CharacterAction[] {
  const { raceInfo, life } = params
  const actions: CharacterAction[] = []
  if (!raceInfo) return actions

  const racialActionMap: Record<string, { timing: ActionTiming; isLimited: boolean; recharge?: 'short' | 'long'; mechanicsKey?: string }> = {
    'breath weapon': { timing: 'action', isLimited: true, recharge: 'short', mechanicsKey: 'breath-weapon' },
    'fey step': { timing: 'bonus', isLimited: true, recharge: 'short', mechanicsKey: 'fey-step' },
    'misty step': { timing: 'bonus', isLimited: true, recharge: 'long' },
    'relentless endurance': { timing: 'reaction', isLimited: true, recharge: 'long', mechanicsKey: 'relentless-endurance' },
    'hellish rebuke': { timing: 'reaction', isLimited: true, recharge: 'long', mechanicsKey: 'hellish-rebuke' },
    'healing hands': { timing: 'action', isLimited: true, recharge: 'long', mechanicsKey: 'healing-hands' },
    'celestial revelation': { timing: 'bonus', isLimited: true, recharge: 'long' },
    'fury of the small': { timing: 'special', isLimited: true, recharge: 'short', mechanicsKey: 'fury-of-the-small' },
    'nimble escape': { timing: 'bonus', isLimited: false },
    "stone's endurance": { timing: 'reaction', isLimited: true, recharge: 'short', mechanicsKey: "stone's-endurance" },
  }

  for (const trait of raceInfo.traits) {
    const traitLower = trait.name.toLowerCase()
    for (const [key, config] of Object.entries(racialActionMap)) {
      if (!traitLower.includes(key)) continue
      actions.push({
        id: `race-${trait.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: trait.name,
        timing: config.timing,
        source: 'race',
        sourceName: life.race,
        description: trait.description || '',
        isLimited: config.isLimited,
        recharge: config.recharge,
        mechanicsKey: config.mechanicsKey,
      })
      break
    }
  }

  return actions
}

