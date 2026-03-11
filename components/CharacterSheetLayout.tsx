'use client'

import { useState, useCallback, useMemo } from 'react'
import { Scroll, Sparkles, Swords, MessageCircle, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { CharacterData } from '@/components/modules/ModuleRenderer'
import { getStatModifier } from '@/lib/statMapper'
import { formatModifier } from '@/lib/calculations'
import RollableAbility from '@/components/abilities/RollableAbility'
import SavesTable from '@/components/SavesTable'
import ProficiencyList from '@/components/ProficiencyList'
import HPTracker from '@/components/HPTracker'
import RestButtons from '@/components/RestButtons'
import ActionsTab from '@/components/ActionsTab'
import FeatureDisplay from '@/components/FeatureDisplay'
import ChoicesDisplay from '@/components/ChoicesDisplay'
import FormSummary from '@/components/FormSummary'
import ResourcePanel from '@/components/ResourcePanel'
import ConditionsTracker from '@/components/ConditionsTracker'
import { InventoryTab } from '@/components/inventory'
import SpellList from '@/components/SpellList'
import type { HydratedRaceInfo } from '@/lib/types/5etools'
import type { Stats } from '@/lib/types'
import { stripTags } from '@/lib/entryParser'
import { ALIGNMENT_SHORT } from '@/components/AlignmentPicker'
import {
  isPreparedCaster,
  calculateMaxPreparedSpells,
  getAlwaysPreparedSpells,
  getPreparationAbility,
} from '@/lib/spellPreparation'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CharacterSheetLayoutProps {
  characterData: CharacterData
  slug: string
  lifeId: number
  onHpChange: (current: number, max: number) => Promise<void>
  onRefresh: () => void
  isOwner: boolean
  regenPhase: 'idle' | 'fading-out' | 'loading' | 'flashing-in'
  isRegenerating: boolean
  level: number
  onLevelChange: (level: number) => void
}

type RightTab = 'actions' | 'spells' | 'inventory' | 'features' | 'info' | 'resources'

// ─── Helpers ───────────────────────────────────────────────────────────────

const ABILITY_DEFS: { key: keyof Stats; abbr: string; name: string }[] = [
  { key: 'str', abbr: 'STR', name: 'Strength' },
  { key: 'dex', abbr: 'DEX', name: 'Dexterity' },
  { key: 'con', abbr: 'CON', name: 'Constitution' },
  { key: 'int', abbr: 'INT', name: 'Intelligence' },
  { key: 'wis', abbr: 'WIS', name: 'Wisdom' },
  { key: 'cha', abbr: 'CHA', name: 'Charisma' },
]

const SENSE_KEYWORDS = ['darkvision', 'blindsight', 'tremorsense', 'truesight']

function extractSenses(raceInfo: HydratedRaceInfo | null): string[] {
  if (!raceInfo) return []
  const senses: string[] = []
  for (const trait of raceInfo.traits) {
    const text = `${trait.name} ${trait.description}`.toLowerCase()
    for (const sense of SENSE_KEYWORDS) {
      if (text.includes(sense) && !senses.includes(sense)) {
        senses.push(sense)
      }
    }
  }
  return senses
}

function getLanguagesText(raceInfo: HydratedRaceInfo | null): string | null {
  if (!raceInfo) return null
  const trait = raceInfo.traits.find((t) => t.name.toLowerCase().includes('language'))
  return trait?.description || null
}

function getSpeedLabel(raceInfo: HydratedRaceInfo | null): string {
  if (!raceInfo) return '30 ft.'
  const trait = raceInfo.traits.find(
    (t) => t.name.toLowerCase().includes('speed') || t.description.toLowerCase().includes('speed is')
  )
  if (trait) {
    const match = trait.description.match(/(\d+)\s*feet/i)
    if (match) return `${match[1]} ft.`
  }
  return '30 ft.'
}

// ─── Sub-components ────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <h3 className="text-xs text-slate-400 font-semibold tracking-wider uppercase mb-3">{label}</h3>
  )
}

