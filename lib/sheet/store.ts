// Server-side persistence for v2 character sheets.
import { Prisma } from '@prisma/client'
import { prisma } from '../prisma'
import { convertDdbCharacter, fetchDdbCharacter, parseDdbCharacterId } from '../import/ddb'
import { computeSheet } from './compute'
import { normalizeState } from './state'
import type { CharacterDoc, PlayState, ThemeName } from './types'

export class StoreError extends Error {
  constructor(message: string, public status: number, public extra?: Record<string, unknown>) { super(message) }
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024

export function sniffImage(bytes: Uint8Array): string | null {
  const b = bytes
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.length > 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif'
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return 'image/webp'
  return null
}

export function validateAvatar(bytes: Uint8Array): string {
  if (!bytes.length) throw new StoreError('The image is empty.', 400)
  if (bytes.length > MAX_AVATAR_BYTES) throw new StoreError('Portraits must be 2 MB or smaller.', 413)
  const type = sniffImage(bytes)
  if (!type) throw new StoreError('Use a PNG, JPEG, GIF, or WebP image.', 415)
  return type
}

const slugify = (name: string) => name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'character'

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name)
  for (let i = 0; i < 1000; i++) {
    const slug = i ? `${base}-${i + 1}` : base
    if (!(await prisma.playerCharacter.findUnique({ where: { slug }, select: { id: true } }))) return slug
  }
  throw new StoreError('Could not create a unique link for this character.', 500)
}

async function downloadDdbAvatar(url: string | null): Promise<{ bytes: Buffer; type: string } | null> {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' || u.hostname !== 'www.dndbeyond.com' || !u.pathname.startsWith('/avatars/')) return null
    u.search = '?width=300&height=300&fit=crop&quality=90'
    const res = await fetch(u, { cache: 'no-store', redirect: 'error' })
    if (!res.ok) return null
    const bytes = Buffer.from(await res.arrayBuffer())
    if (bytes.length > MAX_AVATAR_BYTES) return null
    const type = sniffImage(bytes)
    return type ? { bytes, type } : null
  } catch {
    return null
  }
}

export interface SheetSummary {
  slug: string
  name: string
  classLabel: string
  species: string
  level: number
  theme: ThemeName
  hasAvatar: boolean
  hp: { current: number; max: number }
  updatedAt: string
  importedFrom: string | null
}

export async function listSheets(): Promise<SheetSummary[]> {
  const rows = await prisma.playerCharacter.findMany({
    orderBy: { updatedAt: 'desc' },
    select: { slug: true, name: true, doc: true, state: true, avatarType: true, updatedAt: true },
  })
  return rows.map(r => {
    const doc = r.doc as unknown as CharacterDoc
    const sheet = computeSheet(doc, normalizeState(r.state))
    return {
      slug: r.slug, name: r.name, classLabel: sheet.classLabel, species: doc.identity.species, level: sheet.level,
      theme: doc.theme?.name ?? 'ember', hasAvatar: !!r.avatarType, hp: { current: sheet.hp.current, max: sheet.hp.max },
      updatedAt: r.updatedAt.toISOString(), importedFrom: doc.import?.source ?? null,
    }
  })
}

export interface StoredSheet { slug: string; doc: CharacterDoc; state: PlayState; revision: number; hasAvatar: boolean; updatedAt: string }

export async function getSheet(slug: string): Promise<StoredSheet | null> {
  const r = await prisma.playerCharacter.findUnique({ where: { slug }, select: { slug: true, doc: true, state: true, revision: true, avatarType: true, updatedAt: true } })
  if (!r) return null
  return { slug: r.slug, doc: r.doc as unknown as CharacterDoc, state: normalizeState(r.state), revision: r.revision, hasAvatar: !!r.avatarType, updatedAt: r.updatedAt.toISOString() }
}

