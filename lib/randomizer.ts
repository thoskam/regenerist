import classes from './data/classes.json'
import races from './data/races.json'
import effects from './data/effects.json'

export function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function randomClass(): { className: string; subclass: string } {
  const combo = randomFromArray(classes)
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
