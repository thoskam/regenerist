import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import './globals.css'

const display = Fraunces({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-display', display: 'swap' })
const ui = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-ui', display: 'swap' })

export const metadata: Metadata = {
  title: 'Land of Dragons — D&D character sheets',
  description: 'D&D 5e character sheets with rules, rolling, and table tracking.',
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#13110e' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
