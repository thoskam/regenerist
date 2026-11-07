'use client'

import { useState } from 'react'
import { isDiceExpression, rollDice } from '@/lib/sheet/dice'
import type { SheetApi } from './useSheet'
import { cx } from './ui'

const tagClass = (tag?: string) =>
  tag === 'NAT 20' || tag === 'CRIT' ? 'text-good' : tag === 'NAT 1' ? 'text-bad' : tag === 'HEALING' ? 'text-good' : 'text-muted'

export function RollTray({ api }: { api: SheetApi }) {
  const { log, setLog, critKey } = api
  const [expanded, setExpanded] = useState(false)
  const [expr, setExpr] = useState('')
  const okExpr = isDiceExpression(expr)
  const rollCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!okExpr) return
    const r = rollDice(expr)
    api.push({ label: expr.replace(/\s+/g, ''), total: r.total, detail: r.text, tag: 'ROLL' })
    setExpr('')
  }
  const last = log[0]
  return (
    <aside aria-label="Roll log" className="pointer-events-none fixed bottom-3 right-3 z-20 flex w-[min(340px,calc(100vw-24px))] flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      {!last && !expanded && (
        <button type="button" onClick={() => setExpanded(true)} aria-label="Open dice roller" className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-accent bg-panel text-accent shadow-tray sm:hidden">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M12 2l8.66 5v10L12 22l-8.66-5V7z" /><path d="M12 2v20M3.34 7L20.66 17M20.66 7L3.34 17" opacity=".5" /></svg>
        </button>
      )}
      <div className={cx('pointer-events-auto w-full flex-col gap-2 rounded-2xl border border-accent bg-panel px-4 py-3.5 shadow-tray', !last && !expanded ? 'hidden sm:flex' : 'flex')}>
        {expanded && <button type="button" onClick={() => setExpanded(false)} className="self-end text-xs text-muted underline sm:hidden">Collapse</button>}
        <div aria-live="polite" aria-atomic="true">
          {last ? (
            <div key={last.id} className="pop flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold">{last.label}</span>
                {last.tag && <span className={cx('text-[11px] font-bold tracking-[0.08em]', tagClass(last.tag))}>{last.tag}</span>}
              </div>
              {last.tag === 'REST' || last.tag === 'CAST' ? (
                <span className="text-xs text-muted">{last.detail}</span>
              ) : (
                <div className="flex items-baseline gap-3">
                  <span className="text-[40px] font-bold leading-none text-accent">{last.total}</span>
                  <span className="text-xs text-muted">{last.detail}</span>
                </div>
              )}
            </div>
          ) : (
            <span className="hidden text-[13px] text-muted sm:inline">Click any score, save, skill, hit, or damage to roll. A natural 20 on an attack doubles that weapon’s next damage dice.</span>
          )}
        </div>
        {log.length > 1 && !expanded && <button type="button" onClick={() => setExpanded(true)} className="text-left text-xs text-accent underline sm:hidden">Show {Math.min(19, log.length - 1)} earlier rolls</button>}
        <form onSubmit={rollCustom} className={cx('gap-1.5', expanded ? 'flex' : 'hidden sm:flex')}>
          <label htmlFor="dice-expr" className="sr-only">Dice to roll</label>
          <input id="dice-expr" value={expr} onChange={e => setExpr(e.target.value.slice(0, 40))} placeholder="Roll dice, e.g. 2d6+3"
            className="min-h-[34px] min-w-0 flex-1 rounded-lg border border-line bg-raised px-2.5 text-[13px] text-ink placeholder:text-muted" />
          <button type="submit" disabled={!okExpr} className="min-h-[34px] rounded-lg bg-accent px-3 text-xs font-semibold text-on-accent disabled:opacity-40">Roll</button>
        </form>
        {critKey && <div className="text-xs font-semibold text-good">Critical hit — next damage roll doubles its dice.</div>}
        {log.length > 1 && (
          <div className={cx('flex-col gap-0.5 border-t border-line pt-1.5', expanded ? 'flex' : 'hidden sm:flex')}>
            {log.slice(1, expanded ? 20 : 4).map(r => (
              <div key={r.id} className="flex justify-between gap-2 text-xs text-muted">
                <span className="truncate">{r.label}</span>
                {r.tag !== 'REST' && r.tag !== 'CAST' && <strong className={cx('text-ink', (r.tag === 'NAT 20' || r.tag === 'CRIT') && 'text-good', r.tag === 'NAT 1' && 'text-bad')}>{r.total}</strong>}
              </div>
            ))}
            <div className="mt-1 flex gap-3 text-xs">
              {log.length > 4 && <button type="button" className="text-accent underline" onClick={() => setExpanded(e => !e)}>{expanded ? 'Show less' : 'Show more'}</button>}
              <button type="button" className="text-muted underline" onClick={() => setLog([])}>Clear</button>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
