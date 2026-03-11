'use client'

import { useState, useMemo } from 'react'
import { X, ChevronRight, ChevronLeft, Dices, Pencil, Check } from 'lucide-react'
import PointBuyCalculator from '@/components/PointBuyCalculator'
import AlignmentPicker from '@/components/AlignmentPicker'
import races from '@/lib/data/races.json'
import classData from '@/lib/data/classes.json'
import { Stats } from '@/lib/statMapper'

// ─── Types ───────────────────────────────────────────────────────────────────

interface WizardProps {
  onClose: () => void
  onCreated: (slug: string) => void
}

interface FormData {
  isRegenerist: boolean | null
  name: string
  race: string
  baseClass: string
  subclass: string
  level: number
  scoreMethod: 'standard' | 'pointbuy'
  stats: Stats
  standardArray: Record<keyof Stats, number | null>
  alignment: string
  story: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]
const STAT_LABELS: Record<keyof Stats, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
}
const DEFAULT_STATS: Stats = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 }
const EMPTY_ARRAY: Record<keyof Stats, number | null> = {
  str: null, dex: null, con: null, int: null, wis: null, cha: null,
}

// Parse "ClassName: Subclass" → grouped map
function parseClasses(data: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {}
  for (const entry of data) {
    const [base, sub] = entry.split(': ')
    if (!groups[base]) groups[base] = []
    if (sub) groups[base].push(sub)
  }
  return groups
}

// ─── Step components ─────────────────────────────────────────────────────────

