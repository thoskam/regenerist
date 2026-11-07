import { notFound } from 'next/navigation'
import { AuthError } from '@/lib/auth'
import { requireMember } from '@/lib/campaigns'
import { requirePageViewer } from '@/lib/pageAuth'
import PartyView from '@/components/party/PartyView'

export const dynamic = 'force-dynamic'

export default async function PartyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const v = await requirePageViewer(`/party/${id}`)
  try { await requireMember(v, id) } catch (e) { if (e instanceof AuthError) notFound(); throw e }
  return <PartyView id={id} />
}
