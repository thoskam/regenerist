export interface Stats {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
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
}
