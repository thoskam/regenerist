// Loads the generated rules packs (data/rules/*.json). Server-only.
import fs from 'node:fs'
import path from 'node:path'
import type { RulesPack } from './types'

const cache = new Map<string, RulesPack>()

export function loadPack(edition: '2014' | '2024'): RulesPack {
  const hit = cache.get(edition)
  if (hit) return hit
  const file = path.join(process.cwd(), 'data', 'rules', `rules-${edition}.json`)
  if (!fs.existsSync(file)) throw new Error(`Rules pack missing: run "npm run data:rules" to create data/rules/rules-${edition}.json`)
  const pack = JSON.parse(fs.readFileSync(file, 'utf8')) as RulesPack
  cache.set(edition, pack)
  return pack
}
