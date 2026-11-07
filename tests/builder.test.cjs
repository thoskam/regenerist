// Builder tests. Requires generated rules packs (npm run data:rules); skipped when missing.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const have = ['2014', '2024'].every(e => fs.existsSync(path.join(__dirname, '..', 'data', 'rules', `rules-${e}.json`)))
const opts = { skip: have ? false : 'rules packs not built (npm run data:rules)' }
const { generateDoc, validateBuild, spellAllowance, abilityScores } = require('../lib/rules/build')
const { computeSheet } = require('../lib/sheet/compute')
const { emptyPlayState } = require('../lib/sheet/types')
const pack = e => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'rules', `rules-${e}.json`), 'utf8'))

const flynn = {
  version: 1, edition: '2014', name: 'Flynnwrath (rebuilt)',
  species: { name: 'Tiefling' }, background: { name: 'Noble', languages: ['Celestial'] },
  abilities: { method: 'manual', base: { str: 14, dex: 16, con: 12, int: 13, wis: 12, cha: 13 } },
  classes: [{ name: 'Rogue', subclass: 'Swashbuckler', level: 15, skills: ['deception', 'perception', 'sleight-of-hand', 'stealth'], expertise: ['persuasion', 'sleight-of-hand', 'stealth', 'thieves-tools'] }],
  asi: [
    { className: 'Rogue', classLevel: 4, kind: 'asi', abilities: { dex: 2 } }, { className: 'Rogue', classLevel: 8, kind: 'asi', abilities: { dex: 2 } },
    { className: 'Rogue', classLevel: 10, kind: 'asi', abilities: { con: 2 } }, { className: 'Rogue', classLevel: 12, kind: 'asi', abilities: { con: 2 } },
  ],
  feats: [], spells: [], hpMode: 'average',
}

test('a 2014 build reproduces the imported D&D Beyond numbers', opts, () => {
  const p = pack('2014')
  assert.deepEqual(validateBuild(p, flynn).filter(i => i.level === 'error'), [])
  const doc = generateDoc(p, flynn)
  const s = computeSheet(doc, emptyPlayState())
  assert.deepEqual(Object.fromEntries(Object.entries(s.abilities).map(([k, v]) => [k, v.score])), { str: 14, dex: 20, con: 16, int: 14, wis: 12, cha: 15 })
  assert.deepEqual(Object.fromEntries(Object.entries(s.abilities).map(([k, v]) => [k, v.save])), { str: 2, dex: 10, con: 3, int: 7, wis: 6, cha: 2 })
  const sk = Object.fromEntries(s.skills.map(x => [x.name, x.bonus]))
  assert.equal(sk.Persuasion, 12); assert.equal(sk.Stealth, 15); assert.equal(sk.Deception, 7); assert.equal(sk.History, 7); assert.equal(sk.Perception, 6)
  assert.equal(s.hp.max, 123)
  assert.equal(s.initiative, 7) // Rakish Audacity
  assert.deepEqual(s.senses, ['Darkvision 60 ft'])
  assert.deepEqual(s.defenses.resistances, ['Fire'])
  assert.equal(s.actions.find(a => a.name === 'Sneak Attack').dice, '8d6')
  assert.ok(s.actions.some(a => a.name === 'Cunning Action' && a.activation === 'bonus'))
  assert.ok(doc.features.some(f => f.name === 'Panache') && !doc.features.some(f => f.name === 'Master Duelist'))
  assert.ok(s.rollRules.reliableTalent)
})

