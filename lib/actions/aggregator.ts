import type { CharacterAction, ActionTiming } from './types'
import type { HydratedSpell, HydratedClassInfo, HydratedRaceInfo, HydratedSubclassInfo } from '@/lib/types/5etools'
import type { Stats } from '@/lib/types'

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
  spells: HydratedSpell[]
  proficiencyBonus: number
  abilityModifiers: Record<string, number>
}

export function aggregateActions(params: AggregateActionsParams): CharacterAction[] {
  const actions: CharacterAction[] = []

  actions.push(...getStandardActions())
  actions.push(...getWeaponAttacks(params))
  actions.push(...getSpellActions(params))
  actions.push(...getClassFeatureActions(params))
  actions.push(...getRacialActions(params))

  return actions
}

function getStandardActions(): CharacterAction[] {
  return [
    {
      id: 'standard-attack',
      name: 'Attack',
      timing: 'action',
      source: 'standard',
      sourceName: 'Standard Actions',
      description: 'Make a melee or ranged attack with a weapon you are holding.',
      shortDescription: 'Attack with a weapon',
    },
    {
      id: 'standard-dash',
      name: 'Dash',
      timing: 'action',
      source: 'standard',
      sourceName: 'Standard Actions',
      description: 'Gain extra movement equal to your speed for the current turn.',
      shortDescription: 'Double your movement',
    },
    {
      id: 'standard-disengage',
      name: 'Disengage',
      timing: 'action',
      source: 'standard',
      sourceName: 'Standard Actions',
      description: "Your movement doesn't provoke opportunity attacks for the rest of the turn.",
      shortDescription: 'Avoid opportunity attacks',
    },
    {
      id: 'standard-dodge',
      name: 'Dodge',
      timing: 'action',
      source: 'standard',
      sourceName: 'Standard Actions',
      description:
        'Until your next turn, any attack roll against you has disadvantage if you can see the attacker, and you make Dexterity saving throws with advantage.',
      shortDescription: 'Disadvantage on attacks against you',
    },
    {
      id: 'standard-help',
      name: 'Help',
      timing: 'action',
      source: 'standard',
      sourceName: 'Standard Actions',
      description: 'Give an ally advantage on their next ability check or attack roll.',
      shortDescription: 'Give ally advantage',
    },
    {
      id: 'standard-hide',
      name: 'Hide',
      timing: 'action',
      source: 'standard',
      sourceName: 'Standard Actions',
      description: 'Make a Dexterity (Stealth) check to hide.',
      shortDescription: 'Attempt to hide',
    },
    {
      id: 'standard-ready',
      name: 'Ready',
      timing: 'action',
      source: 'standard',
      sourceName: 'Standard Actions',
      description: 'Prepare an action to trigger based on a specific circumstance.',
      shortDescription: 'Prepare a triggered action',
    },
    {
      id: 'standard-search',
      name: 'Search',
      timing: 'action',
      source: 'standard',
      sourceName: 'Standard Actions',
      description: 'Make a Wisdom (Perception) or Intelligence (Investigation) check.',
      shortDescription: 'Look for something',
    },
    {
      id: 'standard-use-object',
      name: 'Use an Object',
      timing: 'action',
      source: 'standard',
      sourceName: 'Standard Actions',
      description: 'Interact with an object that requires an action to use.',
      shortDescription: 'Use an item',
    },
    {
      id: 'standard-opportunity-attack',
      name: 'Opportunity Attack',
      timing: 'reaction',
      source: 'standard',
      sourceName: 'Standard Actions',
      description:
        'When a hostile creature you can see moves out of your reach, make one melee attack against it.',
      shortDescription: 'Attack when enemy leaves reach',
    },
  ]
}

function getWeaponAttacks(params: AggregateActionsParams): CharacterAction[] {
  const { proficiencyBonus, abilityModifiers } = params
  const actions: CharacterAction[] = []

  const strMod = abilityModifiers.str ?? 0
  actions.push({
    id: 'weapon-unarmed',
    name: 'Unarmed Strike',
    timing: 'action',
    source: 'standard',
    sourceName: 'Standard Actions',
    isAttack: true,
    attackBonus: proficiencyBonus + strMod,
    damage: `1+${strMod} bludgeoning`,
    damageType: 'bludgeoning',
    range: '5 ft',
    description: 'Punch, kick, or strike with your body.',
  })

  return actions
}

