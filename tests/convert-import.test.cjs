// Converting an imported D&D Beyond character into a builder character must keep the sheet identical.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const file = path.join(__dirname, '..', 'data', 'rules', 'rules-2014.json')
const opts = { skip: fs.existsSync(file) ? false : 'rules packs not built (npm run data:rules)' }
const fixture = require('./fixtures/ddb-flynnwrath.json')
const { convertDdbCharacter } = require('../lib/import/ddb')
const { importToBuild, keptFromImport } = require('../lib/rules/fromImport')
const { generateDoc, normalizeBuild, validateBuild, filterKept, keptIds } = require('../lib/rules/build')
const { computeSheet } = require('../lib/sheet/compute')

test('Flynnwrath converts to a build with the same sheet', opts, () => {
  const pack = JSON.parse(fs.readFileSync(file, 'utf8'))
  const { doc, state } = convertDdbCharacter(fixture.data)
  const { build, report } = importToBuild(pack, doc)
  assert.deepEqual(report.differences, [])
  assert.deepEqual(validateBuild(pack, build).filter(i => i.level === 'error'), [])
  assert.deepEqual(build.asi.map(a => [a.classLevel, a.abilities]), [[4, { dex: 2 }], [8, { dex: 2 }], [10, { con: 2 }], [12, { con: 2 }]])

  // Round trip as the server does it: untrusted JSON in, kept content from the server copy.
  const wire = JSON.parse(JSON.stringify(build))
  const saved = normalizeBuild(wire)
  saved.kept = filterKept(keptFromImport(doc, pack), keptIds(wire))
  const next = generateDoc(pack, saved, doc)
  assert.equal(next.import, null)
  assert.ok(next.build)
  const a = computeSheet(doc, state), b = computeSheet(next, state)
  for (const k of ['abilities', 'skills', 'initiative', 'ac', 'hp', 'speeds', 'senses', 'defenses', 'passives']) assert.deepEqual(JSON.parse(JSON.stringify(b[k])), JSON.parse(JSON.stringify(a[k])), k)
  const noIds = s => JSON.parse(JSON.stringify(s.spellcasting.map(({ id, ...x }) => x)))
  assert.deepEqual(noIds(b), noIds(a))
  assert.deepEqual(b.attacks.map(x => [x.name, x.toHit, x.damage]), a.attacks.map(x => [x.name, x.toHit, x.damage]))
  assert.deepEqual(next.inventory, doc.inventory)
  assert.deepEqual(saved.classes[0].optional, ['Steady Aim'])
  assert.ok(b.actions.some(x => x.name === 'Steady Aim' && x.activation === 'bonus'))
  assert.ok(b.spellcasting.some(s => s.spells.some(x => x.name === 'Hellish Rebuke')))

  // The client can drop kept spells but cannot inject new ones.
  const tampered = { ...wire, kept: { spellSources: [{ id: 'evil', label: 'x', spells: [] }], actions: [] } }
  assert.deepEqual(filterKept(keptFromImport(doc, pack), keptIds(tampered)).spellSources, [])
})
