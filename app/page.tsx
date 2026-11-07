import Link from 'next/link'
import { listSheets } from '@/lib/sheet/store'
import ImportForm from '@/components/home/ImportForm'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const characters = await listSheets()
  return (
    <main className="v2 min-h-screen font-ui text-sm" data-theme="ember">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="m-0 font-display text-4xl font-semibold">Characters</h1>
            <p className="m-0 mt-1 text-muted">Your sheets, rules, and rolls in one place.</p>
          </div>
          <Link href="/regenerist" className="rounded-xl border border-line bg-panel px-4 py-2.5 text-[13px] font-semibold">Regenerist lives →</Link>
        </header>

        <ImportForm />

        {characters.length === 0 ? (
          <p className="m-0 rounded-2xl border border-dashed border-line p-8 text-center text-muted">No characters yet. Import one from D&amp;D Beyond above.</p>
        ) : (
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 p-0">
            {characters.map(c => {
              const initials = c.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
              const pct = Math.round((c.hp.current / Math.max(1, c.hp.max)) * 100)
              return (
                <li key={c.slug}>
                  <Link href={`/c/${c.slug}`} data-theme={c.theme} className="v2 flex items-center gap-4 rounded-2xl border border-line bg-panel p-4 hover:border-accent">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-accent bg-accent-soft font-display text-xl font-semibold text-accent">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {c.hasAvatar ? <img src={`/api/sheets/${c.slug}/avatar`} alt="" className="h-full w-full object-cover" /> : initials}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate font-display text-lg font-semibold">{c.name}</span>
                      <span className="truncate text-xs text-muted">{c.species} · {c.classLabel}</span>
                      <span className="flex items-center gap-2 text-xs text-muted">
                        <span className="h-1.5 w-24 overflow-hidden rounded bg-raised"><span className="block h-1.5" style={{ width: `${pct}%`, background: pct > 50 ? 'var(--good)' : pct > 25 ? 'var(--accent)' : 'var(--bad)' }} /></span>
                        {c.hp.current}/{c.hp.max} HP
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}