function TypeStep({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm text-center">How should this character work?</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          onClick={() => onChange(false)}
          className={`p-5 rounded-xl border-2 text-left transition-all ${
            value === false
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-slate-600 hover:border-slate-500 bg-slate-900/50'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
              <Pencil className="w-5 h-5 text-slate-300" />
            </div>
            <div>
              <div className="font-semibold text-white">Standard</div>
              <div className="text-xs text-slate-400">[STD]</div>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            You choose race, class, stats, and backstory. Full manual control — great for bringing
            an existing character to life.
          </p>
        </button>

        <button
          onClick={() => onChange(true)}
          className={`p-5 rounded-xl border-2 text-left transition-all ${
            value === true
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-slate-600 hover:border-slate-500 bg-slate-900/50'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-900/50 flex items-center justify-center">
              <Dices className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="font-semibold text-amber-300">Regenerist</div>
              <div className="text-xs text-amber-500">[REG]</div>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your character regenerates into random races and classes with AI-written stories.
            Perfect for chaotic, ever-evolving adventurers.
          </p>
        </button>
      </div>
    </div>
  )
}

function NameStep({
  value,
  onChange,
  isRegenerist,
}: {
  value: string
  onChange: (v: string) => void
  isRegenerist: boolean
}) {
  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm text-center">
        {isRegenerist
          ? 'Give your Regenerist a name. Their soul persists across all incarnations.'
          : 'What is your character called?'}
      </p>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white text-lg focus:outline-none focus:border-amber-500"
        placeholder={isRegenerist ? 'The Eternal One…' : 'Gandalf, Aria, Thorin…'}
        autoFocus
      />
    </div>
  )
}

function RaceStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [search, setSearch] = useState('')
  const filtered = (races as string[]).filter(r =>
    r.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search races…"
        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm focus:outline-none focus:border-amber-500"
        autoFocus
      />
      <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
        {filtered.map(race => (
          <button
            key={race}
            onClick={() => onChange(race)}
            className={`px-3 py-2 rounded-lg text-sm text-left transition-all ${
              value === race
                ? 'bg-amber-600 text-white border border-amber-500'
                : 'bg-slate-900 border border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            {race}
          </button>
        ))}
      </div>
    </div>
  )
}

function ClassStep({
  baseClass,
  subclass,
  onChange,
}: {
  baseClass: string
  subclass: string
  onChange: (base: string, sub: string) => void
}) {
  const groups = useMemo(() => parseClasses(classData as string[]), [])
  const baseClasses = Object.keys(groups).sort()
  const subclasses = baseClass ? groups[baseClass] ?? [] : []

  return (
    <div className="space-y-4">
      {/* Base class grid */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Class</p>
        <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
          {baseClasses.map(cls => (
            <button
              key={cls}
              onClick={() => onChange(cls, groups[cls]?.[0] ?? '')}
              className={`px-2 py-2 rounded-lg text-xs text-left transition-all ${
                baseClass === cls
                  ? 'bg-amber-600 text-white border border-amber-500'
                  : 'bg-slate-900 border border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>

      {/* Subclass grid */}
      {baseClass && subclasses.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Subclass</p>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
            {subclasses.map(sub => (
              <button
                key={sub}
                onClick={() => onChange(baseClass, sub)}
                className={`px-3 py-2 rounded-lg text-xs text-left transition-all ${
                  subclass === sub
                    ? 'bg-amber-600 text-white border border-amber-500'
                    : 'bg-slate-900 border border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function LevelStep({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-slate-400 text-sm">Select your starting level</p>
      <div className="flex items-center gap-6">
        <button
          onClick={() => onChange(Math.max(1, value - 1))}
          disabled={value <= 1}
          className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-lg font-bold"
        >
          −
        </button>
        <div className="text-center">
          <div className="text-6xl font-bold text-amber-400">{value}</div>
          <div className="text-sm text-slate-400 mt-1">Level</div>
        </div>
        <button
          onClick={() => onChange(Math.min(20, value + 1))}
          disabled={value >= 20}
          className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-lg font-bold"
        >
          +
        </button>
      </div>
      {/* Level milestones */}
      <div className="flex flex-wrap gap-1 justify-center">
        {[1, 4, 5, 8, 10, 12, 16, 17, 19, 20].map(l => (
          <button
            key={l}
            onClick={() => onChange(l)}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              value === l ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        ASIs at levels 4, 8, 12, 16, 19 · Extra Attack at 5 · Tier 3 at 11
      </p>
    </div>
  )
}

function StatsStep({
  method,
  stats,
  standardArray,
  level,
  onMethodChange,
  onStatsChange,
  onArrayChange,
}: {
  method: 'standard' | 'pointbuy'
  stats: Stats
  standardArray: Record<keyof Stats, number | null>
  level: number
  onMethodChange: (m: 'standard' | 'pointbuy') => void
  onStatsChange: (s: Stats) => void
  onArrayChange: (a: Record<keyof Stats, number | null>) => void
}) {
  const usedValues = Object.values(standardArray).filter(v => v !== null) as number[]
  const availableFor = (stat: keyof Stats) => {
    const current = standardArray[stat]
    return STANDARD_ARRAY.filter(v => !usedValues.includes(v) || v === current)
  }

  const handleArrayChange = (stat: keyof Stats, raw: string) => {
    const val = raw === '' ? null : parseInt(raw)
    const updated = { ...standardArray, [stat]: val }
    onArrayChange(updated)
    // Sync to stats if all assigned
    const allFilled = (Object.values(updated) as (number | null)[]).every(v => v !== null)
    if (allFilled) {
      onStatsChange(updated as unknown as Stats)
    }
  }

  return (
    <div className="space-y-4">
      {/* Method toggle */}
      <div className="flex rounded-lg overflow-hidden border border-slate-600">
        {(['standard', 'pointbuy'] as const).map(m => (
          <button
            key={m}
            onClick={() => onMethodChange(m)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              method === m ? 'bg-slate-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            {m === 'standard' ? 'Standard Array' : 'Point Buy'}
          </button>
        ))}
      </div>

      {method === 'standard' ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 text-center">
            Assign 15, 14, 13, 12, 10, 8 — each value used once
          </p>
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(STAT_LABELS) as (keyof Stats)[]).map(stat => (
              <div key={stat} className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                  {stat}
                </label>
                <select
                  value={standardArray[stat] ?? ''}
                  onChange={e => handleArrayChange(stat, e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-center text-lg font-bold text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">—</option>
                  {availableFor(stat).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                  {standardArray[stat] !== null && !availableFor(stat).includes(standardArray[stat]!) && (
                    <option value={standardArray[stat]!}>{standardArray[stat]}</option>
                  )}
                </select>
                {standardArray[stat] !== null && (
                  <p className="text-xs text-slate-500 text-center mt-1">
                    mod {standardArray[stat]! >= 10
                      ? `+${Math.floor((standardArray[stat]! - 10) / 2)}`
                      : Math.floor((standardArray[stat]! - 10) / 2)}
                  </p>
                )}
              </div>
            ))}
          </div>
          {/* Remaining values */}
          <div className="flex gap-2 flex-wrap justify-center">
            {STANDARD_ARRAY.filter(v => !usedValues.includes(v)).map(v => (
              <span key={v} className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-sm font-bold border border-slate-600">
                {v}
              </span>
            ))}
            {usedValues.length === 6 && (
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> All assigned
              </span>
            )}
          </div>
        </div>
      ) : (
        <PointBuyCalculator
          onStatsChange={onStatsChange}
          initialStats={stats}
          level={level}
        />
      )}
    </div>
  )
}

function StoryStep({
  story,
  alignment,
  onStoryChange,
  onAlignmentChange,
}: {
  story: string
  alignment: string
  onStoryChange: (v: string) => void
  onAlignmentChange: (v: string) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Alignment</label>
        <AlignmentPicker value={alignment} onChange={onAlignmentChange} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Backstory</label>
        <p className="text-slate-500 text-xs mb-2">Optional — leave blank and fill it in later.</p>
        <textarea
          value={story}
          onChange={e => onStoryChange(e.target.value)}
          rows={6}
          className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
          placeholder="Born in a small village on the edge of the Whispering Wood…"
        />
      </div>
    </div>
  )
}

function ReviewStep({ data }: { data: FormData }) {
  const rows = data.isRegenerist
    ? [
        ['Type', 'Regenerist [REG]'],
        ['Name', data.name],
      ]
    : [
        ['Type', 'Standard [STD]'],
        ['Name', data.name],
        ['Race', data.race],
        ['Class', `${data.baseClass}${data.subclass ? ` — ${data.subclass}` : ''}`],
        ['Level', String(data.level)],
        ['Alignment', data.alignment || '(none)'],
        ['STR / DEX / CON', `${data.stats.str} / ${data.stats.dex} / ${data.stats.con}`],
        ['INT / WIS / CHA', `${data.stats.int} / ${data.stats.wis} / ${data.stats.cha}`],
        ['Backstory', data.story ? `${data.story.slice(0, 80)}${data.story.length > 80 ? '…' : ''}` : '(none)'],
      ]

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm text-center">Everything look good?</p>
      <div className="bg-slate-900 rounded-xl border border-slate-700 divide-y divide-slate-700/50">
        {rows.map(([label, val]) => (
          <div key={label} className="flex items-start justify-between px-4 py-3 gap-4">
            <span className="text-xs text-slate-500 uppercase tracking-wide whitespace-nowrap pt-0.5">{label}</span>
            <span className="text-sm text-white text-right">{val}</span>
          </div>
        ))}
      </div>
      {data.isRegenerist && (
        <p className="text-xs text-slate-500 text-center">
          Your first incarnation will be generated when you click Regenerate on the character page.
        </p>
      )}
    </div>
  )
}

// ─── Wizard ──────────────────────────────────────────────────────────────────

type Step =
  | 'type'
  | 'name'
  | 'race'
  | 'class'
  | 'level'
  | 'stats'
  | 'story'
  | 'review'

const STATIC_STEPS: Step[] = ['type', 'name', 'race', 'class', 'level', 'stats', 'story', 'review']
const REGEN_STEPS: Step[] = ['type', 'name', 'story', 'review']

const STEP_LABELS: Record<Step, string> = {
  type: 'Type',
  name: 'Name',
  race: 'Race',
  class: 'Class',
  level: 'Level',
  stats: 'Ability Scores',
  story: 'Backstory',
  review: 'Review',
}

export default function CharacterCreationWizard({ onClose, onCreated }: WizardProps) {
  const [data, setData] = useState<FormData>({
    isRegenerist: null,
    name: '',
    race: (races as string[])[0],
    baseClass: 'Fighter',
    subclass: 'Champion',
    level: 1,
    scoreMethod: 'standard',
    stats: DEFAULT_STATS,
    standardArray: EMPTY_ARRAY,
    alignment: '',
    story: '',
  })
  const [stepIndex, setStepIndex] = useState(0)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const steps = data.isRegenerist === null
    ? STATIC_STEPS // show all steps until type is chosen (for the indicator)
    : data.isRegenerist
    ? REGEN_STEPS
    : STATIC_STEPS

  const currentStep = steps[stepIndex]

  const set = (patch: Partial<FormData>) => setData(prev => ({ ...prev, ...patch }))

  // Validation per step
  const canAdvance = (): boolean => {
    switch (currentStep) {
      case 'type': return data.isRegenerist !== null
      case 'name': return data.name.trim().length >= 2
      case 'race': return !!data.race
      case 'class': return !!data.baseClass && !!data.subclass
      case 'level': return data.level >= 1 && data.level <= 20
      case 'stats': {
        if (data.scoreMethod === 'standard') {
          return (Object.values(data.standardArray) as (number | null)[]).every(v => v !== null)
        }
        return true
      }
      case 'story': return true
      case 'review': return true
      default: return false
    }
  }

  const handleNext = () => {
    if (stepIndex < steps.length - 1) setStepIndex(i => i + 1)
  }

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex(i => i - 1)
  }

  const handleTypeChange = (isReg: boolean) => {
    set({ isRegenerist: isReg })
    // Reset step index since step count changes
    setStepIndex(0)
  }

  // After type is chosen, advance
  const handleTypeSelect = (isReg: boolean) => {
    set({ isRegenerist: isReg })
    setTimeout(() => setStepIndex(1), 100)
  }

  const buildStats = (): Stats => {
    if (data.scoreMethod === 'standard') {
      const a = data.standardArray
      return {
        str: a.str ?? 8,
        dex: a.dex ?? 8,
        con: a.con ?? 8,
        int: a.int ?? 8,
        wis: a.wis ?? 8,
        cha: a.cha ?? 8,
      }
    }
    return data.stats
  }

  const handleCreate = async () => {
    setIsCreating(true)
    setError(null)
    try {
      const finalStats = buildStats()
      const payload: Record<string, unknown> = {
        name: data.name.trim(),
        isRegenerist: data.isRegenerist,
        alignment: data.alignment,
        story: data.story,
      }
      if (!data.isRegenerist) {
        payload.race = data.race
        payload.className = data.baseClass
        payload.subclass = data.subclass
        payload.level = data.level
        payload.stats = finalStats
      }

      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const created = await res.json()
        onCreated(created.slug)
      } else {
        const body = await res.json()
        setError(body.error || 'Failed to create character')
      }
    } catch {
      setError('Failed to create character')
    } finally {
      setIsCreating(false)
    }
  }

  const progressSteps = data.isRegenerist === null ? STATIC_STEPS : steps
  const isLastStep = stepIndex === steps.length - 1

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
          <h2 className="text-lg font-semibold text-white">Create Character</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 py-3 border-b border-slate-700/50 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto">
            {progressSteps.map((s, i) => {
              const isDone = i < stepIndex
              const isCurrent = i === stepIndex
              const isAccessible = data.isRegenerist !== null
              return (
                <div key={s} className="flex items-center gap-1 shrink-0">
                  {i > 0 && (
                    <div className={`w-4 h-px ${isDone ? 'bg-amber-500' : 'bg-slate-600'}`} />
                  )}
                  <div
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      isCurrent
                        ? 'bg-amber-600 text-white'
                        : isDone
                        ? 'text-amber-400'
                        : 'text-slate-600'
                    }`}
                  >
                    {isDone && <Check className="w-3 h-3" />}
                    {isAccessible || i === 0 ? STEP_LABELS[s] : STEP_LABELS[s]}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <h3 className="text-base font-semibold text-slate-200 mb-4">
            {STEP_LABELS[currentStep]}
          </h3>

          {currentStep === 'type' && (
            <TypeStep value={data.isRegenerist} onChange={handleTypeSelect} />
          )}
          {currentStep === 'name' && (
            <NameStep
              value={data.name}
              onChange={name => set({ name })}
              isRegenerist={data.isRegenerist ?? false}
            />
          )}
          {currentStep === 'race' && (
            <RaceStep value={data.race} onChange={race => set({ race })} />
          )}
          {currentStep === 'class' && (
            <ClassStep
              baseClass={data.baseClass}
              subclass={data.subclass}
              onChange={(baseClass, subclass) => set({ baseClass, subclass })}
            />
          )}
          {currentStep === 'level' && (
            <LevelStep value={data.level} onChange={level => set({ level })} />
          )}
          {currentStep === 'stats' && (
            <StatsStep
              method={data.scoreMethod}
              stats={data.stats}
              standardArray={data.standardArray}
              level={data.level}
              onMethodChange={m => set({ scoreMethod: m })}
              onStatsChange={stats => set({ stats })}
              onArrayChange={standardArray => set({ standardArray })}
            />
          )}
          {currentStep === 'story' && (
            <StoryStep
              story={data.story}
              alignment={data.alignment}
              onStoryChange={story => set({ story })}
              onAlignmentChange={alignment => set({ alignment })}
            />
          )}
          {currentStep === 'review' && <ReviewStep data={data} />}

          {error && (
            <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700 shrink-0">
          <button
            onClick={handleBack}
            disabled={stepIndex === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-0 rounded-lg text-sm transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {isLastStep ? (
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="flex items-center gap-2 px-6 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 rounded-lg text-sm font-semibold transition-colors"
            >
              {isCreating ? 'Creating…' : 'Create Character'}
              {!isCreating && <Check className="w-4 h-4" />}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canAdvance()}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-sm font-medium transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
