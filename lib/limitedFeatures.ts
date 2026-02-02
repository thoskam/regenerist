/**
 * Limited-use class/subclass features for Active State tracking.
 * Maps class/subclass to their limited-use features with max uses and recharge type.
 */

export interface LimitedFeatureEntry {
  name: string
  max: number
  used: number
  recharge: 'short' | 'long' | 'dawn'
  description?: string
}

export type LimitedFeaturesState = Record<string, LimitedFeatureEntry>

export function calculateLimitedFeatures(
  className: string,
  subclass: string | undefined,
  level: number,
  conModifier: number = 0,
  wisModifier: number = 0,
  chaModifier: number = 0
): LimitedFeaturesState {
  const features: LimitedFeaturesState = {}
  const c = className.toLowerCase()
  const sub = (subclass || '').toLowerCase()

  // Base class features
  switch (c) {
    case 'barbarian':
      if (level >= 1) {
        const rageUses =
          level >= 20 ? 999 : level >= 17 ? 6 : level >= 12 ? 5 : level >= 6 ? 4 : level >= 3 ? 3 : 2
        features.rage = { name: 'Rage', max: rageUses, used: 0, recharge: 'long' }
      }
      break

    case 'bard':
      if (level >= 1) {
        const inspirationDice = Math.max(1, chaModifier)
        features.bardicInspiration = {
          name: 'Bardic Inspiration',
          max: inspirationDice,
          used: 0,
          recharge: level >= 5 ? 'short' : 'long',
        }
      }
      break

    case 'cleric':
      if (level >= 2) {
        const channelUses = level >= 18 ? 3 : level >= 6 ? 2 : 1
        features.channelDivinity = {
          name: 'Channel Divinity',
          max: channelUses,
          used: 0,
          recharge: 'short',
        }
      }
      break

    case 'druid':
      if (level >= 2) {
        features.wildShape = { name: 'Wild Shape', max: 2, used: 0, recharge: 'short' }
      }
      break

    case 'fighter':
      if (level >= 1) {
        features.secondWind = { name: 'Second Wind', max: 1, used: 0, recharge: 'short' }
      }
      if (level >= 2) {
        const surgeUses = level >= 17 ? 2 : 1
        features.actionSurge = { name: 'Action Surge', max: surgeUses, used: 0, recharge: 'short' }
      }
      if (level >= 9) {
        const indomitableUses = level >= 17 ? 3 : level >= 13 ? 2 : 1
        features.indomitable = {
          name: 'Indomitable',
          max: indomitableUses,
          used: 0,
          recharge: 'long',
        }
      }
      break

    case 'monk':
      if (level >= 2) {
        features.kiPoints = { name: 'Ki Points', max: level, used: 0, recharge: 'short' }
      }
      break

    case 'paladin':
      if (level >= 1) {
        features.layOnHands = {
          name: 'Lay on Hands',
          max: level * 5,
          used: 0,
          recharge: 'long',
        }
      }
      if (level >= 3) {
        const channelUses = level >= 18 ? 3 : level >= 6 ? 2 : 1
        features.channelDivinity = {
          name: 'Channel Divinity',
          max: channelUses,
          used: 0,
          recharge: 'short',
        }
      }
      break

    case 'sorcerer':
      if (level >= 2) {
        features.sorceryPoints = {
          name: 'Sorcery Points',
          max: level,
          used: 0,
          recharge: 'long',
        }
      }
      break

    case 'wizard':
      if (level >= 1) {
        const recoverySlots = Math.ceil(level / 2)
        features.arcaneRecovery = {
          name: 'Arcane Recovery',
          max: recoverySlots,
          used: 0,
          recharge: 'long',
        }
      }
      break

    case 'warlock':
      // Pact Magic slots tracked separately in ActiveState
      break

    case 'ranger':
    case 'artificer':
      // Add if needed
      break
  }

  // Subclass features
  if (sub) {
    switch (sub) {
      case 'battle master':
        if (level >= 3) {
          const superiorityDice = level >= 15 ? 6 : level >= 7 ? 5 : 4
          features.superiorityDice = {
            name: 'Superiority Dice',
            max: superiorityDice,
            used: 0,
            recharge: 'short',
          }
        }
        break
      case 'champion':
        // No limited uses
        break
      case 'eldritch knight':
      case 'arcane trickster':
        // Spell slots handled elsewhere
        break
    }
  }

  return features
}
