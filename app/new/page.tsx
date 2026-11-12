import type { Metadata } from 'next'
import BuilderApp from '@/components/builder/BuilderApp'
import { requirePageViewer } from '@/lib/pageAuth'

export const metadata: Metadata = { title: 'New character — Land of Dragons' }

export const dynamic = 'force-dynamic'

export default async function NewCharacterPage() {
  await requirePageViewer('/new')
  return <BuilderApp />
}