function StatCircle({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-16 h-16 rounded-full border-2 border-slate-600 bg-slate-800 flex items-center justify-center">
        <span className="text-2xl font-bold text-white">{value}</span>
      </div>
      <span className="text-xs text-slate-400 uppercase tracking-wider text-center">{label}</span>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function CharacterSheetLayout({
  characterData,
  slug,
  lifeId,
  onHpChange,
  onRefresh,
  isOwner,
  regenPhase,
  isRegenerating,
  level,
  onLevelChange: _onLevelChange,
}: CharacterSheetLayoutProps) {
  const [activeTab, setActiveTab] = useState<RightTab>('actions')
  const [localPreparedSpells, setLocalPreparedSpells] = useState<string[] | null>(null)
  const [showChronicle, setShowChronicle] = useState(false)

  const {
    characterId,
    characterName,
    className,
    subclass,
    race,
    currentHp,
    maxHp,
    stats,
    baseStats,
    statBonuses,
    alignment,
    story,
    effect,
    subclassChoice,
    proficiencyBonus,
    skillProficiencies,
    hydratedData,
    actions,
    activeState,
    calculatedStats,
    onUseAction,
  } = characterData

  // Effective stats = base stats + any campaign bonuses
  const effectiveStats: Stats = {
    str: stats.str + (statBonuses?.str ?? 0),
    dex: stats.dex + (statBonuses?.dex ?? 0),
    con: stats.con + (statBonuses?.con ?? 0),
    int: stats.int + (statBonuses?.int ?? 0),
    wis: stats.wis + (statBonuses?.wis ?? 0),
    cha: stats.cha + (statBonuses?.cha ?? 0),
  }

  const conMod = getStatModifier(effectiveStats.con)
  const dexMod = getStatModifier(effectiveStats.dex)
  const initiative = calculatedStats?.initiative ?? dexMod
  const ac = calculatedStats?.ac?.total ?? (10 + dexMod)
  const speed = getSpeedLabel(hydratedData?.raceInfo ?? null)

  const senses = extractSenses(hydratedData?.raceInfo ?? null)
  const languagesText = getLanguagesText(hydratedData?.raceInfo ?? null)
  const raceInfo = hydratedData?.raceInfo ?? null

  // Chronicle / story parsing
  const chronicleSections = useMemo(() => {
    if (!story) return { roleplay: null, tactics: null, catchphrase: null, raw: null }
    const lines = story.split('\n')
    let current = { title: '', lines: [] as string[] }
    const parsed: { title: string; content: string }[] = []
    for (const line of lines) {
      const h = line.match(/^##\s+(.+)$/)
      if (h) {
        if (current.title || current.lines.length) parsed.push({ title: current.title, content: current.lines.join('\n').trim() })
        current = { title: h[1], lines: [] }
      } else {
        current.lines.push(line)
      }
    }
    if (current.title || current.lines.length) parsed.push({ title: current.title, content: current.lines.join('\n').trim() })
    const find = (kw: string) => parsed.find(s => s.title.toLowerCase().includes(kw))?.content ?? null
    const hasStructured = parsed.some(s => s.title)
    return {
      roleplay: find('roleplay'),
      tactics: find('how to play'),
      catchphrase: find('catchphrase'),
      raw: hasStructured ? null : story,
    }
  }, [story])
  const hasChronicle = Boolean(story && story.trim().length > 0)

  // Spell preparation
  const isPrepared = isPreparedCaster(className)
  const prepAbility = getPreparationAbility(className)
  const prepModifier = prepAbility ? Math.floor((effectiveStats[prepAbility as keyof Stats] - 10) / 2) : 0
  const maxPreparedSpells = isPrepared ? calculateMaxPreparedSpells(className, level, prepModifier) : 0
  const alwaysPreparedSpells = isPrepared ? getAlwaysPreparedSpells(className, subclass, level) : []
  const spellbookData = hydratedData?.selectedSpellbook as {
    spells: { name: string }[]
    archivistNote: string
    preparedSpells?: string[]
  } | null
  const preparedSpells = localPreparedSpells ?? spellbookData?.preparedSpells ?? []

  const handlePreparedSpellsChange = useCallback(async (newPreparedSpells: string[]) => {
    setLocalPreparedSpells(newPreparedSpells)
    try {
      const res = await fetch(`/api/characters/${slug}/lives/${lifeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spellbook: {
            ...spellbookData,
            spellNames: spellbookData?.spells.map((s) => s.name) || [],
            preparedSpells: newPreparedSpells,
          },
        }),
      })
      if (res.ok) {
        setLocalPreparedSpells(null)
        onRefresh()
      } else {
        setLocalPreparedSpells(null)
      }
    } catch {
      setLocalPreparedSpells(null)
    }
  }, [slug, lifeId, spellbookData, onRefresh])

  const handleConditionsUpdate = useCallback(async (next: string[]) => {
    await fetch(`/api/characters/${slug}/active-state/conditions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conditions: next }),
    })
    onRefresh()
  }, [slug, onRefresh])

  const animClass =
    regenPhase === 'fading-out'
      ? 'animate-regenerate-out'
      : regenPhase === 'flashing-in'
      ? 'animate-regenerate-in'
      : ''

  // Tabs available for right column
  const showSpells = Boolean(hydratedData?.isSpellcaster)
  const tabs: { id: RightTab; label: string }[] = [
    { id: 'actions', label: 'Actions' },
    ...(showSpells ? [{ id: 'spells' as RightTab, label: 'Spells' }] : []),
    { id: 'inventory', label: 'Inventory' },
    { id: 'features', label: 'Features' },
    { id: 'info', label: 'Info' },
    { id: 'resources', label: 'Resources' },
  ]

  // Proficiencies from hydratedData classInfo (strip 5etools tags like {@item dagger|phb|daggers})
  const armorProfs = (hydratedData?.classInfo?.armorProficiencies ?? []).map(stripTags)
  const weaponProfs = (hydratedData?.classInfo?.weaponProficiencies ?? []).map(stripTags)
  const toolProfs: string[] = []

  return (
    <div className={animClass}>
      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 mb-4 overflow-hidden">
        {/* Row 1: Name + rest buttons */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-slate-700">
          <div className="flex items-start gap-4">
            {characterData.portrait && (
              <img
                src={characterData.portrait}
                alt="Character portrait"
                className="w-16 h-16 rounded-xl object-cover border border-slate-600 shrink-0 mt-0.5"
              />
            )}
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent leading-tight">
              {characterName}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-sm text-slate-300">{race}</span>
              <span className="text-slate-600 text-xs">&middot;</span>
              <span className="text-sm text-amber-400/80 font-medium">
                {className}{subclass ? ` · ${subclass}` : ''}
              </span>
              <span className="text-slate-600 text-xs">&middot;</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-700 text-xs text-slate-300 font-semibold border border-slate-600">
                Level {level}
              </span>
              {alignment && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-700/80 text-xs text-slate-400 border border-slate-600" title={alignment}>
                  {ALIGNMENT_SHORT[alignment] ?? alignment}
                </span>
              )}
            </div>
          </div>
          </div>
          <div className="mt-1 shrink-0 flex items-center gap-2">
            {hasChronicle && (
              <button
                onClick={() => setShowChronicle(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-900/40 hover:bg-indigo-800/50 border border-indigo-700/50 text-indigo-300 rounded-lg transition-colors"
              >
                <Scroll className="w-3.5 h-3.5" />
                Story
              </button>
            )}
            {isOwner && activeState && (
              <RestButtons
                characterSlug={slug}
                activeState={activeState}
                maxHp={maxHp}
                conModifier={conMod}
                onRestComplete={onRefresh}
              />
            )}
          </div>
        </div>

        {/* Row 2: Ability scores | Prof+Speed | HP */}
        <div className="grid grid-cols-12 gap-0 divide-x divide-slate-700">
          {/* Ability scores */}
          <div className="col-span-7 px-3 py-3">
            <div className="bg-slate-900/50 rounded-xl p-2 border border-slate-700/40">
            <div className="grid grid-cols-6 gap-2">
              {ABILITY_DEFS.map(({ key, abbr, name }) => {
                const score = effectiveStats[key]
                const base = baseStats?.[key]
                const mod = getStatModifier(score)
                const pulseStyle =
                  isRegenerating && regenPhase === 'loading'
                    ? {
                        animation: 'grid-pulse 1s ease-in-out infinite',
                        animationDelay: `${ABILITY_DEFS.findIndex((a) => a.key === key) * 0.1}s`,
                      }
                    : undefined
                return (
                  <RollableAbility
                    key={key}
                    abilityName={name}
                    abilityAbbr={abbr}
                    score={score}
                    modifier={mod}
                    baseValue={base}
                    animate={regenPhase === 'flashing-in'}
                    pulseStyle={pulseStyle}
                    characterId={characterId}
                    characterName={characterName}
                  />
                )
              })}
            </div>
            </div>
          </div>

          {/* Proficiency bonus + Speed */}
          <div className="col-span-2 px-4 py-4 flex flex-col items-center justify-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">{formatModifier(proficiencyBonus)}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mt-0.5">Prof. Bonus</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{speed}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mt-0.5">Speed</div>
            </div>
          </div>

          {/* HP */}
          <div className="col-span-3 px-4 py-4 flex flex-col justify-center">
            {isOwner ? (
              <HPTracker
                currentHp={activeState?.currentHp ?? currentHp}
                maxHp={maxHp}
                onHpChange={onHpChange}
              />
            ) : (
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-center">
                <div className="text-xs text-slate-400 font-semibold tracking-wider mb-1">HIT POINTS</div>
                <div className="text-3xl font-bold text-white">
                  {activeState?.currentHp ?? currentHp}
                  <span className="text-xl text-slate-500"> / </span>
                  <span className="text-xl text-slate-400">{maxHp}</span>
                </div>
              </div>
            )}
            {/* Temp HP badge */}
            {activeState && activeState.tempHp > 0 && (
              <div className="mt-2 text-center text-xs text-blue-400 font-medium">
                +{activeState.tempHp} temp
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 3-Column Body ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-4">
        {/* ── Left Column: Saves, Passives, Senses, Proficiencies ─────────── */}
        <div className="col-span-3 space-y-4">
          {/* Saving Throws */}
          <SavesTable
            stats={effectiveStats}
            savingThrowProficiencies={hydratedData?.savingThrowProficiencies ?? []}
            proficiencyBonus={proficiencyBonus}
            characterId={characterId}
            characterName={characterName}
            calculatedSaves={calculatedStats?.savingThrows}
          />

          {/* Passive Scores */}
          {calculatedStats?.passives && (
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <SectionHeader label="Passive Scores" />
              <div className="space-y-2">
                {Object.entries(calculatedStats.passives).map(([name, value]) => (
                  <div key={name} className="flex justify-between items-center">
                    <span className="text-sm text-slate-300 capitalize">
                      Passive {name}
                    </span>
                    <span className="text-sm font-bold text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Senses */}
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <SectionHeader label="Senses" />
            {senses.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {senses.map((sense) => (
                  <span
                    key={sense}
                    className="px-2 py-1 rounded bg-slate-700 text-sm text-slate-200 capitalize"
                  >
                    {sense}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Normal senses.</p>
            )}
          </div>

          {/* Proficiencies & Languages */}
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-4">
            <div>
              <SectionHeader label="Proficiencies & Training" />

              {armorProfs.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Armor</p>
                  <p className="text-sm text-slate-300">{armorProfs.join(', ')}</p>
                </div>
              )}

              {weaponProfs.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Weapons</p>
                  <p className="text-sm text-slate-300">{weaponProfs.join(', ')}</p>
                </div>
              )}

              {toolProfs.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Tools</p>
                  <p className="text-sm text-slate-300">{toolProfs.join(', ')}</p>
                </div>
              )}

              {!armorProfs.length && !weaponProfs.length && !toolProfs.length && (
                <p className="text-sm text-slate-500">No proficiency data available.</p>
              )}
            </div>

            {languagesText && (
              <div>
                <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Languages</p>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{languagesText}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Center Column: Skills ─────────────────────────────────────── */}
        <div className="col-span-3">
          <ProficiencyList
            stats={effectiveStats}
            proficiencies={skillProficiencies}
            proficiencyBonus={proficiencyBonus}
            characterId={characterId}
            characterName={characterName}
            calculatedSkills={calculatedStats?.skills}
          />
        </div>

        {/* ── Right Column: Combat strip + Tabs ────────────────────────── */}
        <div className="col-span-6 space-y-4">
          {/* Combat strip */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 px-6 py-4">
            <div className="flex items-center gap-6 flex-wrap">
              <StatCircle label="Initiative" value={formatModifier(initiative)} />
              <StatCircle label="Armor Class" value={ac} />

              {/* Conditions strip */}
              {isOwner && activeState && (
                <div className="flex-1 min-w-0">
                  <ConditionsTracker
                    activeConditions={activeState.conditions as string[]}
                    onUpdate={handleConditionsUpdate}
                  />
                </div>
              )}
              {!isOwner && activeState && (activeState.conditions as string[]).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(activeState.conditions as string[]).map((c) => (
                    <span key={c} className="px-2 py-0.5 text-xs bg-red-900/50 text-red-300 rounded border border-red-700">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tabbed content panel */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            {/* Tab nav */}
            <div className="flex items-center gap-1 p-2 border-b border-slate-700 bg-slate-900/40 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-slate-700 text-amber-400 shadow-sm shadow-amber-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-4 min-h-[300px]">
              {/* ACTIONS */}
              {activeTab === 'actions' && (
                <ActionsTab
                  actions={actions}
                  activeState={activeState}
                  onUseAction={onUseAction}
                  characterId={characterId}
                  characterName={characterName}
                />
              )}

              {/* SPELLS */}
              {activeTab === 'spells' && showSpells && hydratedData && (
                <SpellList
                  selectedSpellbook={hydratedData.selectedSpellbook}
                  allAvailableSpells={hydratedData.spells ?? undefined}
                  maxSpellLevel={hydratedData.maxSpellLevel ?? 0}
                  spellcastingAbility={hydratedData.spellcastingAbility ?? ''}
                  stats={effectiveStats}
                  proficiencyBonus={proficiencyBonus}
                  activeState={hydratedData.activeState}
                  slug={slug}
                  lifeId={lifeId}
                  onSpellbookUpdate={onRefresh}
                  onCast={onRefresh}
                  className={className}
                  isPreparedCaster={isPrepared}
                  preparedSpells={preparedSpells}
                  alwaysPreparedSpells={alwaysPreparedSpells}
                  maxPreparedSpells={maxPreparedSpells}
                  onPreparedSpellsChange={handlePreparedSpellsChange}
                  characterId={characterId}
                  characterName={characterName}
                />
              )}

              {/* INVENTORY */}
              {activeTab === 'inventory' && (
                isOwner ? (
                  <InventoryTab characterSlug={slug} onEquipmentChange={onRefresh} />
                ) : (
                  <p className="text-slate-500 text-sm">Inventory is private.</p>
                )
              )}

              {/* FEATURES & TRAITS */}
              {activeTab === 'features' && hydratedData && (
                <div className="space-y-4">
                  {hydratedData.classInfo && (
                    <FeatureDisplay
                      title={`${hydratedData.classInfo.name.toUpperCase()} FEATURES`}
                      features={hydratedData.classInfo.features.map((f) => ({
                        name: f.name,
                        level: f.level,
                        description: f.description,
                      }))}
                      currentLevel={level}
                    />
                  )}
                  {raceInfo && raceInfo.traits.length > 0 && (
                    <FeatureDisplay
                      title={`${raceInfo.name.toUpperCase()} TRAITS`}
                      features={raceInfo.traits.map((trait) => ({
                        name: trait.name,
                        level: 1,
                        description: trait.description,
                      }))}
                      currentLevel={level}
                    />
                  )}
                </div>
              )}

              {/* INFO */}
              {activeTab === 'info' && (
                <div className="space-y-4">
                  {/* Summary / story */}
                  {(story || effect || race || className) && (
                    <FormSummary
                      race={race}
                      className={className}
                      subclass={subclass}
                      effect={effect}
                      story={story ?? ''}
                    />
                  )}

                  {/* Subclass choices */}
                  {(subclassChoice || (hydratedData?.subclassInfo?.features?.length ?? 0) > 0) && (
                    <ChoicesDisplay
                      className={className}
                      subclass={subclass}
                      subclassChoice={subclassChoice}
                      level={level}
                      subclassFeatures={hydratedData?.subclassInfo?.features ?? []}
                      subclassName={hydratedData?.subclassInfo?.name}
                    />
                  )}
                </div>
              )}

              {/* RESOURCES */}
              {activeTab === 'resources' && (
                <ResourcePanel
                  slug={slug}
                  activeState={activeState}
                  isWarlock={className.toLowerCase() === 'warlock'}
                  isSpellcaster={hydratedData?.isSpellcaster ?? false}
                  onUpdate={onRefresh}
                  disabled={!isOwner}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Chronicle / Story Modal ──────────────────────────────────────── */}
      {showChronicle && hasChronicle && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h2 className="font-semibold text-amber-400 flex items-center gap-2">
                <Scroll className="w-5 h-5" />
                The Archivist&apos;s Chronicle
              </h2>
              <button
                onClick={() => setShowChronicle(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-5 space-y-4">
              {chronicleSections.roleplay && (
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-purple-400 mb-2">
                    <Sparkles className="w-4 h-4" /> The Roleplay Moment
                  </h3>
                  <div className="prose prose-invert prose-slate prose-sm max-w-none text-slate-300">
                    <ReactMarkdown>{chronicleSections.roleplay}</ReactMarkdown>
                  </div>
                </section>
              )}
              {chronicleSections.tactics && (
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-red-400 mb-2">
                    <Swords className="w-4 h-4" /> How to Play This Life
                  </h3>
                  <div className="prose prose-invert prose-slate prose-sm max-w-none text-slate-300">
                    <ReactMarkdown>{chronicleSections.tactics}</ReactMarkdown>
                  </div>
                </section>
              )}
              {chronicleSections.catchphrase && (
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-yellow-400 mb-2">
                    <MessageCircle className="w-4 h-4" /> Signature Catchphrase
                  </h3>
                  <blockquote className="border-l-4 border-amber-500 pl-4 italic text-amber-200 text-lg">
                    {chronicleSections.catchphrase.replace(/^"|"$/g, '')}
                  </blockquote>
                </section>
              )}
              {effect && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-400 mb-2">Quirk</h3>
                  <p className="text-sm text-slate-300 italic">{effect}</p>
                </section>
              )}
              {chronicleSections.raw && (
                <div className="prose prose-invert prose-slate prose-sm max-w-none text-slate-300">
                  <ReactMarkdown>{chronicleSections.raw}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