/** Import (or re-sync) a public D&D Beyond character. Re-syncing replaces the build but keeps table state. */
export async function importFromDdb(input: string): Promise<{ slug: string; created: boolean }> {
  const id = parseDdbCharacterId(input)
  if (!id) throw new StoreError('Paste a D&D Beyond character link, like https://www.dndbeyond.com/characters/12345678.', 400)
  let raw: unknown
  try { raw = await fetchDdbCharacter(id) } catch (e) { throw new StoreError((e as Error).message, 502) }
  const { doc, state, avatarUrl } = convertDdbCharacter(raw)
  const avatar = await downloadDdbAvatar(avatarUrl)
  const existing = await prisma.playerCharacter.findUnique({ where: { ddbId: id }, select: { slug: true, doc: true, avatarType: true } })
  if (existing) {
    const prev = existing.doc as unknown as CharacterDoc
    doc.theme = prev.theme ?? doc.theme
    await prisma.playerCharacter.update({
      where: { ddbId: id },
      data: {
        name: doc.name, doc: doc as unknown as Prisma.InputJsonValue,
        // Keep a portrait the user uploaded; otherwise take the current D&D Beyond one.
        ...(avatar && !existing.avatarType ? { avatar: avatar.bytes, avatarType: avatar.type } : {}),
      },
    })
    return { slug: existing.slug, created: false }
  }
  const slug = await uniqueSlug(doc.name)
  await prisma.playerCharacter.create({
    data: {
      slug, name: doc.name, ddbId: id, doc: doc as unknown as Prisma.InputJsonValue, state: state as unknown as Prisma.InputJsonValue,
      ...(avatar ? { avatar: avatar.bytes, avatarType: avatar.type } : {}),
    },
  })
  return { slug, created: true }
}

const THEMES: ThemeName[] = ['ember', 'arcane', 'parchment']

export interface SheetPatch {
  revision?: number
  state?: unknown
  theme?: { name?: unknown; accent?: unknown }
  notes?: unknown
}

const NOTE_KEYS = ['personality', 'ideals', 'bonds', 'flaws', 'appearance', 'backstory', 'allies', 'organizations', 'enemies', 'possessions', 'holdings', 'other'] as const

export async function updateSheet(slug: string, patch: SheetPatch): Promise<{ revision: number; state: PlayState; doc: CharacterDoc }> {
  return prisma.$transaction(async tx => {
    const row = await tx.playerCharacter.findUnique({ where: { slug }, select: { id: true, doc: true, state: true, revision: true } })
    if (!row) throw new StoreError('Character not found.', 404)
    // `revision` versions table state only, so theme/notes edits never conflict with HP updates.
    if (patch.state !== undefined && typeof patch.revision === 'number' && patch.revision !== row.revision) {
      throw new StoreError('This character changed somewhere else. Reload to get the latest.', 409, { revision: row.revision })
    }
    const doc = row.doc as unknown as CharacterDoc
    let docChanged = false
    if (patch.theme) {
      const name = THEMES.includes(patch.theme.name as ThemeName) ? (patch.theme.name as ThemeName) : doc.theme?.name ?? 'ember'
      const accent = typeof patch.theme.accent === 'string' && /^#[0-9a-f]{6}$/i.test(patch.theme.accent) ? patch.theme.accent : null
      doc.theme = { name, accent }
      docChanged = true
    }
    if (patch.notes && typeof patch.notes === 'object') {
      const input = patch.notes as Record<string, unknown>
      const notes: CharacterDoc['notes'] = {}
      for (const k of NOTE_KEYS) {
        const v = input[k]
        if (typeof v === 'string' && v.trim()) notes[k] = v.slice(0, 20000)
      }
      doc.notes = notes
      docChanged = true
    }
    const state = patch.state !== undefined ? normalizeState(patch.state) : normalizeState(row.state)
    // Conditional write: a concurrent state save with the same revision loses instead of overwriting.
    const written = await tx.playerCharacter.updateMany({
      where: { id: row.id, revision: row.revision },
      data: {
        ...(patch.state !== undefined ? { revision: { increment: 1 }, state: state as unknown as Prisma.InputJsonValue } : {}),
        ...(docChanged ? { doc: doc as unknown as Prisma.InputJsonValue } : {}),
      },
    })
    if (!written.count) throw new StoreError('This character changed somewhere else. Reload to get the latest.', 409)
    const updated = { revision: patch.state !== undefined ? row.revision + 1 : row.revision }
    return { revision: updated.revision, state, doc }
  })
}

export async function deleteSheet(slug: string): Promise<void> {
  const r = await prisma.playerCharacter.deleteMany({ where: { slug } })
  if (!r.count) throw new StoreError('Character not found.', 404)
}

export async function getAvatar(slug: string): Promise<{ bytes: Buffer; type: string; updatedAt: Date } | null> {
  const r = await prisma.playerCharacter.findUnique({ where: { slug }, select: { avatar: true, avatarType: true, updatedAt: true } })
  if (!r?.avatar || !r.avatarType) return null
  return { bytes: Buffer.from(r.avatar), type: r.avatarType, updatedAt: r.updatedAt }
}

export async function setAvatar(slug: string, bytes: Uint8Array | null): Promise<void> {
  const data = bytes ? { avatar: Buffer.from(bytes), avatarType: validateAvatar(bytes) } : { avatar: null, avatarType: null }
  const r = await prisma.playerCharacter.updateMany({ where: { slug }, data })
  if (!r.count) throw new StoreError('Character not found.', 404)
}
