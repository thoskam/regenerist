import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-utils'

const ADMIN_EMAIL = 'tdkamnikar@gmail.com'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const email = session?.user?.email

  if (!email || email.toLowerCase() !== ADMIN_EMAIL) {
    redirect('/')
  }

  return children
}
