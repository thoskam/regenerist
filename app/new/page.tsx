import type { Metadata } from 'next'
import BuilderApp from '@/components/builder/BuilderApp'

export const metadata: Metadata = { title: 'New character — Regenerist' }

export default function NewCharacterPage() {
  return <BuilderApp />
}
