import RegeneristHome from '@/components/legacy/RegeneristHome'
import { requirePageViewer } from '@/lib/pageAuth'
import { requireRegeneristPage } from '@/lib/regeneristAccess'

export const dynamic = 'force-dynamic'

// Private: the check runs before the client page is rendered, so other accounts never receive its code.
export default async function Page() {
  await requirePageViewer('/regenerist')
  await requireRegeneristPage()
  return <RegeneristHome />
}
