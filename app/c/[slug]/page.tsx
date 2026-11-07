import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SheetApp from '@/components/sheet/SheetApp'
import { getSheet } from '@/lib/sheet/store'
import { canAccessCharacter } from '@/lib/auth'
import { listCampaigns } from '@/lib/campaigns'
import { requirePageViewer } from '@/lib/pageAuth'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Character — Regenerist' }
}

export default async function SheetPage({ params }: Props) {
  const { slug } = await params
  const viewer = await requirePageViewer(`/c/${slug}`)
  const sheet = await getSheet(slug)
  if (!sheet || !(await canAccessCharacter(viewer, sheet, 'read'))) notFound()
  const canEdit = await canAccessCharacter(viewer, sheet, 'write')
  const campaigns = canEdit ? (await listCampaigns(viewer)).map(c => ({ id: c.id, name: c.name })) : []
  return <SheetApp slug={slug} readOnly={!canEdit} campaigns={campaigns} initial={{ doc: sheet.doc, state: sheet.state, revision: sheet.revision, hasAvatar: sheet.hasAvatar, campaignId: sheet.campaignId }} />
}
