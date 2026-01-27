export interface Life {
  id: number
  lifeNumber: number
  name: string
  race: string
  class: string
  subclass: string
  level: number
  stats: {
    str: number
    dex: number
    con: number
    int: number
    wis: number
    cha: number
  }
  currentHp: number
  maxHp: number
  effect: string
  story: string
  createdAt: Date
  isActive: boolean
}
