import classes from './data/classes.json'

// These entries exist in the legacy picker but lack matching local rule data.
// Keep them for existing/manual characters; never silently generate an incomplete form.
export const UNSUPPORTED_CLASS_COMBINATIONS: Record<string, string> = {
  'Barbarian: Path of the World Tree': '2024 subclass; this project uses 2014 progression.',
  'Bard: College of Dance': '2024 subclass; this project uses 2014 progression.',
  'Druid: Circle of the Sea': '2024 subclass; this project uses 2014 progression.',
  'Fighter: Gunslinger': 'Homebrew subclass data is not installed.',
  'Monk: Way of the Warrior': 'No matching subclass data is installed.',
  'Sorcerer: Pyromancy': 'No matching subclass data is installed.',
  'Blood Hunter: Order of the Ghostslayer': 'Blood Hunter class data and mechanics are not installed.',
  'Blood Hunter: Order of the Lycan': 'Blood Hunter class data and mechanics are not installed.',
  'Blood Hunter: Order of the Mutant': 'Blood Hunter class data and mechanics are not installed.',
  'Blood Hunter: Order of the Profane Soul': 'Blood Hunter class data and mechanics are not installed.',
}

export function getClassSupportIssue(className: string, subclass: string): string | null {
  const combination = `${className}: ${subclass}`
  if (!classes.includes(combination)) return 'This class/subclass combination is not in the character catalog.'
  return UNSUPPORTED_CLASS_COMBINATIONS[combination] || null
}

export function isClassSupported(className: string, subclass: string): boolean {
  return getClassSupportIssue(className, subclass) === null
}

export const SUPPORTED_CLASS_COMBINATIONS = classes.filter(combination => {
  const [className, subclass] = combination.split(': ')
  return isClassSupported(className, subclass)
})
