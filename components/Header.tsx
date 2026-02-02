'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useState } from 'react'
import UserAvatar from './UserAvatar'

export default function Header() {
  const { data: session, status } = useSession()
  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <header className="bg-slate-800 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-gold-400">The Regenerist</span>
        </Link>

        <nav className="flex items-center gap-4">
          {status === 'loading' ? (
            <div className="h-8 w-8 rounded-full bg-slate-700 animate-pulse" />
          ) : session?.user ? (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 hover:bg-slate-700 rounded-lg px-2 py-1.5 transition-colors"
              >
                <UserAvatar src={session.user.image} name={session.user.name} size="md" />
                <span className="text-slate-300 text-sm hidden sm:inline">
                  {session.user.name}
                </span>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-20 py-1">
                    <Link
                      href="/"
                      onClick={() => setShowDropdown(false)}
                      className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      My Characters
                    </Link>
                    <Link
                      href="/campaigns"
                      onClick={() => setShowDropdown(false)}
                      className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      My Campaigns
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setShowDropdown(false)}
                      className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      Profile
                    </Link>
                    <hr className="my-1 border-slate-700" />
                    <button
                      onClick={() => {
                        setShowDropdown(false)
                        signOut()
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => signIn()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Sign In
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}
