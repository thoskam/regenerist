import { test, expect, Page } from '@playwright/test'

// Browser contracts intentionally mock APIs: no existing characters or AWS calls are touched.
const initialLife = {
  id: 1, characterId: 1, lifeNumber: 2, name: 'Test Incarnation', race: 'Human (Standard)',
  class: 'Wizard', subclass: 'School of Evocation', level: 5,
  stats: { str: 10, dex: 14, con: 14, int: 18, wis: 12, cha: 8 },
  baseStats: { str: 10, dex: 14, con: 14, int: 16, wis: 12, cha: 8 },
  currentHp: 32, maxHp: 32, effect: '', story: 'An old soul in a new body.',
  skillProficiencies: ['Arcana', 'History'], subclassChoice: null, isActive: true,
  spellbook: { spellNames: [], archivistNote: '' }, gameplayState: {}, createdAt: '2026-01-01T00:00:00Z',
}
const magicMissile = { name: 'Magic Missile', level: 1, school: 'Evocation', castingTime: '1 action', range: '120 feet', components: 'V, S', duration: 'Instantaneous', description: 'Three darts of magical force.' }
async function mockCharacter(page: Page, regenerist = false) {
  let life: any = structuredClone(initialLife)
  let past: any[] = [{ ...structuredClone(initialLife), id: 2, lifeNumber: 1, class: 'Fighter', isActive: false }]
  let failSave = false
  const writes: any[] = []
  const hydrationIds: string[] = []
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    if (url.pathname.endsWith('/hydrate')) {
      hydrationIds.push(url.searchParams.get('lifeId') || '')
      return route.fulfill({ json: {
        classInfo: { name: life.class, hitDie: 6, savingThrows: ['int', 'wis'], armorProficiencies: [], weaponProficiencies: ['daggers', 'quarterstaffs'], features: [] },
        subclassInfo: { name: life.subclass, features: [] }, raceInfo: null,
        spells: [magicMissile], selectedSpellbook: { spells: life.spellbook.spellNames.length ? [magicMissile] : [], archivistNote: '' },
        isSpellcaster: true, spellcastingAbility: 'int', maxSpellLevel: 3,
      } })
    }
    if (method === 'PUT') {
      const patch = route.request().postDataJSON()
      writes.push(patch)
      if (failSave) return route.fulfill({ status: 409, json: { error: 'Another edit was saved. Reload and try again.' } })
      life = { ...life, ...patch, gameplayState: { ...life.gameplayState, ...patch.gameplayState } }
      return route.fulfill({ json: life })
    }
    if (method === 'DELETE' && url.pathname.endsWith('/lives')) {
      past = []
      return route.fulfill({ json: { success: true } })
    }
    return route.fulfill({ json: { id: 1, name: 'Test Soul', slug: 'test-soul', level: life.level, isRegenerist: regenerist, lives: [life, ...past] } })
  })
  await page.goto('/character/test-soul')
  await expect(page.getByRole('heading', { name: 'Test Soul' })).toBeVisible()
  return { writes, hydrationIds, failSaves: () => { failSave = true }, life: () => life }
}

test('damage consumes temporary HP and persists the resulting HP', async ({ page }) => {
  const state = await mockCharacter(page)
  await page.getByLabel('Temporary HP amount').fill('5')
  await page.getByRole('button', { name: 'Grant', exact: true }).click()
  await expect.poll(() => state.life().gameplayState.tempHp).toBe(5)
  await page.getByLabel('Damage or healing amount').fill('8')
  await page.getByRole('button', { name: 'Damage', exact: true }).click()
  await expect.poll(() => state.life().currentHp).toBe(29)
  expect(state.life().gameplayState.tempHp).toBe(0)
})

test('an empty spellbook stays empty until an explicit selection is saved', async ({ page }) => {
  const state = await mockCharacter(page)
  await page.getByRole('button', { name: 'Spells', exact: true }).click()
  await expect(page.getByText('No spells selected. Use Edit Spells')).toBeVisible()
  await page.getByRole('button', { name: 'Edit Spells', exact: true }).click()
  await page.getByRole('button', { name: 'Add Magic Missile' }).click()
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click()
  await expect.poll(() => state.life().spellbook.spellNames).toEqual(['Magic Missile'])
  await expect(page.getByRole('button', { name: /Magic Missile Evocation/ })).toBeVisible()
})

test('story-only editing preserves stats and failed saves keep the editor open', async ({ page }) => {
  const state = await mockCharacter(page)
  await page.getByRole('button', { name: /Edit Character/ }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Story', exact: true }).click()
  await dialog.locator('textarea').fill('A changed story')
  state.failSaves()
  await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('alert')).toBeVisible()
  expect(state.writes.at(-1).story).toBe('A changed story')
  expect(state.writes.at(-1)).not.toHaveProperty('stats')
  expect(state.writes.at(-1)).not.toHaveProperty('pointBuyStats')
})

test('history clearing retains the current incarnation', async ({ page }) => {
  await mockCharacter(page, true)
  page.on('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Clear Past Lives' }).click()
  await expect(page.getByRole('heading', { name: 'Test Incarnation' })).toBeVisible()
  await expect(page.getByText('No active life.')).toHaveCount(0)
})

test('hub displays API failure instead of crashing or showing an empty collection', async ({ page }) => {
  await page.route('**/api/characters', route => route.fulfill({ status: 500, json: { error: 'Database unavailable' } }))
  await page.goto('/')
  await expect(page.getByRole('alert').filter({ hasText: 'Database unavailable' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Retry loading' })).toBeVisible()
})
