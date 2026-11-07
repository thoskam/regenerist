const test = require('node:test')
const assert = require('node:assert/strict')
const { calculateWeaponAttack, getWeapon, getAttacksPerAction, isWeaponProficient, rollAttack, rollDamage } = require('../lib/combat')
const stats = { str: 12, dex: 18, con: 14, int: 10, wis: 14, cha: 8 }
const attack = (weapon, state = {}, className = 'Fighter', level = 5) => calculateWeaponAttack({ stats, level, className, weapon: getWeapon(weapon), state, proficiencies: ['simple', 'martial'] })

test('finesse and ranged attacks use best permitted ability, thrown melee keeps strength', () => {
  assert.equal(attack('Rapier').attackBonus, 7)
  assert.equal(attack('Longbow').attackBonus, 7)
  assert.equal(attack('Javelin').attackBonus, 4)
  assert.equal(attack('Dagger').ability, 'dex')
})
test('proficiency affects attacks only; magic weapon bonuses affect attack and damage', () => {
  const result = attack('Longsword', { weaponBonus: 2, weaponProficient: false })
  assert.equal(result.attackBonus, 3)
  assert.equal(result.damageBonus, 3)
  assert.equal(isWeaponProficient(getWeapon('Dagger'), ['daggers']), true)
  assert.equal(isWeaponProficient(getWeapon('Longsword'), ['simple']), false)
})
test('versatile changes damage dice and loading limits weapons without losing class attack count', () => {
  assert.equal(attack('Longsword', { weaponTwoHanded: true }).damageDice, '1d10')
  const crossbow = attack('Light Crossbow', {}, 'Fighter', 11)
  assert.equal(crossbow.attacks, 3)
  assert.equal(crossbow.weaponAttacks, 1)
  assert.equal(getAttacksPerAction('Fighter', 20), 4)
  assert.equal(getAttacksPerAction('Rogue', 20), 1)
  assert.equal(getAttacksPerAction('Bard', 6, ['Extra Attack']), 2)
})
test('Monk martial arts scales with level and is disabled by armor or shield', () => {
  assert.equal(attack('Unarmed strike', {}, 'Monk', 11).damageDice, '1d8')
  assert.equal(attack('Quarterstaff', {}, 'Monk', 5).ability, 'dex')
  assert.equal(attack('Unarmed strike', { shield: true }, 'Monk', 11).damageDice, '1')
  assert.equal(attack('Unarmed strike', { armor: 'leather' }, 'Monk', 11).ability, 'str')
})
test('advantage selects high natural roll and critical damage doubles dice, never modifiers', () => {
  const dice = [2, 20]
  const result = rollAttack(7, 'advantage', () => dice.shift())
  assert.equal(result.total, 27)
  assert.equal(result.critical, true)
  assert.deepEqual(rollDamage('2d6', 3, true, () => 4), { rolls: [4, 4, 4, 4], total: 19 })
  assert.equal(rollDamage('1', 1, true).total, 2)
  assert.equal(rollDamage('1d4', -5, false, () => 1).total, 0)
})
