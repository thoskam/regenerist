const { test } = require('node:test')
const assert = require('node:assert/strict')
const { completeRest, spendHitDie } = require('../lib/rest')
const life = { class: 'Fighter', level: 5, currentHp: 10, maxHp: 40, stats: { con: 14 } }
test('long rest restores HP and half total hit dice, preserving equipment', () => {
  const result = completeRest(life, { hitDiceUsed: 5, weapon: 'longsword', tempHp: 4, slotsUsed: { 1: 2 } }, true)
  assert.equal(result.currentHp, 40)
  assert.equal(result.gameplayState.hitDiceUsed, 3)
  assert.equal(result.gameplayState.weapon, 'longsword')
  assert.equal(result.gameplayState.tempHp, 0)
  assert.deepEqual(result.gameplayState.slotsUsed, {})
})
test('short rests reset pact slots without restoring regular slots or HP', () => {
  assert.deepEqual(completeRest(life, { slotsUsed: { 1: 2 } }, false).gameplayState.slotsUsed, { 1: 2 })
  assert.deepEqual(completeRest({ ...life, class: 'Warlock' }, { slotsUsed: { 3: 2 } }, false).gameplayState.slotsUsed, {})
  assert.equal(completeRest(life, {}, false).currentHp, undefined)
})
test('spending hit dice adds CON, caps HP, and rejects exhausted dice', () => {
  assert.equal(spendHitDie(life, {}, 6).currentHp, 18)
  assert.equal(spendHitDie({ ...life, currentHp: 39 }, {}, 6).currentHp, 40)
  assert.equal(spendHitDie(life, {}, 6).gameplayState.hitDiceUsed, 1)
  assert.throws(() => spendHitDie(life, { hitDiceUsed: 5 }, 6))
  assert.throws(() => spendHitDie(life, {}, 11))
})
test('long rest does not revive zero HP and level one regains one die', () => {
  assert.throws(() => completeRest({ ...life, currentHp: 0 }, {}, true))
  assert.equal(completeRest({ ...life, level: 1 }, { hitDiceUsed: 1 }, true).gameplayState.hitDiceUsed, 0)
})
