import type { ActionTiming } from './types'

export interface ClassActionMapping {
  featureName: string
  timing: ActionTiming
  isLimited: boolean
  featureKey?: string
  recharge?: 'short' | 'long' | 'dawn'
  description?: string
}

export const CLASS_ACTION_MAPPINGS: Record<string, ClassActionMapping[]> = {
  barbarian: [
    { featureName: 'Rage', timing: 'bonus', isLimited: true, featureKey: 'rage', recharge: 'long' },
    {
      featureName: 'Reckless Attack',
      timing: 'special',
      isLimited: false,
      description:
        'When you make your first attack on your turn, you can decide to attack recklessly, giving you advantage on melee weapon attack rolls using Strength during this turn, but attack rolls against you have advantage until your next turn.',
    },
    { featureName: 'Danger Sense', timing: 'reaction', isLimited: false },
  ],
  bard: [
    { featureName: 'Bardic Inspiration', timing: 'bonus', isLimited: true, featureKey: 'bardicInspiration', recharge: 'long' },
    { featureName: 'Countercharm', timing: 'action', isLimited: false },
  ],
  cleric: [
    { featureName: 'Channel Divinity', timing: 'action', isLimited: true, featureKey: 'channelDivinity', recharge: 'short' },
    { featureName: 'Turn Undead', timing: 'action', isLimited: true, featureKey: 'channelDivinity', recharge: 'short' },
    { featureName: 'Divine Intervention', timing: 'action', isLimited: true, recharge: 'long' },
  ],
  druid: [
    { featureName: 'Wild Shape', timing: 'action', isLimited: true, featureKey: 'wildShape', recharge: 'short' },
  ],
  fighter: [
    {
      featureName: 'Second Wind',
      timing: 'bonus',
      isLimited: true,
      featureKey: 'secondWind',
      recharge: 'short',
      description:
        'You have a limited well of stamina that you can draw on to protect yourself from harm. On your turn, you can use a bonus action to regain hit points equal to 1d10 + your fighter level.',
    },
    {
      featureName: 'Action Surge',
      timing: 'special',
      isLimited: true,
      featureKey: 'actionSurge',
      recharge: 'short',
      description:
        'On your turn, you can take one additional action on top of your regular action and a possible bonus action. Once you use this feature, you must finish a short or long rest before you can use it again.',
    },
    {
      featureName: 'Indomitable',
      timing: 'special',
      isLimited: true,
      featureKey: 'indomitable',
      recharge: 'long',
      description:
        "You can reroll a saving throw that you fail. If you do so, you must use the new roll, and you can't use this feature again until you finish a long rest.",
    },
    {
      featureName: 'Extra Attack',
      timing: 'special',
      isLimited: false,
      description:
        'You can attack twice, instead of once, whenever you take the Attack action on your turn. The number of attacks increases to three at 11th level and four at 20th level.',
    },
  ],
  monk: [
    {
      featureName: 'Flurry of Blows',
      timing: 'bonus',
      isLimited: true,
      featureKey: 'kiPoints',
      description:
        'Immediately after you take the Attack action, you can spend 1 ki point to make two unarmed strikes as a bonus action.',
    },
    {
      featureName: 'Patient Defense',
      timing: 'bonus',
      isLimited: true,
      featureKey: 'kiPoints',
      description: 'You can spend 1 ki point to take the Dodge action as a bonus action on your turn.',
    },
    {
      featureName: 'Step of the Wind',
      timing: 'bonus',
      isLimited: true,
      featureKey: 'kiPoints',
      description:
        'You can spend 1 ki point to take the Disengage or Dash action as a bonus action, and your jump distance is doubled for the turn.',
    },
    {
      featureName: 'Stunning Strike',
      timing: 'special',
      isLimited: true,
      featureKey: 'kiPoints',
      description:
        'When you hit another creature with a melee weapon attack, you can spend 1 ki point to attempt a stunning strike. The target must succeed on a Constitution saving throw or be stunned until the end of your next turn.',
    },
    { featureName: 'Deflect Missiles', timing: 'reaction', isLimited: false },
    { featureName: 'Slow Fall', timing: 'reaction', isLimited: false },
  ],
  paladin: [
    { featureName: 'Lay on Hands', timing: 'action', isLimited: true, featureKey: 'layOnHands', recharge: 'long' },
    {
      featureName: 'Divine Smite',
      timing: 'special',
      isLimited: false,
      description:
        'When you hit a creature with a melee weapon attack, you can expend one spell slot to deal radiant damage in addition to the weapon\'s damage. The extra damage is 2d8 for a 1st-level slot, plus 1d8 for each spell level higher than 1st, to a maximum of 5d8.',
    },
    { featureName: 'Channel Divinity', timing: 'action', isLimited: true, featureKey: 'channelDivinity', recharge: 'short' },
    { featureName: 'Cleansing Touch', timing: 'action', isLimited: true, recharge: 'long' },
  ],
  ranger: [
    {
      featureName: 'Primeval Awareness',
      timing: 'action',
      isLimited: true,
      description: 'You can use your action and expend one ranger spell slot to focus your awareness on the region around you.',
    },
    { featureName: 'Vanish', timing: 'bonus', isLimited: false },
  ],
  rogue: [
    {
      featureName: 'Cunning Action',
      timing: 'bonus',
      isLimited: false,
      description: 'You can take a bonus action on each of your turns to Dash, Disengage, or Hide.',
    },
    {
      featureName: 'Sneak Attack',
      timing: 'special',
      isLimited: false,
      description:
        'Once per turn, you can deal extra damage to one creature you hit with an attack if you have advantage on the attack roll or an ally is within 5 feet of the target.',
    },
    {
      featureName: 'Uncanny Dodge',
      timing: 'reaction',
      isLimited: false,
      description: 'When an attacker that you can see hits you with an attack, you can use your reaction to halve the attack\'s damage against you.',
    },
    { featureName: 'Evasion', timing: 'special', isLimited: false },
  ],
  sorcerer: [
    {
      featureName: 'Font of Magic',
      timing: 'bonus',
      isLimited: true,
      featureKey: 'sorceryPoints',
      description: 'You can use sorcery points to gain additional spell slots, or sacrifice spell slots to gain additional sorcery points.',
    },
    { featureName: 'Metamagic', timing: 'special', isLimited: true, featureKey: 'sorceryPoints' },
  ],
  warlock: [{ featureName: 'Eldritch Invocations', timing: 'special', isLimited: false }],
  wizard: [
    {
      featureName: 'Arcane Recovery',
      timing: 'special',
      isLimited: true,
      featureKey: 'arcaneRecovery',
      recharge: 'long',
      description:
        'Once per day when you finish a short rest, you can recover expended spell slots with a combined level equal to or less than half your wizard level (rounded up).',
    },
  ],
}

