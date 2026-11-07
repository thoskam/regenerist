import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SheetApp from '@/components/sheet/SheetApp'
import { getSheet } from '@/lib/sheet/store'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const sheet = await getSheet((await params).slug)
  return { title: sheet ? `${sheet.doc.name} — Regenerist` : 'Character not found' }
}

export default async function SheetPage({ params }: Props) {
  const { slug } = await params
  const sheet = await getSheet(slug)
  if (!sheet) notFound()
  return <SheetApp slug={slug} initial={{ doc: sheet.doc, state: sheet.state, revision: sheet.revision, hasAvatar: sheet.hasAvatar }} />
}
