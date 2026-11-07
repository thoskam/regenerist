'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { computeSheet } from '@/lib/sheet/compute'
import { rollD20, rollDice, type D20Options, type RollMode } from '@/lib/sheet/dice'
import type { CharacterDoc, PlayState, ThemeName } from '@/lib/sheet/types'
import { applyDocOp, type DocOp } from '@/lib/sheet/docOps'

export interface RollEntry {
  id: number
  label: string
  total: number
  detail: string
  tag?: 'NAT 20' | 'NAT 1' | 'ADVANTAGE' | 'DISADVANTAGE' | 'CRIT' | 'DAMAGE' | 'HEALING' | 'REST' | 'SAVE' | 'CAST' | 'ROLL'
  at: number
}

export type SaveStatus = 'saved' | 'saving' | 'error' | 'conflict'

export interface DamageRoll { label: string; dice: string; type?: string; extras?: Array<{ dice: string; type: string }>; critKey?: string; healing?: boolean }

export function useSheet(slug: string, initial: { doc: CharacterDoc; state: PlayState; revision: number }) {
  const [doc, setDoc] = useState(initial.doc)
  const [state, setStateRaw] = useState(initial.state)
  const [status, setStatus] = useState<SaveStatus>('saved')
  const [mode, setMode] = useState<RollMode>('normal')
  const [log, setLog] = useState<RollEntry[]>([])
  const [critKey, setCritKey] = useState<string | null>(null)
  const revision = useRef(initial.revision)
  const pending = useRef<PlayState | null>(null)
  const inFlight = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seq = useRef(0)

  const sheet = useMemo(() => computeSheet(doc, state), [doc, state])
  const docRef = useRef(doc)
  docRef.current = doc

  // Roll log survives reloads on this device.
  const logKey = `regenerist:rolls:${slug}`
  useEffect(() => {
    try { const raw = localStorage.getItem(logKey); if (raw) { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) { setLog(parsed.slice(0, 50)); seq.current = Math.max(0, ...parsed.map((r: RollEntry) => r.id || 0)) } } } catch { /* storage unavailable */ }
  }, [logKey])
  useEffect(() => { try { localStorage.setItem(logKey, JSON.stringify(log.slice(0, 50))) } catch { /* storage unavailable */ } }, [log, logKey])

  const flush = useCallback(async () => {
    if (inFlight.current || !pending.current) return
    const body = pending.current
    pending.current = null
    inFlight.current = true
    setStatus('saving')
    try {
      const res = await fetch(`/api/sheets/${slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: revision.current, state: body }) })
      if (res.status === 409) { setStatus('conflict'); return }
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      revision.current = data.revision
      setStatus(pending.current ? 'saving' : 'saved')
    } catch {
      pending.current = pending.current ?? body
      setStatus('error')
    } finally {
      inFlight.current = false
      if (pending.current) timer.current = setTimeout(flush, 400)
    }
  }, [slug])

  const setState = useCallback((next: PlayState | ((s: PlayState) => PlayState)) => {
    setStateRaw(prev => {
      const value = typeof next === 'function' ? (next as (s: PlayState) => PlayState)(prev) : next
      pending.current = value
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, 400)
      return value
    })
  }, [flush])

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (pending.current || inFlight.current) { e.preventDefault() } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  const push = useCallback((e: Omit<RollEntry, 'id' | 'at'>) => {
    seq.current += 1
    const entry = { ...e, id: seq.current, at: Date.now() }
    setLog(l => [entry, ...l].slice(0, 50))
  }, [])

  const rollCheck = useCallback((label: string, modifier: number, opts: { critKey?: string; forceMode?: RollMode; reliable?: boolean; ability?: string; attack?: boolean } = {}) => {
    const m = opts.forceMode ?? mode
    const rules = sheet.rollRules
    const d20: D20Options = {
      rerollOnes: rules.lucky,
      minRoll: opts.reliable && rules.reliableTalent ? 10 : undefined,
      critRange: opts.attack ? rules.critRange : 20,
      extraAdvantageDie: rules.elvenAccuracy && opts.attack && opts.ability !== 'str' && opts.ability !== 'con',
    }
    const r = rollD20(modifier, m, d20)
    push({ label, total: r.total, detail: [r.text, ...r.notes].join(' · '), tag: r.critical ? 'NAT 20' : r.fumble ? 'NAT 1' : m === 'advantage' ? 'ADVANTAGE' : m === 'disadvantage' ? 'DISADVANTAGE' : undefined })
    if (opts.critKey) setCritKey(r.critical ? opts.critKey : null)
    return r
  }, [mode, push, sheet.rollRules])

  const rollDamage = useCallback((d: DamageRoll) => {
    const crit = !!d.critKey && critKey === d.critKey
    const main = rollDice(d.dice, { crit })
    let total = main.total
    const parts = [`${main.text}${d.type ? ` ${d.type}` : ''}`]
    for (const x of d.extras ?? []) {
      const r = rollDice(x.dice, { crit })
      total += r.total
      parts.push(`${r.text} ${x.type}`)
    }
    push({ label: d.label, total: Math.max(d.healing ? 0 : 1, total), detail: parts.join(' + '), tag: d.healing ? 'HEALING' : crit ? 'CRIT' : 'DAMAGE' })
    if (crit) setCritKey(null)
  }, [critKey, push])

  const saveTheme = useCallback(async (name: ThemeName, accent: string | null) => {
    setDoc(d => ({ ...d, theme: { name, accent } }))
    const res = await fetch(`/api/sheets/${slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: { name, accent } }) })
    if (res.ok) { const data = await res.json(); revision.current = data.revision }
  }, [slug])

  const saveNotes = useCallback(async (notes: CharacterDoc['notes']) => {
    setDoc(d => ({ ...d, notes }))
    setStatus('saving')
    const res = await fetch(`/api/sheets/${slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }) })
    if (res.ok) { const data = await res.json(); revision.current = data.revision; setStatus('saved') } else setStatus('error')
  }, [slug])

  const [docError, setDocError] = useState<string | null>(null)
  /** Inventory/currency edit: applied locally first (except catalog adds), then confirmed by the server. */
  const editDoc = useCallback(async (op: DocOp | { op: 'item.add'; catalogKey: string; id: string; quantity?: number; magicBonus?: number }) => {
    setDocError(null)
    const before = docRef.current
    if (op.op !== 'item.add') {
      try { setDoc(applyDocOp(before, op as DocOp)) } catch (e) { setDocError((e as Error).message); return false }
    }
    try {
      const res = await fetch(`/api/sheets/${slug}/doc`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(op) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not save that change.')
      setDoc(data.doc)
      return true
    } catch (e) {
      if (op.op !== 'item.add') setDoc(before)
      setDocError((e as Error).message)
      return false
    }
  }, [slug])

  return { doc, setDoc, editDoc, docError, setDocError, state, setState, sheet, status, mode, setMode, log, setLog, push, rollCheck, rollDamage, critKey, saveTheme, saveNotes }
}

export type SheetApi = ReturnType<typeof useSheet>
