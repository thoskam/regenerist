import Link from 'next/link'
import { listCampaigns } from '@/lib/campaigns'
import { requirePageViewer } from '@/lib/pageAuth'
import PartyList from '@/components/party/PartyList'

export const dynamic = 'force-dynamic'

export default async function PartiesPage() {
  const v = await requirePageViewer('/party')
  const campaigns = await listCampaigns(v)
  return (
    <main className="v2 min-h-screen font-ui text-sm" data-theme="ember">
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8">
        <Link href="/" className="text-xs text-muted underline">All characters</Link>
        <h1 className="m-0 font-display text-4xl font-semibold">Parties</h1>
        <p className="m-0 text-muted">A party shares a live roll feed and lets the DM see everyone’s HP, AC, and conditions. {v.authEnabled ? 'Players join with the invite code.' : 'Turn on accounts to invite other players; until then parties are just for you.'}</p>
        <PartyList campaigns={campaigns.map(c => ({ id: c.id, name: c.name }))} canJoin={!!v.user} />
      </div>
    </main>
  )
}
