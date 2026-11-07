const test = require('node:test')
const assert = require('node:assert/strict')
const fixture = require('./fixtures/ddb-flynnwrath.json')
const { convertDdbCharacter } = require('../lib/import/ddb')
const { applyDamage, applyHealing, setTempHp, longRest, shortRest, normalizeState } = require('../lib/sheet/state')
const { rollDice, rollD20, isDiceExpression } = require('../lib/sheet/dice')

const { doc, state } = convertDdbCharacter(fixture.data)
const seq = (...xs) => () => xs.shift()

test('damage spends temp HP first, never drops below 0, and failing at 0 HP costs a death save', () => {
  let s = setTempHp(state, 10)
  s = applyDamage(doc, s, 15)
  assert.equal(s.tempHp, 0); assert.equal(s.hpRemoved, 5)
  s = applyDamage(doc, s, 500)
  assert.equal(s.hpRemoved, 123)
  s = applyDamage(doc, s, 3)
  assert.equal(s.deathSaves.fail, 1)
  s = applyHealing(s, 10)
  assert.equal(s.hpRemoved, 113); assert.deepEqual(s.deathSaves, { success: 0, fail: 0 })
})

test('rests restore the right resources', () => {
  const rebuke = doc.spellSources.flatMap(x => x.spells).find(x => x.name === 'Hellish Rebuke').uses.key
  const javelin = doc.inventory.find(i => i.name === 'Javelin of Lightning').uses.key
  let s = { ...state, hpRemoved: 40, tempHp: 5, used: { [rebuke]: 1, [javelin]: 1 }, hitDiceUsed: { 8: 12 }, exhaustion: 2 }
  const sr = shortRest(doc, s)
  assert.equal(sr.used[rebuke], 1)
  const lr = longRest(doc, s)
  assert.equal(lr.hpRemoved, 0); assert.equal(lr.tempHp, 0)
  assert.deepEqual(lr.used, {})
  assert.deepEqual(lr.hitDiceUsed, { 8: 5 })
  assert.equal(lr.exhaustion, 1)
})

test('untrusted state is clamped and filtered', () => {
  const s = normalizeState({ hpRemoved: -4, tempHp: 'x', conditions: ['Prone', 'Hacked', 'Prone'], slotsUsed: { 1: 2, evil: 3 }, inspiration: 'yes', used: { '__proto__': 1, ok: 2 } })
  assert.equal(s.hpRemoved, 0); assert.equal(s.tempHp, 0); assert.deepEqual(s.conditions, ['Prone'])
  assert.deepEqual(s.slotsUsed, { 1: 2 }); assert.equal(s.inspiration, false)
  assert.equal(s.used.ok, 2)
})

test('dice: modifiers, crits double dice only, advantage keeps the higher die', () => {
  assert.equal(rollDice('2d6+3', { rng: () => 0.5 }).total, 4 + 4 + 3)
  const crit = rollDice('1d8+5', { crit: true, rng: () => 0.99 })
  assert.equal(crit.total, 8 + 8 + 5)
  const adv = rollD20(7, 'advantage', { rng: seq(0.05, 0.95) })
  assert.equal(adv.natural, 20); assert.equal(adv.total, 27); assert.equal(adv.critical, true)
  const dis = rollD20(7, 'disadvantage', { rng: seq(0.05, 0.95) })
  assert.equal(dis.natural, 2); assert.equal(dis.fumble, false)
  assert.equal(isDiceExpression('1d10+8'), true); assert.equal(isDiceExpression('alert(1)'), false)
})

test('spell slot caster levels follow single-class and multiclass rules', () => {
  const { casterLevel, pactMagic } = require('../lib/sheet/compute')
  const c = (name, level, progression, edition = '2014') => ({ name, level, hitDie: 8, isStartingClass: false, edition, spellcasting: { ability: 'int', progression } })
  assert.equal(casterLevel([c('Wizard', 5, 'full')]), 5)
  assert.equal(casterLevel([c('Paladin', 1, 'half')]), 0)
  assert.equal(casterLevel([c('Paladin', 1, 'half', '2024')]), 1)
  assert.equal(casterLevel([c('Paladin', 3, 'half')]), 2)
  assert.equal(casterLevel([c('Fighter', 3, 'third')]), 1)
  assert.equal(casterLevel([c('Paladin', 3, 'half'), c('Wizard', 2, 'full')]), 3)
  assert.equal(casterLevel([c('Fighter', 7, 'third'), c('Cleric', 1, 'full')]), 3)
  assert.deepEqual(pactMagic(5), { level: 3, max: 2 })
  assert.deepEqual(pactMagic(11), { level: 5, max: 3 })
})
