export interface Stats {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export interface Character {
  id: number
  name: string
  slug: string
  level: number
  createdAt: Date
  updatedAt: Date
  lives?: Life[]
}

export interface Life {
  id: number
  lifeNumber: number
  name: string
  race: string
  class: string
  subclass: string
  level: number
  stats: Stats
  baseStats: Stats | null
  currentHp: number
  maxHp: number
  effect: string
  story: string
  skillProficiencies: string[]
  subclassChoice: string | null
  createdAt: Date
  isActive: boolean
  characterId: number
  character?: Character
}

export interface Quirk {
  id: number
  name: string
  description: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CharacterWithCurrentLife extends Character {
  currentLife: Life | null
  totalLives: number
}
