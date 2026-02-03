import type { ActionTiming } from '@/lib/actions/types'

export interface StandardAction {
  id: string
  name: string
  timing: ActionTiming
  description: string
  shortDescription: string
}

export const STANDARD_ACTIONS: StandardAction[] = [
  {
    id: 'attack',
    name: 'Attack',
    timing: 'action',
    description:
      'Make one melee or ranged attack. At higher levels, martial classes can make multiple attacks with this action (Extra Attack feature).',
    shortDescription: 'Make a melee or ranged attack',
  },
  {
    id: 'cast-spell',
    name: 'Cast a Spell',
    timing: 'action',
    description: 'Cast a spell with a casting time of 1 action. See your spellbook for available spells.',
    shortDescription: 'Cast a spell (1 action casting time)',
  },
  {
    id: 'dash',
    name: 'Dash',
    timing: 'action',
    description: 'Gain extra movement for the current turn. The increase equals your speed, after applying any modifiers.',
    shortDescription: 'Double your movement this turn',
  },
  {
    id: 'disengage',
    name: 'Disengage',
    timing: 'action',
    description: "Your movement doesn't provoke opportunity attacks for the rest of the turn.",
    shortDescription: 'Move without provoking opportunity attacks',
  },
  {
    id: 'dodge',
    name: 'Dodge',
    timing: 'action',
    description:
      'Until your next turn, any attack roll made against you has disadvantage if you can see the attacker, and you make Dexterity saving throws with advantage. You lose this benefit if you are incapacitated or if your speed drops to 0.',
    shortDescription: 'Attacks against you have disadvantage',
  },
  {
    id: 'help',
    name: 'Help',
    timing: 'action',
    description:
      'Lend your aid to another creature in completing a task (grants advantage on next ability check), or distract a foe within 5 feet (ally gains advantage on next attack roll against that target).',
    shortDescription: 'Give an ally advantage on a check or attack',
  },
  {
    id: 'hide',
    name: 'Hide',
    timing: 'action',
    description:
      'Make a Dexterity (Stealth) check in an attempt to hide. If you succeed, you gain certain benefits as described in "Unseen Attackers and Targets."',
    shortDescription: 'Attempt to hide (Stealth check)',
  },
  {
    id: 'ready',
    name: 'Ready',
    timing: 'action',
    description:
      'Prepare to take an action in response to a trigger you define. When the trigger occurs, you can either take your reaction to execute the readied action, or ignore the trigger. Readying a spell requires concentration.',
    shortDescription: 'Prepare an action for a specific trigger',
  },
  {
    id: 'search',
    name: 'Search',
    timing: 'action',
    description:
      'Devote your attention to finding something. Depending on the nature of your search, the DM might have you make a Wisdom (Perception) check or an Intelligence (Investigation) check.',
    shortDescription: 'Look for something (Perception/Investigation)',
  },
  {
    id: 'use-object',
    name: 'Use an Object',
    timing: 'action',
    description:
      "Interact with a second object (beyond your free object interaction) or use an object that requires an action to activate, such as using a Healer's Kit or drinking a potion.",
    shortDescription: 'Use an item that requires an action',
  },
  {
    id: 'grapple',
    name: 'Grapple',
    timing: 'action',
    description:
      'Use the Attack action to make a special melee attack to grapple a creature. Make a Strength (Athletics) check contested by the target\'s Strength (Athletics) or Dexterity (Acrobatics) check.',
    shortDescription: 'Attempt to grab a creature (replaces one attack)',
  },
  {
    id: 'shove',
    name: 'Shove',
    timing: 'action',
    description:
      'Use the Attack action to make a special melee attack to shove a creature. Make a Strength (Athletics) check contested by the target\'s Strength (Athletics) or Dexterity (Acrobatics) check. Push them 5 feet or knock them prone.',
    shortDescription: 'Push or knock down a creature (replaces one attack)',
  },
  {
    id: 'two-weapon-fighting',
    name: 'Two-Weapon Fighting',
    timing: 'bonus',
    description:
      "When you take the Attack action and attack with a light melee weapon in one hand, you can use a bonus action to attack with a different light melee weapon in the other hand. You don't add your ability modifier to the damage unless it's negative.",
    shortDescription: 'Attack with off-hand light weapon',
  },
  {
    id: 'opportunity-attack',
    name: 'Opportunity Attack',
    timing: 'reaction',
    description:
      'When a hostile creature that you can see moves out of your reach, you can use your reaction to make one melee attack against the creature. The attack occurs right before the creature leaves your reach.',
    shortDescription: 'Attack when enemy leaves your reach',
  },
  {
    id: 'interact-object',
    name: 'Interact with Object',
    timing: 'free',
    description:
      'Once per turn, you can interact with one object for free during your move or action (open a door, draw a weapon, pick up an item, etc.).',
    shortDescription: 'One free object interaction per turn',
  },
  {
    id: 'drop-prone',
    name: 'Drop Prone',
    timing: 'free',
    description:
      'Drop prone without using any movement. Standing up costs movement equal to half your speed.',
    shortDescription: 'Fall prone (free), stand up (half movement)',
  },
]
