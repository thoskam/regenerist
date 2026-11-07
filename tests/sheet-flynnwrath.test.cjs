// Golden test: a real D&D Beyond export must produce the numbers D&D Beyond shows.
const test = require('node:test')
const assert = require('node:assert/strict')
const fixture = require('./fixtures/ddb-flynnwrath.json')
const { convertDdbCharacter, parseDdbCharacterId } = require('../lib/import/ddb')
const { computeSheet } = require('../lib/sheet/compute')

const { doc, state, avatarUrl } = convertDdbCharacter(fixture.data, new Date('2026-11-06T00:00:00Z'))
const sheet = computeSheet(doc, state)

test('parses D&D Beyond character links', () => {
  assert.equal(parseDdbCharacterId('https://www.dndbeyond.com/characters/44358311/2kLcEY'), '44358311')
  assert.equal(parseDdbCharacterId('44358311'), '44358311')
  assert.equal(parseDdbCharacterId('https://evil.example/characters/1234'), null)
})

test('identity and rules label', () => {
  assert.equal(sheet.name, 'Flynnwrath Lexington')
  assert.equal(sheet.classLabel, 'Rogue 15 (Swashbuckler)')
  assert.equal(doc.identity.species, 'Tiefling')
  assert.equal(doc.rulesLabel, '2014 class · 2024 items')
  assert.match(avatarUrl, /^https:\/\/www\.dndbeyond\.com\/avatars\//)
})

test('ability scores, modifiers, and proficiency bonus', () => {
  const s = Object.fromEntries(Object.entries(sheet.abilities).map(([k, v]) => [k, v.score]))
  assert.deepEqual(s, { str: 14, dex: 20, con: 16, int: 14, wis: 12, cha: 15 })
  assert.equal(sheet.pb, 5)
})

test('saving throws', () => {
  const s = Object.fromEntries(Object.entries(sheet.abilities).map(([k, v]) => [k, v.save]))
  assert.deepEqual(s, { str: 2, dex: 10, con: 3, int: 7, wis: 6, cha: 2 })
})

test('skills match the D&D Beyond sheet', () => {
  const s = Object.fromEntries(sheet.skills.map(x => [x.name, x.bonus]))
  assert.deepEqual(s, {
    Acrobatics: 5, 'Animal Handling': 1, Arcana: 2, Athletics: 2, Deception: 7, History: 7, Insight: 1, Intimidation: 2,
    Investigation: 2, Medicine: 1, Nature: 2, Perception: 6, Performance: 2, Persuasion: 12, Religion: 2,
    'Sleight of Hand': 15, Stealth: 15, Survival: 1,
  })
  assert.deepEqual(sheet.passives, { perception: 16, investigation: 12, insight: 11 })
})

test('vitals: AC, initiative, speed, HP', () => {
  assert.equal(sheet.ac.value, 19)
  assert.equal(sheet.initiative, 7)
  assert.equal(sheet.speeds[0].value, 30)
  assert.equal(sheet.hp.max, 123)
  assert.equal(sheet.hp.current, 123)
})

test('senses, defenses, proficiencies', () => {
  assert.deepEqual(sheet.senses, ['Darkvision 60 ft'])
  assert.deepEqual(sheet.defenses.resistances, ['Fire'])
  assert.deepEqual(sheet.proficiencies.languages, ['Celestial', 'Common', 'Infernal', 'Thieves’ Cant'])
  assert.deepEqual(sheet.proficiencies.tools, ['Playing Card Set', 'Thieves’ Tools'])
  assert.deepEqual(sheet.proficiencies.armor, ['Chain Shirt', 'Light Armor', 'Studded Leather'])
  assert.deepEqual(sheet.proficiencies.weapons, ['Crossbow, Hand', 'Halberd', 'Longbow', 'Longsword', 'Rapier', 'Scimitar', 'Shortbow', 'Shortsword', 'Simple Weapons'])
})

test('attack list matches D&D Beyond (names, hit, damage)', () => {
  const rows = sheet.attacks.map(a => [a.name, a.range, a.toHit, a.damage])
  assert.deepEqual(rows, [
    ['Cliff Claiven - Katanna', '5 ft.', 11, '1d10+8'],
    ['Dagger, +1', '20', 11, '1d4+7'],
    ['Javelin of Lightning', '30', 7, '1d6+2'],
    ['Longbow', '150', 10, '1d8+5'],
    ["Occam's Rapier", '5 ft.', 13, '1d8+8'],
    ['Sling, +1', '30', 11, '1d4+6'],
    ['Unarmed Strike', '5 ft.', 7, '3'],
  ])
  const katana = sheet.attacks[0]
  assert.deepEqual(katana.extraDamage.map(x => `${x.dice} ${x.type}`), ['3 necrotic'])
  assert.ok(katana.notes.includes('Cleave') && katana.notes.includes('Finesse') && katana.notes.includes('Light'))
  assert.ok(!katana.notes.includes('Heavy') && !katana.notes.includes('Reach'))
  const javelin = sheet.attacks[2]
  assert.deepEqual(javelin.extraDamage.map(x => `${x.dice} ${x.type}`), ['4d6 lightning'])
  assert.equal(javelin.resource.max, 1)
})

test('actions, spells, and limited uses', () => {
  const names = sheet.actions.map(a => a.name)
  for (const n of ['Sneak Attack', 'Cunning Action', 'Uncanny Dodge', 'Steady Aim', 'Panache', 'Elegant Maneuver', 'Drink Potion', 'Hellish Rebuke', 'Darkness']) assert.ok(names.includes(n), n)
  assert.equal(sheet.actions.find(a => a.name === 'Sneak Attack').dice, '8d6')
  assert.equal(sheet.actions.find(a => a.name === 'Hellish Rebuke').dice, '3d10')
  const infernal = sheet.spellcasting.find(b => b.label === 'Infernal Legacy')
  assert.equal(infernal.dc, 15)
  assert.equal(infernal.attack, 7)
  assert.deepEqual(infernal.spells.map(s => s.name).sort(), ['Darkness', 'Hellish Rebuke', 'Thaumaturgy'])
})

test('inventory summary', () => {
  assert.equal(sheet.inventory.attuned, 2)
  assert.equal(sheet.inventory.attuneMax, 3)
  assert.equal(sheet.inventory.capacity, 210)
  assert.deepEqual(doc.currency, { cp: 6535, sp: 916, ep: 0, gp: 16320, pp: 287 })
})