export const SUBCLASS_ACTION_MAPPINGS: Record<string, ClassActionMapping[]> = {
  champion: [
    {
      featureName: 'Improved Critical',
      timing: 'special',
      isLimited: false,
      description: 'Your weapon attacks score a critical hit on a roll of 19 or 20.',
    },
    {
      featureName: 'Remarkable Athlete',
      timing: 'special',
      isLimited: false,
      description:
        "Add half your proficiency bonus (round up) to any Strength, Dexterity, or Constitution check that doesn't already use your proficiency bonus. Also increases running long jump distance.",
    },
    {
      featureName: 'Superior Critical',
      timing: 'special',
      isLimited: false,
      description: 'Your weapon attacks score a critical hit on a roll of 18-20.',
    },
  ],
  'battle master': [
    {
      featureName: 'Combat Superiority',
      timing: 'special',
      isLimited: true,
      featureKey: 'superiorityDice',
      recharge: 'short',
      description: 'You have superiority dice that you can expend to fuel various maneuvers.',
    },
    { featureName: 'Know Your Enemy', timing: 'special', isLimited: false },
  ],
  'eldritch knight': [
    {
      featureName: 'War Magic',
      timing: 'bonus',
      isLimited: false,
      description: 'When you use your action to cast a cantrip, you can make one weapon attack as a bonus action.',
    },
    { featureName: 'Eldritch Strike', timing: 'special', isLimited: false },
  ],
  thief: [
    {
      featureName: 'Fast Hands',
      timing: 'bonus',
      isLimited: false,
      description:
        "You can use Cunning Action to make a Dexterity (Sleight of Hand) check, use thieves' tools to disarm a trap or open a lock, or take the Use an Object action.",
    },
    { featureName: 'Second-Story Work', timing: 'special', isLimited: false },
  ],
  assassin: [
    {
      featureName: 'Assassinate',
      timing: 'special',
      isLimited: false,
      description:
        "You have advantage on attack rolls against any creature that hasn't taken a turn in the combat yet. Any hit you score against a surprised creature is a critical hit.",
    },
  ],
}
