'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import type { Item } from '@/lib/sheet/types'

export const cx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(' ')

export function Card({ children, className, as: As = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'aside' }) {
  return <As className={cx('rounded-2xl border border-line bg-panel', className)}>{children}</As>
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('text-[11px] font-semibold uppercase tracking-[0.08em] text-muted', className)}>{children}</span>
}

export function SectionTitle({ children, accent }: { children: ReactNode; accent?: boolean }) {
  return <h2 className={cx('m-0 text-[11px] font-bold uppercase tracking-[0.1em]', accent ? 'text-accent' : 'text-muted')}>{children}</h2>
}

export function RichText({ html, className }: { html: string; className?: string }) {
  // `html` is produced by lib/sheet/sanitize.ts at import time.
  return <div className={cx('rich text-sm leading-relaxed', className)} dangerouslySetInnerHTML={{ __html: html }} />
}

export const rarityColor = (r: Item['rarity']) => ({
  common: 'var(--r-common)', uncommon: 'var(--r-uncommon)', rare: 'var(--r-rare)', 'very rare': 'var(--r-very-rare)',
  legendary: 'var(--r-legendary)', artifact: 'var(--r-artifact)', varies: 'var(--r-common)', unknown: 'var(--r-common)',
}[r])

/** One box per use; filled = available. Click an available box to spend it, a spent one to restore it. */
export function Pips({ max, used, onChange, label }: { max: number; used: number; onChange: (used: number) => void; label: string }) {
  if (max > 10) {
    return (
      <div className="flex items-center gap-1">
        <button type="button" aria-label={`Spend one use of ${label}`} onClick={() => onChange(Math.min(max, used + 1))} className="h-8 w-8 rounded-lg border border-line bg-raised font-semibold">−</button>
        <span className="min-w-[3.5rem] text-center text-sm font-semibold">{max - used} / {max}</span>
        <button type="button" aria-label={`Restore one use of ${label}`} onClick={() => onChange(Math.max(0, used - 1))} className="h-8 w-8 rounded-lg border border-line bg-raised font-semibold">+</button>
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`${label}: ${max - used} of ${max} left`}>
      {Array.from({ length: max }, (_, i) => {
        const available = i < max - used
        return (
          <button
            key={i} type="button"
            aria-label={`${label}: ${available ? 'spend' : 'restore'} use ${i + 1}`}
            onClick={() => onChange(available ? Math.min(max, used + 1) : Math.max(0, used - 1))}
            className={cx('h-6 w-6 rounded-md border-2 border-accent transition-colors', available ? 'bg-accent' : 'bg-transparent')}
          />
        )
      })}
    </div>
  )
}

export interface DetailContent { title: string; subtitle?: string; html?: string; text?: string; footer?: ReactNode }

/** Side drawer for full rules text. Uses <dialog> for focus trapping and Escape. */
export function DetailDrawer({ detail, onClose }: { detail: DetailContent | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (detail && !d.open) d.showModal()
    if (!detail && d.open) d.close()
  }, [detail])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={e => { if (e.target === ref.current) onClose() }}
      className="v2-drawer m-0 ml-auto h-full max-h-none w-full max-w-[480px] border-0 border-l border-line bg-panel p-0 text-ink backdrop:bg-black/50"
    >
      {detail && (
        <div className="flex h-full flex-col">
          <div className="flex items-start gap-3 border-b border-line p-5">
            <div className="min-w-0 flex-1">
              <h2 className="m-0 font-display text-2xl font-semibold leading-tight">{detail.title}</h2>
              {detail.subtitle && <p className="m-0 mt-1 text-sm text-muted">{detail.subtitle}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-raised">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {detail.html ? <RichText html={detail.html} /> : <p className="m-0 whitespace-pre-line text-sm">{detail.text || 'No description.'}</p>}
          </div>
          {detail.footer && <div className="border-t border-line p-4">{detail.footer}</div>}
        </div>
      )}
    </dialog>
  )
}

export function Segmented<T extends string>({ value, options, onChange, label, size = 'md' }: { value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void; label: string; size?: 'sm' | 'md' }) {
  return (
    <div role="group" aria-label={label} className="flex gap-0.5 rounded-xl border border-line bg-raised p-[3px]">
      {options.map(o => (
        <button
          key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}
          className={cx('rounded-[9px] px-3 font-semibold transition-colors', size === 'sm' ? 'min-h-[30px] text-xs' : 'min-h-[38px] text-[13px]', value === o.value ? 'bg-accent text-on-accent' : 'text-ink')}
        >{o.label}</button>
      ))}
    </div>
  )
}
