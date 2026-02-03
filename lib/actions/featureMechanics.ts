/**
 * Hardcoded mechanics mappings for class and racial features.
 * These provide damage formulas, save DC calculations, and scaling notes.
 */

export interface FeatureMechanics {
  mechanicsKey: string
  damageFormula?: (classLevel: number, charLevel: number, mods: Record<string, number>) => string
  healingFormula?: (classLevel: number, charLevel: number, mods: Record<string, number>) => string
  damageType?: string
  saveDC?: { ability: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha' }
  saveAbility?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha' // What the target saves with
  scalingNote?: string
  resourceCost?: { type: string; amount: number | 'variable' }
}

// Helper to calculate sneak attack dice: ceil(level/2)d6
function sneakAttackDice(rogueLevel: number): string {
  const dice = Math.ceil(rogueLevel / 2)
  return `${dice}d6`
}

// Helper to calculate martial arts die by monk level
function martialArtsDie(monkLevel: number): string {
  if (monkLevel >= 17) return '1d10'
  if (monkLevel >= 11) return '1d8'
  if (monkLevel >= 5) return '1d6'
  return '1d4'
}

// Helper to calculate superiority die by fighter level
function superiorityDie(fighterLevel: number): string {
  if (fighterLevel >= 18) return '1d12'
  if (fighterLevel >= 10) return '1d10'
  return '1d8'
}

// Helper for breath weapon damage by character level
function breathWeaponDamage(charLevel: number): string {
  if (charLevel >= 16) return '5d6'
  if (charLevel >= 11) return '4d6'
  if (charLevel >= 6) return '3d6'
  return '2d6'
}

// Helper for bardic inspiration die by bard level
function bardicInspirationDie(bardLevel: number): string {
  if (bardLevel >= 15) return '1d12'
  if (bardLevel >= 10) return '1d10'
  if (bardLevel >= 5) return '1d8'
  return '1d6'
}

export const CLASS_FEATURE_MECHANICS: Record<string, FeatureMechanics> = {
  // Rogue
  'sneak-attack': {
    mechanicsKey: 'sneak-attack',
    damageFormula: (classLevel) => sneakAttackDice(classLevel),
    damageType: 'weapon',
    scalingNote: 'Increases by 1d6 every 2 rogue levels',
  },

  // Monk
  'martial-arts': {
    mechanicsKey: 'martial-arts',
    damageFormula: (classLevel) => martialArtsDie(classLevel),
    damageType: 'bludgeoning',
    scalingNote: '1d4 → 1d6 (5th) → 1d8 (11th) → 1d10 (17th)',
  },
  'flurry-of-blows': {
    mechanicsKey: 'flurry-of-blows',
    damageFormula: (classLevel) => `2×${martialArtsDie(classLevel)}`,
    damageType: 'bludgeoning',
    resourceCost: { type: 'ki', amount: 1 },
    scalingNote: 'Uses Martial Arts die',
  },
  'stunning-strike': {
    mechanicsKey: 'stunning-strike',
    saveDC: { ability: 'wis' },
    saveAbility: 'con',
    resourceCost: { type: 'ki', amount: 1 },
    scalingNote: 'Target stunned until end of your next turn on failed save',
  },

  // Fighter
  'second-wind': {
    mechanicsKey: 'second-wind',
    healingFormula: (classLevel) => `1d10+${classLevel}`,
    scalingNote: 'Healing increases with fighter level',
  },
  'action-surge': {
    mechanicsKey: 'action-surge',
    scalingNote: 'Gain an additional action on your turn',
  },

  // Fighter - Battle Master
  'combat-superiority': {
    mechanicsKey: 'combat-superiority',
    damageFormula: (classLevel) => superiorityDie(classLevel),
    scalingNote: '1d8 → 1d10 (10th) → 1d12 (18th)',
  },

  // Paladin
  'divine-smite': {
    mechanicsKey: 'divine-smite',
    damageFormula: () => '2d8',
    damageType: 'radiant',
    resourceCost: { type: 'spell slot', amount: 'variable' },
    scalingNote: '+1d8 per slot level above 1st, +1d8 vs undead/fiends (max 5d8)',
  },
  'lay-on-hands': {
    mechanicsKey: 'lay-on-hands',
    healingFormula: (classLevel) => `up to ${classLevel * 5} HP`,
    scalingNote: 'Pool = 5 × paladin level',
  },

  // Barbarian
  'rage': {
    mechanicsKey: 'rage',
    damageFormula: (classLevel) => {
      if (classLevel >= 16) return '+4'
      if (classLevel >= 9) return '+3'
      return '+2'
    },
    damageType: 'weapon (melee)',
    scalingNote: '+2 → +3 (9th) → +4 (16th) bonus damage while raging',
  },

  // Bard
  'bardic-inspiration': {
    mechanicsKey: 'bardic-inspiration',
    damageFormula: (classLevel) => bardicInspirationDie(classLevel),
    scalingNote: '1d6 → 1d8 (5th) → 1d10 (10th) → 1d12 (15th)',
  },

  // Cleric/Paladin
  'channel-divinity': {
    mechanicsKey: 'channel-divinity',
    saveDC: { ability: 'wis' },
    scalingNote: 'Effect depends on domain/oath',
  },
  'turn-undead': {
    mechanicsKey: 'turn-undead',
    saveDC: { ability: 'wis' },
    saveAbility: 'wis',
    scalingNote: 'Undead must flee for 1 minute on failed save',
  },

  // Sorcerer
  'font-of-magic': {
    mechanicsKey: 'font-of-magic',
    scalingNote: 'Convert spell slots ↔ sorcery points',
  },

  // Warlock
  'eldritch-blast': {
    mechanicsKey: 'eldritch-blast',
    damageFormula: (_, charLevel, mods) => {
      const beams = charLevel >= 17 ? 4 : charLevel >= 11 ? 3 : charLevel >= 5 ? 2 : 1
      const chaMod = mods.cha ?? 0
      // Only add CHA mod if they likely have Agonizing Blast (assume at level 2+)
      if (charLevel >= 2 && chaMod > 0) {
        return `${beams}×(1d10+${chaMod})`
      }
      return `${beams}×1d10`
    },
    damageType: 'force',
    scalingNote: '1 beam → 2 (5th) → 3 (11th) → 4 (17th)',
  },

  // Wizard
  'arcane-recovery': {
    mechanicsKey: 'arcane-recovery',
    scalingNote: `Recover spell slots totaling up to half wizard level (rounded up)`,
  },
}

export const RACIAL_FEATURE_MECHANICS: Record<string, FeatureMechanics> = {
  'breath-weapon': {
    mechanicsKey: 'breath-weapon',
    damageFormula: (_, charLevel) => breathWeaponDamage(charLevel),
    damageType: 'varies by ancestry',
    saveDC: { ability: 'con' },
    saveAbility: 'dex', // Most breath weapons are DEX saves
    scalingNote: '2d6 → 3d6 (6th) → 4d6 (11th) → 5d6 (16th)',
  },
  'healing-hands': {
    mechanicsKey: 'healing-hands',
    healingFormula: (_, charLevel) => `${charLevel}`,
    scalingNote: 'Heal HP equal to your character level',
  },
  'hellish-rebuke': {
    mechanicsKey: 'hellish-rebuke',
    damageFormula: (_, charLevel) => {
      if (charLevel >= 5) return '3d10'
      return '2d10'
    },
    damageType: 'fire',
    saveAbility: 'dex',
    scalingNote: '2d10 fire, half on successful DEX save',
  },
  'relentless-endurance': {
    mechanicsKey: 'relentless-endurance',
    scalingNote: 'Drop to 1 HP instead of 0 HP once per long rest',
  },
  "stone's-endurance": {
    mechanicsKey: "stone's-endurance",
    damageFormula: (_, __, mods) => `1d12+${mods.con ?? 0}`,
    scalingNote: 'Reduce damage taken as a reaction',
  },
  'fury-of-the-small': {
    mechanicsKey: 'fury-of-the-small',
    damageFormula: (_, charLevel) => `+${charLevel}`,
    scalingNote: 'Extra damage equal to character level',
  },
  'fey-step': {
    mechanicsKey: 'fey-step',
    scalingNote: 'Teleport up to 30 feet as a bonus action',
  },
}

// Mapping from feature names (lowercase) to mechanics keys
export const FEATURE_NAME_TO_MECHANICS_KEY: Record<string, string> = {
  'sneak attack': 'sneak-attack',
  'martial arts': 'martial-arts',
  'flurry of blows': 'flurry-of-blows',
  'stunning strike': 'stunning-strike',
  'second wind': 'second-wind',
  'action surge': 'action-surge',
  'combat superiority': 'combat-superiority',
  'divine smite': 'divine-smite',
  'lay on hands': 'lay-on-hands',
  'rage': 'rage',
  'bardic inspiration': 'bardic-inspiration',
  'channel divinity': 'channel-divinity',
  'turn undead': 'turn-undead',
  'font of magic': 'font-of-magic',
  'eldritch blast': 'eldritch-blast',
  'arcane recovery': 'arcane-recovery',
  // Racial
  'breath weapon': 'breath-weapon',
  'healing hands': 'healing-hands',
  'hellish rebuke': 'hellish-rebuke',
  'relentless endurance': 'relentless-endurance',
  "stone's endurance": "stone's-endurance",
  'fury of the small': 'fury-of-the-small',
  'fey step': 'fey-step',
}
