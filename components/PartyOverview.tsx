'use client'

import Link from 'next/link'
import UserAvatar from './UserAvatar'

interface Life {
  name: string
  race: string
  class: string
  subclass: string
  level: number
  currentHp: number
  maxHp: number
  stats: {
    str: number
    dex: number
    con: number
    int: number
    wis: number
    cha: number
  }
}

interface Owner {
  id: string
  name: string | null
  image: string | null
}

interface Character {
  id: number
  name: string
  slug: string
  level: number
  lives: Life[]
  user: Owner | null
}

interface PartyOverviewProps {
  characters: { character: Character }[]
}

function calculateAC(dex: number): number {
  const dexMod = Math.floor((dex - 10) / 2)
  return 10 + dexMod
}

function getHPColor(current: number, max: number): string {
  const percent = (current / max) * 100
  if (percent > 50) return 'bg-green-500'
  if (percent > 25) return 'bg-yellow-500'
  return 'bg-red-500'
}

export default function PartyOverview({ characters }: PartyOverviewProps) {
  if (characters.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No characters in this campaign yet.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {characters.map(({ character }) => {
        const life = character.lives[0]
        if (!life) return null

        const ac = calculateAC(life.stats.dex)
        const hpPercent = (life.currentHp / life.maxHp) * 100
        const hpColor = getHPColor(life.currentHp, life.maxHp)

        return (
          <Link
            key={character.id}
            href={`/character/${character.slug}`}
            className="block bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-gold-500/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-semibold text-white">{life.name}</h4>
                <p className="text-sm text-slate-400">
                  {life.race} {life.class}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-slate-700 px-2 py-1 rounded text-xs text-slate-300">
                  AC {ac}
                </span>
                <span className="bg-slate-700 px-2 py-1 rounded text-xs text-slate-300">
                  Lv {life.level}
                </span>
              </div>
            </div>

            {/* HP Bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>HP</span>
                <span>{life.currentHp}/{life.maxHp}</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${hpColor} transition-all`}
                  style={{ width: `${Math.max(0, Math.min(100, hpPercent))}%` }}
                />
              </div>
            </div>

            {/* Owner */}
            {character.user && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <UserAvatar src={character.user.image} name={character.user.name} size="sm" />
                <span>{character.user.name}</span>
              </div>
            )}
          </Link>
        )
      })}
    </div>
  )
}
