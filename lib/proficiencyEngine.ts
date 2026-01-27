import proficiencyData from '@/lib/data/skillProficiency.json'
import { Stats, StatName } from './statMapper'

type ProficiencyMap = Record<string, { count: number; options: string[] }>

const proficiencies = proficiencyData as ProficiencyMap

// Map each skill to its governing ability
export const SKILL_ABILITIES: Record<string, StatName> = {
  // Strength
  Athletics: 'str',
  // Dexterity
  Acrobatics: 'dex',
  'Sleight of Hand': 'dex',
  Stealth: 'dex',
  // Intelligence
  Arcana: 'int',
  History: 'int',
  Investigation: 'int',
  Nature: 'int',
  Religion: 'int',
  // Wisdom
  'Animal Handling': 'wis',
  Insight: 'wis',
  Medicine: 'wis',
  Perception: 'wis',
  Survival: 'wis',
  // Charisma
  Deception: 'cha',
  Intimidation: 'cha',
  Performance: 'cha',
  Persuasion: 'cha',
}

// All 18 skills grouped by ability for UI display
export const SKILLS_BY_ABILITY: Record<StatName, string[]> = {
  str: ['Athletics'],
  dex: ['Acrobatics', 'Sleight of Hand', 'Stealth'],
  con: [], // No skills use CON
  int: ['Arcana', 'History', 'Investigation', 'Nature', 'Religion'],
  wis: ['Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival'],
  cha: ['Deception', 'Intimidation', 'Performance', 'Persuasion'],
}

// All skills in a flat list
export const ALL_SKILLS = Object.keys(SKILL_ABILITIES)

export function selectSkillProficiencies(className: string): string[] {
  const classData = proficiencies[className]
  if (!classData) {
    return []
  }

  // Shuffle the options array and select the required count
  const shuffled = [...classData.options].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, classData.count)
}

export function calculateSkillModifier(
  skillName: string,
  stats: Stats,
  proficiencies: string[],
  proficiencyBonus: number
): number {
  const ability = SKILL_ABILITIES[skillName]
  if (!ability) {
    return 0
  }

  const statValue = stats[ability]
  const statMod = Math.floor((statValue - 10) / 2)
  const isProficient = proficiencies.includes(skillName)

  return statMod + (isProficient ? proficiencyBonus : 0)
}

export function getSkillAbility(skillName: string): StatName | undefined {
  return SKILL_ABILITIES[skillName]
}

export function isProficient(skillName: string, proficiencies: string[]): boolean {
  return proficiencies.includes(skillName)
}
