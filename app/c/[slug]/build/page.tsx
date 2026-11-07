import Link from 'next/link'
import { notFound } from 'next/navigation'
import BuilderApp from '@/components/builder/BuilderApp'
import { getSheet } from '@/lib/sheet/store'
import { canAccessCharacter } from '@/lib/auth'
import { requirePageViewer } from '@/lib/pageAuth'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ levelup?: string }> }

export default async function EditBuildPage({ params, searchParams }: Props) {
  const { slug } = await params
  const viewer = await requirePageViewer(`/c/${slug}/build`)
  const sheet = await getSheet(slug)
  if (!sheet || !(await canAccessCharacter(viewer, sheet, 'write'))) notFound()
  if (!sheet.doc.build) {
    return (
      <main className="v2 flex min-h-screen items-center justify-center p-6 font-ui" data-theme={sheet.doc.theme?.name ?? 'ember'}>
        <div className="flex max-w-md flex-col gap-3 rounded-2xl border border-line bg-panel p-6">
          <h1 className="m-0 font-display text-2xl font-semibold">Edit on D&amp;D Beyond</h1>
          <p className="m-0 text-muted">{sheet.doc.name} was imported from D&amp;D Beyond. Level up there, then use “Re-sync from D&amp;D Beyond” in the sheet menu. Your HP, used resources, and inventory edits here are kept.</p>
          <Link href={`/c/${slug}`} className="self-start rounded-xl bg-accent px-4 py-2.5 font-semibold text-on-accent">Back to sheet</Link>
        </div>
      </main>
    )
  }
  const { levelup } = await searchParams
  return <BuilderApp initial={sheet.doc.build} slug={slug} levelUp={levelup === '1'} />
}
