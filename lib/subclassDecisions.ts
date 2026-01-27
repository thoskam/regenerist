import decisionsData from '@/lib/data/subClassDecisions.json'

type DecisionsMap = Record<string, string[]>

const decisions = decisionsData as DecisionsMap

export function getSubclassDecision(className: string, subclass: string): string | null {
  // Try different key formats used in the JSON
  const keyFormats = [
    `${className}: ${subclass}`,              // "Barbarian: Path of the Totem Warrior"
    `${subclass} (${className})`,             // "Draconic Bloodline (Sorcerer)"
    `${className}: School of ${subclass}`,    // "Wizard: School of Illusion" (for "Wizard: Illusion")
    subclass,                                 // Direct subclass name
  ]

  for (const key of keyFormats) {
    const options = decisions[key]
    if (options && options.length > 0) {
      return options[Math.floor(Math.random() * options.length)]
    }
  }

  // Check for class-wide decisions (e.g., all Warlocks get Pact Boon)
  const classWideKeys: Record<string, string> = {
    Warlock: 'Warlock: Pact Boon',
  }

  const classWideKey = classWideKeys[className]
  if (classWideKey && decisions[classWideKey]) {
    const options = decisions[classWideKey]
    return options[Math.floor(Math.random() * options.length)]
  }

  return null
}

export function hasSubclassDecision(className: string, subclass: string): boolean {
  return getSubclassDecision(className, subclass) !== null
}
