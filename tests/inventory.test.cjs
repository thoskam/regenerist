const test = require('node:test')
const assert = require('node:assert/strict')
const fixture = require('./fixtures/ddb-flynnwrath.json')
const { convertDdbCharacter } = require('../lib/import/ddb')
const { computeSheet } = require('../lib/sheet/compute')
const { applyDocOp, validateItem, DocOpError } = require('../lib/sheet/docOps')
const { catalogToItem, searchCatalog } = require('../lib/catalog/items')

const { doc, state } = convertDdbCharacter(fixture.data)
const leather = doc.inventory.find(i => i.name === 'Leather, +3')

test('unequipping armor changes AC; equipping again restores it', () => {
  const off = applyDocOp(doc, { op: 'item.update', id: leather.id, equipped: false })
  assert.equal(computeSheet(off, state).ac.value, 15) // 10 + DEX 5
  assert.equal(computeSheet(applyDocOp(off, { op: 'item.update', id: leather.id, equipped: true }), state).ac.value, 19)
})

test('attunement, quantity, containers, and removal are validated', () => {
  const potion = doc.inventory.find(i => i.name === 'Potion of Healing')
  assert.throws(() => applyDocOp(doc, { op: 'item.update', id: potion.id, attuned: true }), DocOpError)
  assert.equal(applyDocOp(doc, { op: 'item.update', id: potion.id, quantity: 3 }).inventory.find(i => i.id === potion.id).quantity, 3)
  const bag = doc.inventory.find(i => i.name === 'Bag of Holding')
  assert.throws(() => applyDocOp(doc, { op: 'item.update', id: bag.id, containerId: bag.id }), DocOpError)
  const removed = applyDocOp(doc, { op: 'item.remove', id: bag.id })
  assert.ok(removed.inventory.filter(i => i.containerId === bag.id).length === 0)
  assert.ok(removed.inventory.some(i => i.id === potion.id && i.containerId === null))
})

test('currency adjustments cannot go negative', () => {
  assert.equal(applyDocOp(doc, { op: 'currency.adjust', delta: { gp: -320 } }).currency.gp, 16000)
  assert.throws(() => applyDocOp(doc, { op: 'currency.adjust', delta: { ep: -1 } }), DocOpError)
})

test('weapon customization changes attack numbers', () => {
  const rapier = doc.inventory.find(i => i.name === 'Rapier, +3')
  const next = applyDocOp(doc, { op: 'item.update', id: rapier.id, custom: { hitBonus: 1, damageBonus: 2 } })
  const row = computeSheet(next, state).attacks.find(a => a.itemId === rapier.id)
  assert.equal(row.toHit, 14); assert.equal(row.damage, '1d8+10')
  assert.equal(row.name, "Occam's Rapier")
})

test('catalog items carry their mechanics', () => {
  assert.ok(searchCatalog('longsw').some(i => i.name === 'Longsword'))
  const cloak = catalogToItem('Cloak of Protection|DMG', { id: 'cloak1' })
  assert.deepEqual(cloak.effects.map(e => `${e.type} ${e.subType} ${e.value}`), ['bonus armor-class 1', 'bonus saving-throws 1'])
  let d = applyDocOp(doc, { op: 'item.insert', item: { ...cloak, equipped: true } })
  assert.equal(computeSheet(d, state).ac.value, 19) // not attuned yet
  d = applyDocOp(d, { op: 'item.update', id: 'cloak1', attuned: true })
  const s = computeSheet(d, state)
  assert.equal(s.ac.value, 20); assert.equal(s.abilities.str.save, 3); assert.equal(s.inventory.attuned, 3)
  const sword = catalogToItem('Longsword|PHB', { id: 'ls1', magicBonus: 2, edition: '2024' })
  assert.equal(sword.name, 'Longsword, +2'); assert.equal(sword.magicBonus, 2); assert.equal(sword.weapon.mastery, 'Sap')
  assert.ok(sword.weapon.properties.includes('Versatile (1d10)'))
  const ogre = catalogToItem('Gauntlets of Ogre Power|DMG', { id: 'g1' })
  d = applyDocOp(doc, { op: 'item.insert', item: { ...ogre, equipped: true } })
  d = applyDocOp(d, { op: 'item.update', id: 'g1', attuned: true })
  assert.equal(computeSheet(d, state).abilities.str.score, 19)
})

test('homebrew items are sanitized', () => {
  const it = validateItem({ id: 'hb1', name: '<b>Sword</b>', description: '<img src=x onerror=alert(1)><p>ok</p>', weapon: { damage: '2d6+1', category: 'martial' }, effects: [{ type: 'eval', subType: 'x' }, { type: 'bonus', subType: 'armor-class', value: 1 }] })
  assert.equal(it.description, '<p>ok</p>')
  assert.equal(it.effects.length, 1)
  assert.throws(() => validateItem({ id: 'hb2', name: 'x', weapon: { damage: 'alert(1)' } }), DocOpError)
})
