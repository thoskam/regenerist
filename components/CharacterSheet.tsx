import Link from 'next/link'

/** Compatibility entry point: all gameplay now lives in the character-scoped sheet. */
export default function CharacterSheet() {
  return <div className="min-h-screen bg-slate-900 p-8 text-center text-white">
    <h1 className="mb-4 text-2xl font-bold">The Regenerist</h1>
    <p className="mb-4 text-slate-300">Choose a character to open its sheet and life history.</p>
    <Link href="/" className="text-gold-400 underline">Open character hub</Link>
  </div>
}
