import Link from 'next/link'
import { notFound } from 'next/navigation'
import BuilderApp from '@/components/builder/BuilderApp'
import { getSheet } from '@/lib/sheet/store'
import { canAccessCharacter } from '@/lib/auth'
import { requirePageViewer } from '@/lib/pageAuth'
import { hideRegenerist } from '@/lib/regeneristAccess'
import { loadPack } from '@/lib/rules/pack'
import { importToBuild } from '@/lib/rules/fromImport'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ levelup?: string }> }

export default async function EditBuildPage({ params, searchParams }: Props) {
  const { slug } = await params
  const viewer = await requirePageViewer(`/c/${slug}/build`)
  const sheet = await getSheet(slug)
  if (!sheet || !(await canAccessCharacter(viewer, sheet, 'write'))) notFound()
  const { levelup } = await searchParams
  if (sheet.doc.build) return <BuilderApp initial={sheet.doc.build} slug={slug} levelUp={levelup === '1'} current={hideRegenerist(sheet.doc, viewer)} />
  if (!sheet.doc.import) notFound()
  // Imported character: convert it into builder choices for the player to review.
  let converted: ReturnType<typeof importToBuild>
  try {
    converted = importToBuild(loadPack(sheet.doc.edition), sheet.doc)
  } catch (e) {
    return (
      <main className="v2 flex min-h-screen items-center justify-center p-6 font-ui" data-theme={sheet.doc.theme?.name ?? 'ember'}>
        <div className="flex max-w-md flex-col gap-3 rounded-2xl border border-line bg-panel p-6">
          <h1 className="m-0 font-display text-2xl font-semibold">Can’t convert yet</h1>
          <p className="m-0 text-muted">{(e as Error).message}</p>
          <Link href={`/c/${slug}`} className="self-start rounded-xl bg-accent px-4 py-2.5 font-semibold text-on-accent">Back to sheet</Link>
        </div>
      </main>
    )
  }
  return <BuilderApp initial={converted.build} slug={slug} conversion={converted.report} current={hideRegenerist(sheet.doc, viewer)} />
}
