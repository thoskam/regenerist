// Accounts and sessions. The app stays in open single-user mode until the first account exists;
// after that every page and API requires a signed-in user.

import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { cookies, headers } from 'next/headers'
import { prisma } from './prisma'

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>
export const SESSION_COOKIE = 'rg_session'
const SESSION_DAYS = 30

export interface Viewer { authEnabled: boolean; user: { id: string; username: string; displayName: string; isAdmin: boolean } | null }

export class AuthError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, saltB64, keyB64] = stored.split('$')
  if (alg !== 'scrypt' || !saltB64 || !keyB64) return false
  const expected = Buffer.from(keyB64, 'base64')
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

const tokenHash = (t: string) => createHash('sha256').update(t).digest('hex')

let usersExistCache: { value: boolean; at: number } | null = null
export async function authEnabled(): Promise<boolean> {
  if (usersExistCache?.value) return true // once on, it stays on
  if (usersExistCache && Date.now() - usersExistCache.at < 5000) return usersExistCache.value
  const value = (await prisma.user.count()) > 0
  usersExistCache = { value, at: Date.now() }
  return value
}

export function validatePassword(password: unknown): string {
  const p = typeof password === 'string' ? password : ''
  if (p.length < 8 || p.length > 200) throw new AuthError('Passwords must be at least 8 characters.', 400)
  return p
}

export function validateCredentials(username: unknown, password: unknown): { username: string; password: string } {
  const u = typeof username === 'string' ? username.trim().toLowerCase() : ''
  if (!/^[a-z0-9_.-]{3,32}$/.test(u)) throw new AuthError('Usernames are 3–32 letters, numbers, dots, dashes, or underscores.', 400)
  return { username: u, password: validatePassword(password) }
}

async function isHttps(): Promise<boolean> {
  const h = await headers()
  return h.get('x-forwarded-proto') === 'https' || (h.get('origin') ?? '').startsWith('https://')
}

export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000)
  await prisma.session.create({ data: { id: tokenHash(token), userId, expiresAt } })
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: await isHttps(), path: '/', expires: expiresAt })
}

export async function endSession(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (token) await prisma.session.deleteMany({ where: { id: tokenHash(token) } })
  jar.delete(SESSION_COOKIE)
}

export async function getViewer(): Promise<Viewer> {
  const enabled = await authEnabled()
  if (!enabled) return { authEnabled: false, user: null }
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return { authEnabled: true, user: null }
  const session = await prisma.session.findUnique({ where: { id: tokenHash(token) } })
  if (!session || session.expiresAt < new Date()) return { authEnabled: true, user: null }
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, username: true, displayName: true, isAdmin: true } })
  return { authEnabled: true, user }
}

/** For API routes: throws 401 when sign-in is required and missing. */
export async function requireViewer(): Promise<Viewer> {
  const v = await getViewer()
  if (v.authEnabled && !v.user) throw new AuthError('Sign in to continue.', 401)
  return v
}

/**
 * Character access. Open mode: everything. Signed in: owners and admins can edit; members of the
 * character's party (and its DM) can view.
 */
export async function canAccessCharacter(v: Viewer, c: { ownerId: string | null; campaignId: string | null }, mode: 'read' | 'write'): Promise<boolean> {
  if (!v.authEnabled) return true
  if (!v.user) return false
  if (v.user.isAdmin || c.ownerId === v.user.id) return true
  if (mode === 'write' || !c.campaignId) return false
  const member = await prisma.campaignMember.findUnique({ where: { campaignId_userId: { campaignId: c.campaignId, userId: v.user.id } } })
  return !!member
}

/** Create an account. The very first account becomes admin and adopts all existing characters. */
export async function createAccount(input: { username: unknown; password: unknown; displayName?: unknown }, actor: Viewer): Promise<{ id: string }> {
  const { username, password } = validateCredentials(input.username, input.password)
  const displayName = (typeof input.displayName === 'string' && input.displayName.trim().slice(0, 40)) || username
  const first = !(await authEnabled())
  if (!first && !actor.user?.isAdmin) throw new AuthError('Only an admin can create accounts.', 403)
  if (await prisma.user.findUnique({ where: { username } })) throw new AuthError('That username is taken.', 409)
  const user = await prisma.user.create({ data: { username, displayName, passwordHash: await hashPassword(password), isAdmin: first } })
  if (first) await prisma.playerCharacter.updateMany({ where: { ownerId: null }, data: { ownerId: user.id } })
  usersExistCache = { value: true, at: Date.now() }
  return { id: user.id }
}

export async function login(usernameIn: unknown, passwordIn: unknown): Promise<void> {
  const username = typeof usernameIn === 'string' ? usernameIn.trim().toLowerCase() : ''
  const password = typeof passwordIn === 'string' ? passwordIn : ''
  const user = await prisma.user.findUnique({ where: { username } })
  // Always run a hash to keep timing similar whether or not the user exists.
  const ok = user ? await verifyPassword(password, user.passwordHash) : (await hashPassword(password), false)
  if (!user || !ok) throw new AuthError('Wrong username or password.', 401)
  await startSession(user.id)
}

/** Change your own password (needs the current one). Signs out your other devices. */
export async function changePassword(v: Viewer, currentIn: unknown, nextIn: unknown): Promise<void> {
  if (!v.user) throw new AuthError('Sign in to continue.', 401)
  const next = validatePassword(nextIn)
  const user = await prisma.user.findUnique({ where: { id: v.user.id } })
  if (!user || !(await verifyPassword(typeof currentIn === 'string' ? currentIn : '', user.passwordHash))) throw new AuthError('Your current password is wrong.', 403)
  if (await verifyPassword(next, user.passwordHash)) throw new AuthError('Choose a password different from your current one.', 400)
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } })
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  await prisma.session.deleteMany({ where: { userId: user.id, ...(token ? { id: { not: tokenHash(token) } } : {}) } })
}

/** Admins: set another account's password (e.g. a player who forgot theirs). Signs that account out everywhere. */
export async function resetPassword(v: Viewer, userIdIn: unknown, nextIn: unknown): Promise<string> {
  if (!v.user?.isAdmin) throw new AuthError('Admins only.', 403)
  const userId = typeof userIdIn === 'string' ? userIdIn : ''
  if (userId === v.user.id) throw new AuthError('Change your own password above.', 400)
  const next = validatePassword(nextIn)
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true } })
  if (!user) throw new AuthError('Account not found.', 404)
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } })
  await prisma.session.deleteMany({ where: { userId: user.id } })
  return user.username
}

export function inviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(randomBytes(8), b => alphabet[b % alphabet.length]).join('')
}
