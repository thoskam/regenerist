'use client'

import { useState } from 'react'
import type { SheetApi } from './useSheet'
import { cx } from './ui'

const tagClass = (tag?: string) =>
  tag === 'NAT 20' || tag === 'CRIT' ? 'text-good' : tag === 'NAT 1' ? 'text-bad' : tag === 'HEALING' ? 'text-good' : 'text-muted'

export function RollTray({ api }: { api: SheetApi }) {
  const { log, setLog, critKey } = api
  const [expanded, setExpanded] = useState(false)
  const last = log[0]
  return (
    <aside aria-label="Roll log" className="fixed bottom-3 right-3 z-20 w-[min(340px,calc(100vw-24px))] sm:bottom-6 sm:right-6">
      <div className={cx('flex flex-col gap-2 rounded-2xl border border-accent bg-panel px-4 py-3.5 shadow-tray', !last && 'hidden sm:flex')}>
        <div aria-live="polite" aria-atomic="true">
          {last ? (
            <div key={last.id} className="pop flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold">{last.label}</span>
                {last.tag && <span className={cx('text-[11px] font-bold tracking-[0.08em]', tagClass(last.tag))}>{last.tag}</span>}
              </div>
              {last.tag === 'REST' ? (
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
        {critKey && <div className="text-xs font-semibold text-good">Critical hit — next damage roll doubles its dice.</div>}
        {log.length > 1 && (
          <div className={cx('flex-col gap-0.5 border-t border-line pt-1.5', expanded ? 'flex' : 'hidden sm:flex')}>
            {log.slice(1, expanded ? 20 : 4).map(r => (
              <div key={r.id} className="flex justify-between gap-2 text-xs text-muted">
                <span className="truncate">{r.label}</span>
                {r.tag !== 'REST' && <strong className={cx('text-ink', (r.tag === 'NAT 20' || r.tag === 'CRIT') && 'text-good', r.tag === 'NAT 1' && 'text-bad')}>{r.total}</strong>}
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
