import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'The Regenerist - D&D Character Manager',
  description: 'A D&D 5e character management app for regenerating characters',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  )
}
