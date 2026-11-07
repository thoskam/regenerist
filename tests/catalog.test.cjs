const test = require('node:test')
const assert = require('node:assert/strict')
const { SUPPORTED_CLASS_COMBINATIONS, UNSUPPORTED_CLASS_COMBINATIONS, isClassSupported, getClassSupportIssue } = require('../lib/catalog')
const { randomClass, randomFromArray } = require('../lib/randomizer')
const { getSubclass } = require('../lib/dndApi')

test('every automatically generated class has matching local subclass data', async () => {
  assert.equal(Object.keys(UNSUPPORTED_CLASS_COMBINATIONS).length, 10)
  assert.equal(SUPPORTED_CLASS_COMBINATIONS.length, 119)
  for (const combo of SUPPORTED_CLASS_COMBINATIONS) {
    const [className, subclass] = combo.split(': ')
    assert.ok(await getSubclass(className, subclass), combo)
  }
  assert.equal(isClassSupported('Blood Hunter', 'Order of the Profane Soul'), false)
  assert.match(getClassSupportIssue('Bard', 'College of Dance'), /2024/)
})

test('regeneration exclusions and exhausted-history fallback both retain data support', () => {
  const subclasses = SUPPORTED_CLASS_COMBINATIONS.map(combo => combo.split(': ')[1])
  const remaining = 'Champion'
  for (let i = 0; i < 40; i++) {
    const choice = randomClass(subclasses.filter(name => name !== remaining))
    assert.deepEqual(choice, {className: 'Fighter', subclass: remaining})
    const fallback = randomClass(subclasses)
    assert.ok(isClassSupported(fallback.className, fallback.subclass))
  }
  assert.throws(() => randomFromArray([]), /empty/)
})
