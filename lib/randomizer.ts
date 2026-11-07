import { SUPPORTED_CLASS_COMBINATIONS } from './catalog'
import races from './data/races.json'
import effects from './data/effects.json'

export function randomFromArray<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error('Cannot choose from an empty collection')
  return arr[Math.floor(Math.random() * arr.length)]
}

export function randomClass(excludedSubclasses?: string[]): { className: string; subclass: string } {
  let availableClasses = SUPPORTED_CLASS_COMBINATIONS

  // Filter out excluded subclasses if provided
  if (excludedSubclasses && excludedSubclasses.length > 0) {
    availableClasses = availableClasses.filter(combo => {
      const [, subclass] = combo.split(': ')
      return !excludedSubclasses.includes(subclass)
    })
  }

  // Fall back to all classes if all have been used
  if (availableClasses.length === 0) {
    availableClasses = SUPPORTED_CLASS_COMBINATIONS
  }

  const combo = randomFromArray(availableClasses)
  const [className, subclass] = combo.split(': ')
  return { className, subclass }
}

export function randomRace(): string {
  return randomFromArray(races)
}

export function randomEffect(): string {
  return randomFromArray(effects)
}

export function generateCharacterName(): string {
  return 'Flynnwrath Lexington'
}
