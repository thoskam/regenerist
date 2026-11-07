// Dice notation and rolling. `rng` returns [0, 1) and is injectable for tests.

export type Rng = () => number
export type RollMode = 'normal' | 'advantage' | 'disadvantage'

export interface DiceTerm { sign: 1 | -1; count: number; sides: number; rolls: number[] }
export interface DiceResult { total: number; terms: Array<DiceTerm | { sign: 1 | -1; value: number }>; text: string }

const TERM = /^(\d*)d(\d+)$/i

export function isDiceExpression(expr: string): boolean {
  const parts = expr.replace(/\s+/g, '').match(/[+-]?[^+-]+/g)
  return !!parts && parts.length <= 20 && parts.every(p => TERM.test(p.replace(/^[+-]/, '')) || /^\d+$/.test(p.replace(/^[+-]/, '')))
}

const die = (sides: number, rng: Rng) => 1 + Math.floor(rng() * sides)

/** Roll "2d6+1d4+3". `crit` doubles the number of dice, never the flat modifiers. */
export function rollDice(expr: string, opts: { crit?: boolean; rng?: Rng } = {}): DiceResult {
  const rng = opts.rng ?? Math.random
  const parts = expr.replace(/\s+/g, '').match(/[+-]?[^+-]+/g) || []
  const terms: DiceResult['terms'] = []
  let total = 0
  for (const p of parts) {
    const sign: 1 | -1 = p.startsWith('-') ? -1 : 1
    const body = p.replace(/^[+-]/, '')
    const m = TERM.exec(body)
    if (m) {
      const count = Math.min(100, (Number(m[1]) || 1) * (opts.crit ? 2 : 1))
      const sides = Math.min(1000, Number(m[2]))
      const rolls = Array.from({ length: count }, () => die(sides, rng))
      total += sign * rolls.reduce((a, b) => a + b, 0)
      terms.push({ sign, count, sides, rolls })
    } else if (/^\d+$/.test(body)) {
      total += sign * Number(body)
      terms.push({ sign, value: Number(body) })
    }
  }
  const text = terms.map((t, i) => {
    const op = i === 0 ? (t.sign < 0 ? '−' : '') : t.sign < 0 ? ' − ' : ' + '
    return op + ('rolls' in t ? `${t.count}d${t.sides} [${t.rolls.join(', ')}]` : `${t.value}`)
  }).join('')
  return { total, terms, text }
}

export interface D20Result { total: number; natural: number; dice: number[]; mode: RollMode; critical: boolean; fumble: boolean; text: string; notes: string[] }

export interface D20Options {
  rng?: Rng
  /** Natural roll needed to crit (Improved Critical: 19). */
  critRange?: number
  /** Reliable Talent: a kept roll below this counts as this. */
  minRoll?: number
  /** Halfling Lucky: reroll each natural 1 once. */
  rerollOnes?: boolean
  /** Elven Accuracy: roll three dice with advantage. */
  extraAdvantageDie?: boolean
}

export function rollD20(modifier: number, mode: RollMode = 'normal', opts: D20Options = {}): D20Result {
  const rng = opts.rng ?? Math.random
  const notes: string[] = []
  const count = mode === 'normal' ? 1 : mode === 'advantage' && opts.extraAdvantageDie ? 3 : 2
  const dice = Array.from({ length: count }, () => {
    const first = die(20, rng)
    if (first === 1 && opts.rerollOnes) { notes.push('Lucky: rerolled a 1'); return die(20, rng) }
    return first
  })
  if (count === 3) notes.push('Elven Accuracy')
  const kept = mode === 'advantage' ? Math.max(...dice) : mode === 'disadvantage' ? Math.min(...dice) : dice[0]
  let natural = kept
  if (opts.minRoll && natural < opts.minRoll) { notes.push(`Reliable Talent: ${natural} → ${opts.minRoll}`); natural = opts.minRoll }
  const critRange = opts.critRange ?? 20
  const modText = modifier === 0 ? '' : modifier > 0 ? ` + ${modifier}` : ` − ${Math.abs(modifier)}`
  return {
    total: natural + modifier, natural: kept, dice, mode, critical: kept >= critRange, fumble: kept === 1, notes,
    text: `d20 [${dice.join(', ')}]${natural !== kept ? ` → ${natural}` : ''}${modText}`,
  }
}

/** Advantage and disadvantage from any sources cancel out (PHB: one of each → neither). */
export function combineModes(mode: RollMode, advantage = false, disadvantage = false): RollMode {
  const adv = mode === 'advantage' || advantage
  const dis = mode === 'disadvantage' || disadvantage
  return adv && dis ? 'normal' : adv ? 'advantage' : dis ? 'disadvantage' : 'normal'
}
