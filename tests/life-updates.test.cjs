const { test } = require('node:test')
const assert = require('node:assert/strict')
const { prepareLifeUpdate, InputError } = require('../lib/lifeUpdates')
const base = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }
const life = { id: 1, characterId: 1, class: 'Fighter', subclass: 'Champion', race: 'Human (Standard)', level: 4, stats: { ...base, str: 17 }, baseStats: base, maxHp: 32, currentHp: 0, gameplayState: { tempHp: 5 } }

test('story-only edits do not recalculate stats or revive a dying character', async () => {
  assert.deepEqual(await prepareLifeUpdate(life, { story: 'Updated' }), { story: 'Updated' })
})
test('manual final scores never receive duplicate ASIs', async () => {
  const result = await prepareLifeUpdate(life, { stats: life.stats, level: 4 })
  assert.equal(result.stats.str, 17)
  assert.equal(result.currentHp, 0)
})
test('level updates reapply ASIs from base exactly once', async () => {
  const result = await prepareLifeUpdate(life, { level: 6 })
  assert.equal(result.stats.str, 19)
  assert.equal(result.currentHp, 0)
  const again = await prepareLifeUpdate({ ...life, ...result }, { level: 6 })
  assert.equal(again.stats, undefined)
})
test('ownership and activation fields cannot be mass assigned', async () => {
  for (const field of ['id', 'characterId', 'isActive', 'lifeNumber']) await assert.rejects(prepareLifeUpdate(life, { [field]: 2 }), InputError)
})
test('fractional levels, malformed stats, negative HP and invalid point buy fail', async () => {
  for (const body of [{ level: 2.5 }, { stats: { str: 20 } }, { currentHp: -1 }, { pointBuyStats: { ...base, str: 20 } }]) await assert.rejects(prepareLifeUpdate(life, body), InputError)
})
test('HP clamps and gameplay updates preserve independent resources', async () => {
  assert.equal((await prepareLifeUpdate(life, { currentHp: 999 })).currentHp, 32)
  const result = await prepareLifeUpdate(life, { gameplayState: { deathFailures: 2, shield: true } })
  assert.deepEqual(result.gameplayState, { tempHp: 5, deathFailures: 2, shield: true })
})
test('class change clears spells and stale subclass selection', async () => {
  const result = await prepareLifeUpdate(life, { class: 'Wizard', subclass: 'Evocation' })
  assert.equal(result.subclassChoice, null)
  assert.equal(result.skillProficiencies.length, 2)
})

test('spell selection enforces class quotas without charging domain grants', async () => {
  const cleric = {...life, class:'Cleric', subclass:'Life Domain', level:1, stats:{...base,wis:10}, baseStats:null}
  const valid = await prepareLifeUpdate(cleric, {spellbook:{spellNames:['Bless','Cure Wounds','Guiding Bolt']}})
  assert.equal(valid.spellbook.spellNames.length, 3)
  await assert.rejects(prepareLifeUpdate(cleric, {spellbook:{spellNames:['Guiding Bolt','Healing Word']}}), /at most/)
  const canonical = await prepareLifeUpdate(cleric, {spellbook:{spellNames:['guiding bolt','Guiding Bolt']}})
  assert.deepEqual(canonical.spellbook.spellNames, ['Guiding Bolt'])
})
test('Arcane Trickster mandatory Mage Hand counts in the cantrip table', async () => {
  const rogue = {...life,class:'Rogue',subclass:'Arcane Trickster',level:3}
  const update = await prepareLifeUpdate(rogue, {spellbook:{spellNames:['Mage Hand','Fire Bolt','Light']}})
  assert.equal(update.spellbook.spellNames.length,3)
  await assert.rejects(prepareLifeUpdate(rogue, {spellbook:{spellNames:['Mage Hand','Fire Bolt','Light','Message']}}), /at most/)
})
test('lowering level removes stale spell levels and excess selected cantrips', async () => {
  const wizard = {...life,class:'Wizard',subclass:'Evocation',level:5,spellbook:{spellNames:['Fireball','Fire Bolt','Light','Message','Mending']}}
  const update = await prepareLifeUpdate(wizard,{level:1})
  assert.deepEqual(update.spellbook.spellNames,['Fire Bolt','Light','Message'])
})

test('unchanged editor identity and story preserve custom max HP and spellbook', async () => {
  const custom = { ...life, maxHp: 99, spellbook: { spellNames: ['Unchanged custom spell'], archivistNote: '' } }
  const result = await prepareLifeUpdate(custom, { race: custom.race, class: custom.class, subclass: custom.subclass, level: custom.level, story: 'A new story' })
  assert.equal(result.maxHp, undefined)
  assert.equal(result.currentHp, undefined)
  assert.equal(result.stats, undefined)
  assert.equal(result.spellbook, undefined)
  assert.equal(result.story, 'A new story')
})
