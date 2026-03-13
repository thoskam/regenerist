import type { Stats } from './types'

// Racial stat bonuses for all supported races.
// Sources: 5eTools races.json (base + subrace combined).
// For races with "choose" mechanics (Tasha's flex or Variant Human), we use
// the classic fixed bonuses from their non-optional sourcebook versions.
export const RACIAL_STAT_BONUSES: Record<string, Partial<Stats>> = {
  Aarakocra:          { dex: 2, wis: 1 },
  Aasimar:            { cha: 2 },
  Bugbear:            { str: 2, dex: 1 },
  Centaur:            { str: 2, wis: 1 },
  Changeling:         { cha: 2 },
  Dragonborn:         { str: 2, cha: 1 },
  'Dwarf (Hill)':     { con: 2, wis: 1 },
  'Dwarf (Mountain)': { str: 2, con: 2 },
  'Elf (Drow)':       { dex: 2, cha: 1 },
  'Elf (High)':       { dex: 2, int: 1 },
  'Elf (Wood)':       { dex: 2, wis: 1 },
  Fairy:              { dex: 1, wis: 1 },
  Firbolg:            { wis: 2, str: 1 },
  'Genasi (Air)':     { con: 2, dex: 1 },
  'Genasi (Earth)':   { con: 2, str: 1 },
  'Genasi (Fire)':    { con: 2, int: 1 },
  'Genasi (Water)':   { con: 2, wis: 1 },
  Githyanki:          { str: 2, int: 1 },
  Githzerai:          { wis: 2, int: 1 },
  'Gnome (Deep)':     { int: 2, dex: 1 },
  'Gnome (Forest)':   { int: 2, dex: 1 },
  'Gnome (Rock)':     { int: 2, con: 1 },
  Goblin:             { dex: 2, con: 1 },
  Goliath:            { str: 2, con: 1 },
  'Half-Elf':         { cha: 2, dex: 1, wis: 1 }, // +2 CHA fixed; +1 to two (default DEX/WIS)
  'Half-Orc':         { str: 2, con: 1 },
  'Halfling (Lightfoot)': { dex: 2, cha: 1 },
  'Halfling (Stout)': { dex: 2, con: 1 },
  Harengon:           { dex: 2, wis: 1 },
  Hobgoblin:          { con: 2, int: 1 },
  'Human (Standard)': { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
  'Human (Variant)':  { str: 1, dex: 1 }, // +1 to two of choice; default STR/DEX
  Kalashtar:          { wis: 2, cha: 1 },
  Kenku:              { dex: 2, wis: 1 },
  Kobold:             { dex: 2 },
  Lizardfolk:         { con: 2, wis: 1 },
  Minotaur:           { str: 2, con: 1 },
  Orc:                { str: 2, con: 1 },
  Satyr:              { cha: 2, dex: 1 },
  Shifter:            { dex: 1, wis: 1 },
  Tabaxi:             { dex: 2, cha: 1 },
  Tiefling:           { int: 1, cha: 2 },
  Tortle:             { str: 2, con: 1 },
  Triton:             { str: 1, con: 1, cha: 1 },
  Warforged:          { con: 2 },
}

export function getRacialStatBonuses(race: string): Partial<Stats> {
  return RACIAL_STAT_BONUSES[race] ?? {}
}

/** Apply racial bonuses on top of base stats, returning a new Stats object. */
export function applyRacialBonuses(baseStats: Stats, race: string): Stats {
  const bonuses = getRacialStatBonuses(race)
  return {
    str: baseStats.str + (bonuses.str ?? 0),
    dex: baseStats.dex + (bonuses.dex ?? 0),
    con: baseStats.con + (bonuses.con ?? 0),
    int: baseStats.int + (bonuses.int ?? 0),
    wis: baseStats.wis + (bonuses.wis ?? 0),
    cha: baseStats.cha + (bonuses.cha ?? 0),
  }
}
