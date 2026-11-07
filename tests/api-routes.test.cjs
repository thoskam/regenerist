const { test } = require('node:test')
const assert = require('node:assert/strict')
function replace(path, exports) { const id = require.resolve(path); require.cache[id] = { id, filename: id, loaded: true, exports } }
const db = { user: { count: async () => 0 } } // no accounts: open single-user mode
replace('../lib/prisma', { prisma: db })
replace('../lib/randomizer', { randomClass: () => ({ className: 'Fighter', subclass: 'Champion' }), randomRace: () => 'Human (Standard)', randomFromArray: values => values[0] })
replace('../lib/dndApi', { getRacialAbilityBonuses: async () => ({ str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }), getCasterType: () => null })
replace('@aws-sdk/client-bedrock-runtime', { BedrockRuntimeClient: class { async send() { return { body: Buffer.from(JSON.stringify({ content: [{ text: 'A new form.' }] })) } } }, InvokeModelCommand: class {} })
const lives = require('../app/api/characters/[slug]/lives/[lifeId]/route')
const regen = require('../app/api/characters/[slug]/regenerate/route')
const quirks = require('../app/api/quirks/route')
const quirk = require('../app/api/quirks/[id]/route')
const request = body => new Request('http://localhost/api', { method: 'POST', body: JSON.stringify(body) })

test('life GET and PUT scope lookup to requested character', async () => {
  let mutations = 0
  db.life = { findFirst: async args => { assert.deepEqual(args.where, { id: 3, character: { slug: 'other-soul' } }); return null }, update: async () => { mutations++ } }
  db.$transaction = async action => action(db)
  const params = { slug: 'other-soul', lifeId: '3' }
  assert.equal((await lives.GET(request({}), { params: Promise.resolve(params) })).status, 404)
  assert.equal((await lives.PUT(request({ currentHp: 1 }), { params: Promise.resolve(params) })).status, 404)
  assert.equal(mutations, 0)
  assert.equal((await lives.PUT(request({}), { params: Promise.resolve({ ...params, lifeId: '3junk' }) })).status, 400)
})

test('regeneration failure rolls back prior incarnation and level', async () => {
  const character = { id: 1, name: 'Soul', level: 20, isRegenerist: true, updatedAt: new Date(0) }
  let stored = { level: 20, isActive: true }
  db.character = { findUnique: async () => character }
  db.life = { findFirst: async () => ({ id: 2, lifeNumber: 1, race: 'Human', class: 'Fighter', subclass: 'Champion', isActive: true }) }
  db.quirk = { findMany: async () => [] }
  db.$transaction = async action => {
    const draft = { ...stored }
    await action({ character: { updateMany: async ({ data }) => { draft.level = data.level; return { count: 1 } } }, life: { findFirst: db.life.findFirst, updateMany: async () => { draft.isActive = false }, create: async () => { throw new Error('Simulated storage failure') } } })
    stored = draft
  }
  const response = await regen.POST(request({}), { params: Promise.resolve({ slug: 'soul' }) })
  assert.equal(response.status, 500)
  assert.deepEqual(stored, { level: 20, isActive: true })
})

test('concurrent regeneration conflicts before deactivating any life', async () => {
  let deactivations = 0
  db.$transaction = async action => action({ character: { updateMany: async () => ({ count: 0 }) }, life: { updateMany: async () => { deactivations++ } } })
  assert.equal((await regen.POST(request({}), { params: Promise.resolve({ slug: 'soul' }) })).status, 409)
  assert.equal(deactivations, 0)
})

test('static character cannot regenerate', async () => {
  db.character.findUnique = async () => ({ id: 1, isRegenerist: false })
  assert.equal((await regen.POST(request({}), { params: Promise.resolve({ slug: 'soul' }) })).status, 400)
})

test('quirks reject string booleans, malformed JSON and ambiguous IDs', async () => {
  assert.equal((await quirks.POST(request({ name: 'Name', description: 'Text', isActive: 'false' }))).status, 400)
  assert.equal((await quirks.POST(new Request('http://localhost/api', { method: 'POST', body: '{' }))).status, 400)
  assert.equal((await quirk.PUT(request({ isActive: 'true' }), { params: Promise.resolve({ id: '1' }) })).status, 400)
  assert.equal((await quirk.GET(request({}), { params: Promise.resolve({ id: '1junk' }) })).status, 400)
})