function getSpellActions(params: AggregateActionsParams): CharacterAction[] {
  const { spells, proficiencyBonus, abilityModifiers, life } = params
  const actions: CharacterAction[] = []

  const spellMod = abilityModifiers[guessSpellcastingAbility(life.class)] ?? 0
  const spellAttackBonus = proficiencyBonus + spellMod

  for (const spell of spells) {
    const timing = getSpellTiming(spell)

    actions.push({
      id: `spell-${spell.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: spell.name,
      timing,
      source: 'spell',
      sourceName: life.class,
      isSpell: true,
      spellLevel: spell.level,
      isCantrip: spell.level === 0,
      requiresConcentration: spell.duration.toLowerCase().includes('concentration'),
      spellSchool: spell.school,
      attackBonus: spellAttackBonus,
      range: spell.range,
      description: spell.description || `Level ${spell.level} ${spell.school} spell`,
      shortDescription: spell.name,
    })
  }

  return actions
}

function getSpellTiming(spell: HydratedSpell): ActionTiming {
  const castingTime = spell.castingTime.toLowerCase()
  if (castingTime.includes('bonus')) return 'bonus'
  if (castingTime.includes('reaction')) return 'reaction'
  if (castingTime.includes('minute') || castingTime.includes('hour')) return 'special'
  return 'action'
}

function getClassFeatureActions(params: AggregateActionsParams): CharacterAction[] {
  const { classInfo, subclassInfo, life } = params
  const actions: CharacterAction[] = []

  const featureActionMap: Record<string, Partial<CharacterAction>> = {
    'second wind': {
      timing: 'bonus',
      isLimited: true,
      featureKey: 'secondWind',
      description: 'Regain 1d10 + fighter level hit points.',
    },
    'action surge': {
      timing: 'special',
      isLimited: true,
      featureKey: 'actionSurge',
      description: 'Take one additional action on top of your regular action.',
    },
    rage: {
      timing: 'bonus',
      isLimited: true,
      featureKey: 'rage',
      description:
        'Enter a rage for advantage on Strength checks/saves, bonus rage damage, and resistance to physical damage.',
    },
    'cunning action': {
      timing: 'bonus',
      description: 'Dash, Disengage, or Hide as a bonus action.',
    },
    'wild shape': {
      timing: 'action',
      isLimited: true,
      featureKey: 'wildShape',
      description: 'Transform into a beast you have seen before.',
    },
    'channel divinity': {
      timing: 'action',
      isLimited: true,
      featureKey: 'channelDivinity',
      description: 'Channel divine energy for various effects based on your domain/oath.',
    },
    'flurry of blows': {
      timing: 'bonus',
      isLimited: true,
      featureKey: 'kiPoints',
      description: 'Spend 1 ki point to make two unarmed strikes as a bonus action.',
    },
    'patient defense': {
      timing: 'bonus',
      isLimited: true,
      featureKey: 'kiPoints',
      description: 'Spend 1 ki point to take the Dodge action as a bonus action.',
    },
    'step of the wind': {
      timing: 'bonus',
      isLimited: true,
      featureKey: 'kiPoints',
      description:
        'Spend 1 ki point to Disengage or Dash as a bonus action, and your jump distance is doubled.',
    },
    'lay on hands': {
      timing: 'action',
      isLimited: true,
      featureKey: 'layOnHands',
      description:
        'Touch a creature and restore hit points from your pool, or spend 5 points to cure disease/poison.',
    },
  }

  const allFeatures = [...classInfo.features, ...(subclassInfo?.features || [])]
  for (const feature of allFeatures) {
    const featureLower = feature.name.toLowerCase()
    const actionInfo = featureActionMap[featureLower]

    if (actionInfo) {
      actions.push({
        id: `class-${featureLower.replace(/\s+/g, '-')}`,
        name: feature.name,
        timing: actionInfo.timing || 'action',
        source: 'class',
        sourceName: life.class,
        isLimited: actionInfo.isLimited,
        featureKey: actionInfo.featureKey,
        description: actionInfo.description || feature.description,
        shortDescription: feature.description?.split('. ')[0],
      })
    }
  }

  return actions
}

function getRacialActions(params: AggregateActionsParams): CharacterAction[] {
  const { raceInfo, life } = params
  const actions: CharacterAction[] = []
  if (!raceInfo) return actions

  const racialActionMap: Record<string, Partial<CharacterAction>> = {
    'breath weapon': {
      timing: 'action',
      isLimited: true,
      recharge: 'short',
      description: 'Exhale destructive energy based on your draconic ancestry.',
    },
    'fey step': {
      timing: 'bonus',
      isLimited: true,
      recharge: 'short',
      description: 'Teleport up to 30 feet to an unoccupied space you can see.',
    },
    'relentless endurance': {
      timing: 'reaction',
      isLimited: true,
      recharge: 'long',
      description: 'When reduced to 0 HP but not killed, drop to 1 HP instead.',
    },
    'hellish rebuke': {
      timing: 'reaction',
      isSpell: true,
      description: 'Cast Hellish Rebuke once per long rest (Tiefling).',
    },
  }

  for (const trait of raceInfo.traits) {
    const traitLower = trait.name.toLowerCase()
    const actionInfo = racialActionMap[traitLower]

    if (actionInfo) {
      actions.push({
        id: `race-${traitLower.replace(/\s+/g, '-')}`,
        name: trait.name,
        timing: actionInfo.timing || 'action',
        source: 'race',
        sourceName: life.race,
        ...actionInfo,
        description: actionInfo.description || trait.description,
      })
    }
  }

  return actions
}

function guessSpellcastingAbility(className: string): string {
  const abilities: Record<string, string> = {
    bard: 'cha',
    cleric: 'wis',
    druid: 'wis',
    paladin: 'cha',
    ranger: 'wis',
    sorcerer: 'cha',
    warlock: 'cha',
    wizard: 'int',
    artificer: 'int',
    fighter: 'int',
    rogue: 'int',
  }

  return abilities[className.toLowerCase()] || 'int'
}
