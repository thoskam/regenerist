import { redirect } from 'next/navigation'
import { getViewer } from '@/lib/auth'
import LoginForm from '@/components/party/LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const v = await getViewer()
  const { next } = await searchParams
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
  if (v.user) redirect(safeNext)
  return (
    <main className="v2 flex min-h-screen items-center justify-center p-4 font-ui text-sm" data-theme="ember">
      <LoginForm firstAccount={!v.authEnabled} next={safeNext} />
    </main>
  )
}
