import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from '@/components/Providers'
import Header from '@/components/Header'
import { RollProvider } from '@/lib/dice/RollContext'
import RollResultModal from '@/components/dice/RollResultModal'
import RollHistoryPanel from '@/components/dice/RollHistoryPanel'
import Roll20Provider from '@/components/Roll20Provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'The Land of Dragons - D&D Character Manager',
  description: 'A D&D 5e character management app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme');if(t==='papyrus')document.documentElement.setAttribute('data-theme','papyrus')}catch(e){}` }} />
      </head>
      <body className={inter.className}>
        <Providers>
          <RollProvider>
            <Roll20Provider />
            <Header />
            <main>{children}</main>
            <RollResultModal />
            <RollHistoryPanel />
          </RollProvider>
        </Providers>
      </body>
    </html>
  )
}