test('2024 wizard: background ability bonuses, origin feat, spell allowance, slots', opts, () => {
  const p = pack('2024')
  const b = {
    version: 1, edition: '2024', name: 'Test Wizard', species: { name: 'Elf', option: 'High Elf', skills: ['perception'] },
    background: { name: 'Sage', abilityBonuses: { int: 2, con: 1 } },
    abilities: { method: 'standard', base: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 } },
    classes: [{ name: 'Wizard', level: 5, skills: ['arcana', 'investigation'], expertise: [] }],
    asi: [{ className: 'Wizard', classLevel: 4, kind: 'asi', abilities: { int: 2 } }], feats: [], hpMode: 'average',
    spells: [{ className: 'Wizard', name: 'Fire Bolt' }, { className: 'Wizard', name: 'Fireball' }, { className: 'Wizard', name: 'Shield' }],
  }
  assert.deepEqual(validateBuild(p, b).filter(i => i.level === 'error'), [])
  const al = spellAllowance(p, b, b.classes[0], abilityScores(p, b))
  assert.deepEqual([al.cantrips, al.spells, al.maxLevel], [4, 9, 3])
  const doc = generateDoc(p, b)
  const s = computeSheet(doc, emptyPlayState())
  assert.equal(s.abilities.int.score, 19)
  assert.equal(s.abilities.int.save, 7) // +4 mod +3 PB
  assert.ok(doc.features.some(f => f.name === 'Magic Initiate (Wizard)'))
  assert.deepEqual(s.spellSlots.map(x => x.max), [4, 3, 2])
  const block = s.spellcasting.find(x => x.label === 'Wizard')
  assert.equal(block.dc, 15)
  assert.equal(block.spells.find(x => x.name === 'Fire Bolt').scaling.kind, 'character')
  assert.equal(s.hp.max, 6 + 4 * 4 + 5 * 2) // d6 max + 4 average levels + CON +2 each
})

test('2024 rogue gets weapon proficiency for finesse martial weapons and Slippery Mind saves', opts, () => {
  const p = pack('2024')
  const b = { version: 1, edition: '2024', name: 'R', species: { name: 'Halfling' }, background: { name: 'Criminal', abilityBonuses: { dex: 2, con: 1 } },
    abilities: { method: 'pointbuy', base: { str: 8, dex: 15, con: 14, int: 12, wis: 10, cha: 10 } },
    classes: [{ name: 'Rogue', level: 15, skills: ['acrobatics', 'insight', 'perception', 'deception'], expertise: ['stealth', 'perception'] }], asi: [], feats: [], spells: [], hpMode: 'average' }
  const s = computeSheet(generateDoc(p, b), emptyPlayState())
  assert.ok(s.abilities.wis.saveProf && s.abilities.cha.saveProf)
  assert.ok(s.proficiencies.weapons.includes('Martial Weapons (Finesse or Light)'))
  assert.ok(s.rollRules.lucky)
  assert.equal(s.initiative, 3 + 5) // DEX +3, Alert (Criminal origin feat) adds PB +5
})

test('every 2014 subclass has features and every class has a hit die and saves', opts, () => {
  const p = pack('2014')
  assert.deepEqual(p.classes.flatMap(c => c.subclasses.filter(s => !s.features.length).map(s => `${c.name}: ${s.name}`)), [])
  for (const c of [...p.classes, ...pack('2024').classes]) { assert.ok(c.hitDie >= 6, c.name); assert.equal(c.saves.length, 2, c.name) }
})

test('Regenerist random builds are always valid in both editions', opts, () => {
  const { randomBuild, driftLevel } = require('../lib/rules/random')
  let seed = 7
  const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
  for (const ed of ['2014', '2024']) {
    const p = pack(ed)
    for (let i = 0; i < 60; i++) {
      const level = 1 + (i % 20)
      const b = randomBuild(p, { name: 'Soul', level, rng })
      const errors = validateBuild(p, b).filter(x => x.level === 'error')
      assert.deepEqual(errors, [], `${ed} ${b.classes[0].name} ${level}`)
      const s = computeSheet(generateDoc(p, b), emptyPlayState())
      assert.ok(s.hp.max > 0 && s.level === level)
    }
  }
  for (let i = 0; i < 50; i++) { const l = driftLevel(1, rng); assert.ok(l >= 1 && l <= 3) }
})
