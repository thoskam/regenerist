'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ABILITY_NAMES, SKILLS, computeSheet, fmtMod, ordinal } from '@/lib/sheet/compute'
import { emptyPlayState, ABILITIES, type Ability } from '@/lib/sheet/types'
import { POINT_BUY_COST, STANDARD_ARRAY, abilityScores, asiSlots, findClass, findSpecies, generateDoc, spellAllowance, totalLevel, validateBuild, type AsiChoice, type Build, type BuildClass } from '@/lib/rules/build'
import type { RulesPack } from '@/lib/rules/types'
import { cx } from '@/components/sheet/ui'

type Step = 'basics' | 'class' | 'species' | 'background' | 'abilities' | 'skills' | 'asi' | 'spells' | 'review'
const STEPS: Array<{ id: Step; label: string }> = [
  { id: 'basics', label: 'Basics' }, { id: 'class', label: 'Class & level' }, { id: 'species', label: 'Species' }, { id: 'background', label: 'Background' },
  { id: 'abilities', label: 'Ability scores' }, { id: 'skills', label: 'Skills' }, { id: 'asi', label: 'Improvements & feats' }, { id: 'spells', label: 'Spells' }, { id: 'review', label: 'Review' },
]
const SKILL_NAME = Object.fromEntries(SKILLS.map(s => [s.key, s.name]))
const skillLabel = (k: string) => SKILL_NAME[k] || (k === 'thieves-tools' ? 'Thieves’ Tools' : k.replace(/-/g, ' '))

const blankBuild = (): Build => ({
  version: 1, edition: '2024', name: '', species: { name: '' }, background: { name: '' },
  abilities: { method: 'standard', base: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 } },
  classes: [], asi: [], feats: [], spells: [], hpMode: 'average', customFeatures: [], languages: [],
})

const field = 'min-h-[42px] rounded-xl border border-line bg-raised px-3 text-sm text-ink'
const chip = (on: boolean) => cx('min-h-[34px] rounded-full border px-3 text-[13px] font-semibold', on ? 'border-accent bg-accent text-on-accent' : 'border-line text-ink')

export default function BuilderApp({ initial, slug, levelUp }: { initial?: Build | null; slug?: string; levelUp?: boolean }) {
  const router = useRouter()
  const [b, setB] = useState<Build>(() => initial ?? blankBuild())
  const [step, setStep] = useState<Step>(initial ? (levelUp ? 'class' : 'review') : 'basics')
  const [pack, setPack] = useState<RulesPack | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    setPack(null); setLoadError(null)
    fetch(`/api/rules/${b.edition}`).then(async r => {
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Could not load rules.')
      if (live) setPack(data)
    }).catch(e => live && setLoadError(e.message))
    return () => { live = false }
  }, [b.edition])

  const up = (patch: Partial<Build>) => setB(x => ({ ...x, ...patch }))
  const issues = useMemo(() => (pack ? validateBuild(pack, b) : []), [pack, b])
  const preview = useMemo(() => {
    if (!pack || !b.classes.length) return null
    try { return computeSheet(generateDoc(pack, b), emptyPlayState()) } catch { return null }
  }, [pack, b])
  const errors = issues.filter(i => i.level === 'error')

  const save = async () => {
    setSaving(true); setSaveError(null)
    const res = await fetch(slug ? `/api/sheets/${slug}/build` : '/api/sheets/build', { method: slug ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ build: b }) })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setSaveError(data.error || 'Could not save.'); return }
    router.push(`/c/${data.slug}`)
  }

  const idx = STEPS.findIndex(s => s.id === step)
  return (
    <div className="v2 min-h-screen font-ui text-sm" data-theme="ember">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href={slug ? `/c/${slug}` : '/'} className="text-xs text-muted underline">{slug ? 'Back to sheet' : 'All characters'}</Link>
            <h1 className="m-0 font-display text-3xl font-semibold">{slug ? (levelUp ? 'Level up' : 'Edit build') : 'New character'}{b.name ? ` · ${b.name}` : ''}</h1>
          </div>
          <span className="rounded-full border border-line px-3 py-1.5 text-xs text-muted">{b.edition} rules · level {totalLevel(b) || 0}</span>
        </header>
        <nav aria-label="Builder steps" className="flex gap-1 overflow-x-auto rounded-2xl border border-line bg-panel p-1.5">
          {STEPS.map((s, i) => (
            <button key={s.id} type="button" aria-current={step === s.id ? 'step' : undefined} onClick={() => setStep(s.id)}
              className={cx('min-h-[40px] shrink-0 rounded-xl px-3 text-[13px] font-semibold', step === s.id ? 'bg-accent text-on-accent' : 'text-muted hover:text-ink')}>{i + 1}. {s.label}</button>
          ))}
        </nav>
        {loadError && <div role="alert" className="rounded-xl border border-bad p-3 text-bad">{loadError}</div>}
        <div className="flex flex-wrap items-start gap-4">
          <section className="flex min-w-0 flex-[3_1_560px] flex-col gap-4 rounded-2xl border border-line bg-panel p-4 sm:p-5">
            {!pack && !loadError ? <p className="m-0 text-muted">Loading {b.edition} rules…</p> : pack && (
              <>
                {step === 'basics' && <Basics b={b} up={up} locked={!!slug} />}
                {step === 'class' && <ClassStep b={b} up={up} pack={pack} />}
                {step === 'species' && <SpeciesStep b={b} up={up} pack={pack} />}
                {step === 'background' && <BackgroundStep b={b} up={up} pack={pack} />}
                {step === 'abilities' && <AbilitiesStep b={b} up={up} pack={pack} />}
                {step === 'skills' && <SkillsStep b={b} up={up} pack={pack} />}
                {step === 'asi' && <AsiStep b={b} up={up} pack={pack} />}
                {step === 'spells' && <SpellsStep b={b} up={up} pack={pack} />}
                {step === 'review' && <Review issues={issues} />}
              </>
            )}
            <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-4">
              <button type="button" disabled={idx === 0} onClick={() => setStep(STEPS[idx - 1].id)} className="min-h-[44px] rounded-xl border border-line px-4 font-semibold disabled:opacity-40">Back</button>
              {step !== 'review'
                ? <button type="button" onClick={() => setStep(STEPS[idx + 1].id)} className="min-h-[44px] rounded-xl bg-accent px-5 font-semibold text-on-accent">Next</button>
                : <button type="button" disabled={saving || !!errors.length || !pack} onClick={save} className="min-h-[44px] rounded-xl bg-accent px-5 font-semibold text-on-accent disabled:opacity-50">{saving ? 'Saving…' : slug ? 'Save changes' : 'Create character'}</button>}
            </div>
            {saveError && <p role="alert" className="m-0 text-bad">{saveError}</p>}
          </section>
          <Preview b={b} preview={preview} issues={issues} />
        </div>
      </div>
    </div>
  )
}

function Preview({ b, preview, issues }: { b: Build; preview: ReturnType<typeof computeSheet> | null; issues: ReturnType<typeof validateBuild> }) {
  return (
    <aside aria-label="Preview" className="flex min-w-0 flex-[1_1_280px] flex-col gap-3 rounded-2xl border border-line bg-panel p-4 lg:sticky lg:top-4">
      <h2 className="m-0 font-display text-xl font-semibold">{b.name || 'Unnamed'}</h2>
      {!preview ? <p className="m-0 text-muted">Choose a class to see your numbers.</p> : (
        <>
          <p className="m-0 text-muted">{[b.species.option ? `${b.species.name} (${b.species.option})` : b.species.name, preview.classLabel, b.background.name].filter(Boolean).join(' · ')}</p>
          <div className="grid grid-cols-3 gap-2">
            {ABILITIES.map(a => (
              <div key={a} className="flex flex-col items-center rounded-xl bg-raised py-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">{a}</span>
                <span className="text-xl font-semibold">{preview.abilities[a].score}</span>
                <span className="text-xs text-muted">{fmtMod(preview.abilities[a].mod)}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[13px]">
            <span>HP <strong>{preview.hp.max}</strong></span><span>AC <strong>{preview.ac.value}</strong> <span className="text-muted">(no armor)</span></span>
            <span>Initiative <strong>{fmtMod(preview.initiative)}</strong></span><span>Proficiency <strong>{fmtMod(preview.pb)}</strong></span>
            <span>Speed <strong>{preview.speeds[0].value} ft</strong></span><span>Passive Perception <strong>{preview.passives.perception}</strong></span>
          </div>
          <div className="text-[13px]"><span className="text-muted">Saves: </span>{ABILITIES.filter(a => preview.abilities[a].saveProf).map(a => `${a.toUpperCase()} ${fmtMod(preview.abilities[a].save)}`).join(', ') || '—'}</div>
          <div className="text-[13px]"><span className="text-muted">Skills: </span>{preview.skills.filter(s => s.prof !== 'none').map(s => `${s.name} ${fmtMod(s.bonus)}${s.prof === 'expertise' ? '*' : ''}`).join(', ') || '—'}</div>
          {preview.spellSlots.length > 0 && <div className="text-[13px]"><span className="text-muted">Spell slots: </span>{preview.spellSlots.map(s => `${ordinal(s.level)} ×${s.max}`).join(', ')}</div>}
        </>
      )}
      {issues.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px]">
          {issues.map(i => <li key={i.message} className={i.level === 'error' ? 'text-bad' : 'text-muted'}>{i.level === 'error' ? '✕' : '•'} {i.message}</li>)}
        </ul>
      )}
    </aside>
  )
}

type StepProps = { b: Build; up: (p: Partial<Build>) => void; pack: RulesPack }

function Basics({ b, up, locked }: { b: Build; up: (p: Partial<Build>) => void; locked: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 font-semibold">Character name
        <input value={b.name} onChange={e => up({ name: e.target.value.slice(0, 80) })} className={field} autoFocus />
      </label>
      <fieldset className="flex flex-col gap-2" disabled={locked}>
        <legend className="mb-2 font-semibold">Rules edition</legend>
        <div className="flex flex-wrap gap-2">
          {(['2024', '2014'] as const).map(e => (
            <button key={e} type="button" aria-pressed={b.edition === e} onClick={() => up({ ...blankBuild(), name: b.name, edition: e })} className={chip(b.edition === e)}>{e === '2024' ? '2024 (5.5e) rules' : '2014 (5e) rules'}</button>
          ))}
        </div>
        <p className="m-0 text-[13px] text-muted">{locked ? 'The edition is fixed once a character exists.' : '2024 uses the 2024 Free Rules classes (subclass features are entered by hand). 2014 uses your local PHB and supplement data, with all subclasses. Changing edition clears your choices.'}</p>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">Hit points per level</legend>
        <div className="flex gap-2">
          <button type="button" aria-pressed={b.hpMode === 'average'} onClick={() => up({ hpMode: 'average' })} className={chip(b.hpMode === 'average')}>Fixed average</button>
          <button type="button" aria-pressed={b.hpMode === 'rolled'} onClick={() => up({ hpMode: 'rolled' })} className={chip(b.hpMode === 'rolled')}>Rolled</button>
        </div>
      </fieldset>
    </div>
  )
}

function ClassStep({ b, up, pack }: StepProps) {
  const setClass = (i: number, patch: Partial<BuildClass>) => up({ classes: b.classes.map((c, j) => (j === i ? { ...c, ...patch } : c)) })
  const total = totalLevel(b)
  const available = pack.classes.filter(c => !b.classes.some(x => x.name === c.name))
  const add = (name: string) => up({ classes: [...b.classes, { name, level: 1, skills: [], expertise: [], subclass: null }] })
  const rollHp = (i: number) => {
    const c = b.classes[i]; const rc = findClass(pack, c.name); if (!rc) return
    const n = i === 0 ? c.level - 1 : c.level
    setClass(i, { hpRolls: Array.from({ length: Math.max(0, n) }, (_, k) => c.hpRolls?.[k] || 1 + Math.floor(Math.random() * rc.hitDie)) })
  }
  return (
    <div className="flex flex-col gap-4">
      {b.classes.map((c, i) => {
        const rc = findClass(pack, c.name)
        if (!rc) return null
        const feats = [...rc.features, ...(rc.subclasses.find(s => s.name === c.subclass)?.features ?? [])].filter(f => f.level <= c.level).sort((x, y) => x.level - y.level)
        return (
          <div key={c.name} className="flex flex-col gap-3 rounded-2xl bg-raised p-4">
            <div className="flex flex-wrap items-end gap-3">
              <h3 className="m-0 flex-1 font-display text-xl font-semibold">{c.name}{i === 0 && <span className="ml-2 text-xs font-medium text-muted">starting class</span>}</h3>
              <label className="flex flex-col gap-1 text-xs text-muted">Level
                <select value={c.level} onChange={e => setClass(i, { level: Number(e.target.value) })} className={field}>
                  {Array.from({ length: 20 - (total - c.level) }, (_, k) => k + 1).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
              {(c.level >= rc.subclassLevel || c.subclass) && (
                <label className="flex min-w-[200px] flex-col gap-1 text-xs text-muted">{rc.subclassTitle}
                  {rc.subclasses.length ? (
                    <select value={c.subclass ?? ''} onChange={e => setClass(i, { subclass: e.target.value || null })} className={field}>
                      <option value="">Choose…</option>
                      {rc.subclasses.map(s => <option key={s.name + s.source} value={s.name}>{s.name} ({s.source})</option>)}
                    </select>
                  ) : <input value={c.subclass ?? ''} placeholder="Subclass name" onChange={e => setClass(i, { subclass: e.target.value.slice(0, 60) || null })} className={field} />}
                </label>
              )}
              <button type="button" onClick={() => up({ classes: b.classes.filter((_, j) => j !== i), asi: b.asi.filter(a => a.className !== c.name), spells: b.spells.filter(s => s.className !== c.name) })} className="min-h-[42px] rounded-xl border border-line px-3 text-[13px] text-bad">Remove</button>
            </div>
            <p className="m-0 text-[13px] text-muted">d{rc.hitDie} hit die · saves {rc.saves.map(a => a.toUpperCase()).join(', ')}{rc.spellcasting ? ` · ${rc.spellcasting.progression} caster (${rc.spellcasting.ability.toUpperCase()})` : ''}</p>
            {rc.features.some(f => f.optional) && (
              <div className="flex flex-wrap items-center gap-1.5 text-[13px]"><span className="text-muted">Optional features:</span>
                {rc.features.filter(f => f.optional && f.level <= c.level).map(f => {
                  const on = (c.optional ?? []).includes(f.name)
                  return <button key={f.name} type="button" aria-pressed={on} onClick={() => setClass(i, { optional: on ? (c.optional ?? []).filter(x => x !== f.name) : [...(c.optional ?? []), f.name] })} className={chip(on)}>{f.name}</button>
                })}
              </div>
            )}
            {b.hpMode === 'rolled' && (
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="text-muted">HP rolls (d{rc.hitDie}):</span>
                {(c.hpRolls ?? []).map((v, k) => (
                  <input key={k} aria-label={`HP roll ${k + 1}`} inputMode="numeric" value={v} onChange={e => { const r = [...(c.hpRolls ?? [])]; r[k] = Math.min(rc.hitDie, Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1)); setClass(i, { hpRolls: r }) }} className="h-9 w-12 rounded-lg border border-line bg-panel text-center" />
                ))}
                <button type="button" onClick={() => rollHp(i)} className="min-h-[34px] rounded-lg border border-accent px-3 font-semibold">Roll missing</button>
              </div>
            )}
            <details>
              <summary className="cursor-pointer text-[13px] font-semibold text-accent">Features through level {c.level} ({feats.length})</summary>
              <ul className="m-0 mt-2 grid list-none grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-1 p-0 text-[13px]">
                {feats.map(f => <li key={f.name + f.level}><span className="text-muted">{f.level}</span> {f.name}</li>)}
              </ul>
            </details>
          </div>
        )
      })}
      {total < 20 && (
        <label className="flex flex-col gap-1.5 font-semibold">{b.classes.length ? 'Add a class (multiclass)' : 'Choose a class'}
          <select value="" onChange={e => e.target.value && add(e.target.value)} className={field}>
            <option value="">Select…</option>
            {available.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </label>
      )}
      {b.edition === '2024' && b.classes.some(c => c.subclass && !findClass(pack, c.name)?.subclasses.length) && <CustomFeatures b={b} up={up} />}
    </div>
  )
}

function CustomFeatures({ b, up }: { b: Build; up: (p: Partial<Build>) => void }) {
  const [name, setName] = useState(''); const [level, setLevel] = useState('3'); const [desc, setDesc] = useState('')
  const list = b.customFeatures ?? []
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-line p-4">
      <h3 className="m-0 text-base font-semibold">Subclass features (entered by hand)</h3>
      <p className="m-0 text-[13px] text-muted">The 2024 data has no subclass text. Add the features you have; they appear on your sheet.</p>
      {list.map((f, i) => (
        <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-raised px-3 py-2 text-[13px]">
          <span><strong>{f.name}</strong>{f.level ? <span className="text-muted"> · level {f.level}</span> : null}</span>
          <button type="button" onClick={() => up({ customFeatures: list.filter((_, j) => j !== i) })} className="text-bad underline">Remove</button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <input aria-label="Feature name" placeholder="Feature name" value={name} onChange={e => setName(e.target.value.slice(0, 80))} className={cx(field, 'flex-[1_1_200px]')} />
        <input aria-label="Level" inputMode="numeric" value={level} onChange={e => setLevel(e.target.value.replace(/\D/g, '').slice(0, 2))} className={cx(field, 'w-20')} />
      </div>
      <textarea aria-label="Description" placeholder="What it does" value={desc} onChange={e => setDesc(e.target.value.slice(0, 4000))} rows={3} className={cx(field, 'py-2')} />
      <button type="button" disabled={!name.trim()} onClick={() => { up({ customFeatures: [...list, { name: name.trim(), level: Number(level) || undefined, description: desc.trim() ? `<p>${desc.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>` : '' }] }); setName(''); setDesc('') }} className="self-start min-h-[38px] rounded-lg bg-accent px-4 font-semibold text-on-accent disabled:opacity-50">Add feature</button>
    </div>
  )
}

function AbilityPicker({ label, from, count, amount, value, onChange }: { label: string; from: Ability[]; count: number; amount: number; value: Partial<Record<Ability, number>>; onChange: (v: Partial<Record<Ability, number>>) => void }) {
  const picked = from.filter(a => value[a])
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] text-muted">{label}: choose {count} for +{amount}</span>
      <div className="flex flex-wrap gap-1.5">
        {from.map(a => {
          const on = !!value[a]
          return <button key={a} type="button" aria-pressed={on} disabled={!on && picked.length >= count} onClick={() => { const v = { ...value }; if (on) delete v[a]; else v[a] = amount; onChange(v) }} className={cx(chip(on), 'disabled:opacity-40')}>{a.toUpperCase()}</button>
        })}
      </div>
    </div>
  )
}

function SpeciesStep({ b, up, pack }: StepProps) {
  const [q, setQ] = useState('')
  const sp = findSpecies(pack, b.species.name)
  const list = pack.species.filter(s => s.name.toLowerCase().includes(q.toLowerCase()))
  const setSp = (patch: Partial<Build['species']>) => up({ species: { ...b.species, ...patch } })
  const allSkills = SKILLS.map(s => s.key)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <input aria-label="Search species" placeholder="Search species" value={q} onChange={e => setQ(e.target.value)} className={cx(field, 'flex-[1_1_220px]')} />
        <select aria-label="Species" value={b.species.name} onChange={e => up({ species: { name: e.target.value } })} className={cx(field, 'flex-[2_1_260px]')}>
          <option value="">Choose a species…</option>
          {list.map(s => <option key={s.name + s.source} value={s.name}>{s.name} ({s.source})</option>)}
        </select>
      </div>
      {sp && (
        <div className="flex flex-col gap-3 rounded-2xl bg-raised p-4">
          <p className="m-0 text-[13px] text-muted">{[sp.size, `speed ${sp.speed.walk} ft`, sp.darkvision ? `darkvision ${sp.darkvision} ft` : '', sp.resist?.length ? `resist ${sp.resist.join(', ')}` : '', sp.abilities ? Object.entries(sp.abilities).map(([a, v]) => `${a.toUpperCase()} +${v}`).join(', ') : ''].filter(Boolean).join(' · ')}</p>
          <p className="m-0 text-[13px]"><span className="text-muted">Traits: </span>{sp.traits.map(t => t.name).join(', ') || '—'}</p>
          {sp.options && (
            <label className="flex flex-col gap-1 text-[13px] text-muted">{sp.options.label}
              <select value={b.species.option ?? ''} onChange={e => setSp({ option: e.target.value || null })} className={field}>
                <option value="">Choose…</option>
                {sp.options.choices.map(o => <option key={o.name} value={o.name}>{o.name}</option>)}
              </select>
            </label>
          )}
          {sp.abilityChoice?.map((ch, i) => (
            <AbilityPicker key={i} label={`Ability increase ${i + 1}`} from={(ch.from as Ability[] | undefined) ?? ABILITIES} count={ch.count} amount={ch.amount}
              value={Object.fromEntries(Object.entries(b.species.abilityBonuses ?? {}).filter(([, v]) => v === ch.amount)) as Partial<Record<Ability, number>>}
              onChange={v => setSp({ abilityBonuses: { ...Object.fromEntries(Object.entries(b.species.abilityBonuses ?? {}).filter(([, n]) => n !== ch.amount)), ...v } })} />
          ))}
          {sp.skillChoice && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] text-muted">Choose {sp.skillChoice.count} skill{sp.skillChoice.count > 1 ? 's' : ''}</span>
              <div className="flex flex-wrap gap-1.5">
                {(sp.skillChoice.from.length ? sp.skillChoice.from : allSkills).map(k => {
                  const on = (b.species.skills ?? []).includes(k)
                  return <button key={k} type="button" aria-pressed={on} disabled={!on && (b.species.skills ?? []).length >= sp.skillChoice!.count} onClick={() => setSp({ skills: on ? (b.species.skills ?? []).filter(x => x !== k) : [...(b.species.skills ?? []), k] })} className={cx(chip(on), 'disabled:opacity-40')}>{skillLabel(k)}</button>
                })}
              </div>
            </div>
          )}
          {b.edition === '2024' && sp.name === 'Human' && (
            <label className="flex flex-col gap-1 text-[13px] text-muted">Versatile: origin feat
              <select value={b.feats[0] ?? ''} onChange={e => up({ feats: e.target.value ? [e.target.value] : [] })} className={field}>
                <option value="">Choose…</option>
                {pack.feats.filter(f => f.origin).map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
              </select>
            </label>
          )}
          <LanguageInput label={`Languages${sp.languageChoice ? ` (known: ${sp.languages.join(', ') || '—'}; choose ${sp.languageChoice})` : ` (${sp.languages.join(', ')})`}`} value={b.species.languages ?? []} onChange={v => setSp({ languages: v })} />
        </div>
      )}
    </div>
  )
}

function LanguageInput({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(value.join(', '))
  return (
    <label className="flex flex-col gap-1 text-[13px] text-muted">{label}
      <input value={text} placeholder="e.g. Elvish, Draconic" onChange={e => setText(e.target.value.slice(0, 200))} onBlur={() => onChange(text.split(',').map(s => s.trim()).filter(Boolean).slice(0, 6))} className={field} />
    </label>
  )
}

function BackgroundStep({ b, up, pack }: StepProps) {
  const bg = pack.backgrounds.find(x => x.name === b.background.name)
  const setBg = (patch: Partial<Build['background']>) => up({ background: { ...b.background, ...patch } })
  const opts = bg?.abilityOptions ?? []
  const bonus = b.background.abilityBonuses ?? {}
  const mode = Object.values(bonus).some(v => v === 2) ? 'two' : Object.keys(bonus).length === 3 ? 'three' : 'two'
  return (
    <div className="flex flex-col gap-4">
      <select aria-label="Background" value={b.background.name} onChange={e => up({ background: { name: e.target.value } })} className={field}>
        <option value="">Choose a background…</option>
        {pack.backgrounds.map(x => <option key={x.name + x.source} value={x.name}>{x.name} ({x.source})</option>)}
      </select>
      {bg && (
        <div className="flex flex-col gap-3 rounded-2xl bg-raised p-4">
          <p className="m-0 text-[13px]"><span className="text-muted">Skills: </span>{bg.skills.map(skillLabel).join(', ') || '—'}<span className="text-muted"> · Tools: </span>{bg.tools.join(', ') || '—'}{bg.feat ? <><span className="text-muted"> · Origin feat: </span>{bg.feat}</> : null}{bg.feature ? <><span className="text-muted"> · Feature: </span>{bg.feature.name}</> : null}</p>
          {opts.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button type="button" aria-pressed={mode === 'two'} onClick={() => setBg({ abilityBonuses: {} })} className={chip(mode === 'two')}>+2 and +1</button>
                <button type="button" aria-pressed={mode === 'three'} onClick={() => setBg({ abilityBonuses: Object.fromEntries(opts.map(a => [a, 1])) })} className={chip(mode === 'three')}>+1 to all three</button>
              </div>
              {mode === 'two' && (
                <div className="flex flex-wrap gap-3">
                  {[2, 1].map(n => (
                    <label key={n} className="flex flex-col gap-1 text-[13px] text-muted">+{n} to
                      <select value={(Object.entries(bonus).find(([, v]) => v === n) ?? [''])[0]} onChange={e => { const v = Object.fromEntries(Object.entries(bonus).filter(([a, x]) => x !== n && a !== e.target.value)); if (e.target.value) v[e.target.value] = n; setBg({ abilityBonuses: v }) }} className={field}>
                        <option value="">Choose…</option>
                        {opts.map(a => <option key={a} value={a}>{ABILITY_NAMES[a]}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          {bg.languages > 0 && <LanguageInput label={`Choose ${bg.languages} language${bg.languages > 1 ? 's' : ''}`} value={b.background.languages ?? []} onChange={v => setBg({ languages: v })} />}
        </div>
      )}
    </div>
  )
}

function AbilitiesStep({ b, up, pack }: StepProps) {
  const base = b.abilities.base
  const setBase = (a: Ability, v: number) => up({ abilities: { ...b.abilities, base: { ...base, [a]: v } } })
  const method = b.abilities.method
  const [rolled, setRolled] = useState<number[]>([])
  const pool = method === 'standard' ? STANDARD_ARRAY : method === 'roll' ? rolled : []
  const spent = ABILITIES.reduce((t, a) => t + (POINT_BUY_COST[base[a]] ?? 0), 0)
  const finals = abilityScores(pack, b)
  const roll4d6 = () => {
    const r = Array.from({ length: 6 }, () => { const d = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 6)).sort((x, y) => y - x); return d[0] + d[1] + d[2] }).sort((x, y) => y - x)
    setRolled(r)
    up({ abilities: { method: 'roll', base: Object.fromEntries(ABILITIES.map((a, i) => [a, r[i]])) as Record<Ability, number> } })
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {([['standard', 'Standard array'], ['pointbuy', 'Point buy'], ['roll', 'Roll 4d6'], ['manual', 'Manual']] as const).map(([m, l]) => (
          <button key={m} type="button" aria-pressed={method === m} onClick={() => up({ abilities: { method: m, base: m === 'pointbuy' ? { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 } : m === 'standard' ? { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 } : base } })} className={chip(method === m)}>{l}</button>
        ))}
        {method === 'roll' && <button type="button" onClick={roll4d6} className="min-h-[34px] rounded-full border border-accent px-3 text-[13px] font-semibold">Roll {rolled.length ? 'again' : 'now'}</button>}
      </div>
      {method === 'pointbuy' && <p className={cx('m-0 text-[13px]', spent > 27 ? 'text-bad' : 'text-muted')}>{27 - spent} of 27 points left</p>}
      {pool.length > 0 && <p className="m-0 text-[13px] text-muted">Assign: {pool.join(', ')} — use each once.</p>}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
        {ABILITIES.map(a => (
          <div key={a} className="flex flex-col gap-2 rounded-2xl bg-raised p-3">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-muted">{ABILITY_NAMES[a]}</span>
            {pool.length > 0 ? (
              <select aria-label={`${ABILITY_NAMES[a]} base score`} value={base[a]} onChange={e => {
                const v = Number(e.target.value); const other = ABILITIES.find(o => o !== a && base[o] === v)
                up({ abilities: { ...b.abilities, base: { ...base, [a]: v, ...(other ? { [other]: base[a] } : {}) } } })
              }} className={field}>{[...new Set(pool)].map(v => <option key={v} value={v}>{v}</option>)}</select>
            ) : method === 'pointbuy' ? (
              <div className="flex items-center gap-2">
                <button type="button" aria-label={`Lower ${ABILITY_NAMES[a]}`} disabled={base[a] <= 8} onClick={() => setBase(a, base[a] - 1)} className="h-9 w-9 rounded-lg border border-line disabled:opacity-40">−</button>
                <span className="w-8 text-center text-lg font-semibold">{base[a]}</span>
                <button type="button" aria-label={`Raise ${ABILITY_NAMES[a]}`} disabled={base[a] >= 15 || (POINT_BUY_COST[base[a] + 1] - POINT_BUY_COST[base[a]]) > 27 - spent} onClick={() => setBase(a, base[a] + 1)} className="h-9 w-9 rounded-lg border border-line disabled:opacity-40">+</button>
              </div>
            ) : (
              <input aria-label={`${ABILITY_NAMES[a]} base score`} inputMode="numeric" value={base[a]} onChange={e => setBase(a, Math.max(3, Math.min(20, Number(e.target.value.replace(/\D/g, '')) || 3)))} className={field} />
            )}
            <span className="text-[13px] text-muted">Final <strong className="text-ink">{finals[a]}</strong> ({fmtMod(Math.floor((finals[a] - 10) / 2))})</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SkillsStep({ b, up, pack }: StepProps) {
  const fixed = new Set<string>([...(pack.backgrounds.find(x => x.name === b.background.name)?.skills ?? []), ...(findSpecies(pack, b.species.name)?.skills ?? []), ...(b.species.skills ?? [])])
  const setClass = (i: number, patch: Partial<BuildClass>) => up({ classes: b.classes.map((c, j) => (j === i ? { ...c, ...patch } : c)) })
  const proficient = new Set<string>([...fixed, ...b.classes.flatMap(c => c.skills)])
  if (!b.classes.length) return <p className="m-0 text-muted">Choose a class first.</p>
  return (
    <div className="flex flex-col gap-5">
      <p className="m-0 text-[13px] text-muted">From background and species: {[...fixed].map(skillLabel).join(', ') || '—'}</p>
      {b.classes.map((c, i) => {
        const rc = findClass(pack, c.name); if (!rc) return null
        const choice = i === 0 ? rc.skillChoices : rc.multiclass.skills
        const from = choice ? (choice.from.length ? choice.from : SKILLS.map(s => s.key)) : []
        const expertiseCount = rc.expertise.filter(e => e.level <= c.level).reduce((t, e) => t + e.count, 0)
        return (
          <div key={c.name} className="flex flex-col gap-3">
            {choice && (
              <div className="flex flex-col gap-1.5">
                <h3 className="m-0 text-base font-semibold">{c.name}: choose {choice.count} skill{choice.count > 1 ? 's' : ''} ({c.skills.length}/{choice.count})</h3>
                <div className="flex flex-wrap gap-1.5">
                  {from.map(k => {
                    const on = c.skills.includes(k); const taken = !on && proficient.has(k)
                    return <button key={k} type="button" aria-pressed={on} disabled={taken || (!on && c.skills.length >= choice.count)} onClick={() => setClass(i, { skills: on ? c.skills.filter(x => x !== k) : [...c.skills, k] })} className={cx(chip(on), 'disabled:opacity-40')}>{skillLabel(k)}</button>
                  })}
                </div>
              </div>
            )}
            {expertiseCount > 0 && (
              <div className="flex flex-col gap-1.5">
                <h3 className="m-0 text-base font-semibold">{c.name} Expertise: choose {expertiseCount} ({c.expertise.length}/{expertiseCount})</h3>
                <div className="flex flex-wrap gap-1.5">
                  {[...proficient, ...(b.edition === '2014' && c.name === 'Rogue' ? ['thieves-tools'] : [])].map(k => {
                    const on = c.expertise.includes(k)
                    return <button key={k} type="button" aria-pressed={on} disabled={!on && c.expertise.length >= expertiseCount} onClick={() => setClass(i, { expertise: on ? c.expertise.filter(x => x !== k) : [...c.expertise, k] })} className={cx(chip(on), 'disabled:opacity-40')}>{skillLabel(k)}</button>
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function AsiStep({ b, up, pack }: StepProps) {
  const slots = asiSlots(pack, b)
  if (!slots.length) return <p className="m-0 text-muted">No Ability Score Improvements yet. They arrive at class level 4.</p>
  const get = (s: { className: string; classLevel: number }) => b.asi.find(x => x.className === s.className && x.classLevel === s.classLevel)
  const set = (s: { className: string; classLevel: number }, patch: Partial<AsiChoice> | null) => {
    const rest = b.asi.filter(x => !(x.className === s.className && x.classLevel === s.classLevel))
    up({ asi: patch === null ? rest : [...rest, { ...(get(s) ?? { className: s.className, classLevel: s.classLevel, kind: 'asi' }), ...patch } as AsiChoice] })
  }
  const feats = pack.feats.filter(f => f.name !== 'Ability Score Improvement')
  return (
    <div className="flex flex-col gap-3">
      {slots.map(s => {
        const c = get(s)
        const entries = Object.entries(c?.abilities ?? {}) as Array<[Ability, number]>
        const plusTwo = entries.find(([, v]) => v === 2)?.[0] ?? ''
        const ones = entries.filter(([, v]) => v === 1).map(([a]) => a)
        const feat = feats.find(f => f.name === c?.feat)
        return (
          <div key={`${s.className}-${s.classLevel}`} className="flex flex-col gap-2 rounded-2xl bg-raised p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="m-0 flex-1 text-base font-semibold">{s.className} level {s.classLevel}</h3>
              <button type="button" aria-pressed={c?.kind !== 'feat'} onClick={() => set(s, { kind: 'asi', feat: undefined, featAbility: undefined })} className={chip(c?.kind !== 'feat')}>Ability scores</button>
              <button type="button" aria-pressed={c?.kind === 'feat'} onClick={() => set(s, { kind: 'feat', abilities: {} })} className={chip(c?.kind === 'feat')}>Feat</button>
            </div>
            {c?.kind !== 'feat' && (
              <div className="flex flex-wrap items-end gap-3 text-[13px]">
                <label className="flex flex-col gap-1 text-muted">+2 to one
                  <select value={plusTwo} onChange={e => set(s, { abilities: e.target.value ? { [e.target.value]: 2 } : {} })} className={field}><option value="">—</option>{ABILITIES.map(a => <option key={a} value={a}>{ABILITY_NAMES[a]}</option>)}</select>
                </label>
                <span className="pb-3 text-muted">or</span>
                {[0, 1].map(k => (
                  <label key={k} className="flex flex-col gap-1 text-muted">+1
                    <select value={ones[k] ?? ''} onChange={e => { const next = [...ones]; next[k] = e.target.value as Ability; set(s, { abilities: Object.fromEntries(next.filter(Boolean).map(a => [a, 1])) }) }} className={field}><option value="">—</option>{ABILITIES.map(a => <option key={a} value={a}>{ABILITY_NAMES[a]}</option>)}</select>
                  </label>
                ))}
              </div>
            )}
            {c?.kind === 'feat' && (
              <div className="flex flex-wrap items-end gap-3 text-[13px]">
                <label className="flex min-w-[220px] flex-col gap-1 text-muted">Feat
                  <input list={`feats-${b.edition}`} value={c.feat ?? ''} onChange={e => set(s, { feat: e.target.value.slice(0, 80) })} placeholder="Search or type a feat" className={field} />
                </label>
                {feat?.abilityChoice && (
                  <label className="flex flex-col gap-1 text-muted">+{feat.abilityChoice.amount} to
                    <select value={c.featAbility ?? ''} onChange={e => set(s, { featAbility: (e.target.value || undefined) as Ability | undefined })} className={field}><option value="">—</option>{feat.abilityChoice.from.map(a => <option key={a} value={a}>{ABILITY_NAMES[a]}</option>)}</select>
                  </label>
                )}
                {feat?.prerequisite && <span className="pb-3 text-muted">Prerequisite: {feat.prerequisite}</span>}
              </div>
            )}
          </div>
        )
      })}
      <datalist id={`feats-${b.edition}`}>{feats.map(f => <option key={f.name} value={f.name} />)}</datalist>
      {b.edition === '2024' && <p className="m-0 text-[13px] text-muted">The 2024 data includes origin feats only. Type any other feat’s name; its rules text won’t be shown.</p>}
    </div>
  )
}

function SpellsStep({ b, up, pack }: StepProps) {
  const scores = abilityScores(pack, b)
  const casters = b.classes.map(c => ({ c, al: spellAllowance(pack, b, c, scores) })).filter(x => x.al)
  const [active, setActive] = useState(0)
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'cantrips' | 'spells'>('cantrips')
  const [others, setOthers] = useState(false)
  if (!casters.length) return <p className="m-0 text-muted">No spellcasting classes.</p>
  const { c, al } = casters[Math.min(active, casters.length - 1)]
  const chosen = b.spells.filter(s => s.className === c.name)
  const chosenSet = new Set(chosen.map(s => s.name))
  const byName = new Map(pack.spells.map(s => [s.name, s]))
  const nC = chosen.filter(s => byName.get(s.name)?.level === 0).length
  const nS = chosen.filter(s => (byName.get(s.name)?.level ?? 0) > 0).length
  const pool = pack.spells.filter(s => (others ? !s.classes.length || s.classes.includes(al!.list) : s.classes.includes(al!.list)) && (tab === 'cantrips' ? s.level === 0 : s.level > 0 && s.level <= al!.maxLevel) && s.name.toLowerCase().includes(q.toLowerCase()))
  const toggle = (name: string) => up({ spells: chosenSet.has(name) ? b.spells.filter(s => !(s.className === c.name && s.name === name)) : [...b.spells, { className: c.name, name }] })
  return (
    <div className="flex flex-col gap-4">
      {casters.length > 1 && <div className="flex gap-2">{casters.map((x, i) => <button key={x.c.name} type="button" aria-pressed={i === active} onClick={() => setActive(i)} className={chip(i === active)}>{x.c.name}</button>)}</div>}
      <div className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={tab === 'cantrips'} onClick={() => setTab('cantrips')} className={chip(tab === 'cantrips')}>Cantrips {nC}/{al!.cantrips}</button>
        <button type="button" aria-pressed={tab === 'spells'} onClick={() => setTab('spells')} className={chip(tab === 'spells')}>Spells {nS}/{al!.spells} (up to {ordinal(Math.max(1, al!.maxLevel))})</button>
        <label className="ml-auto flex items-center gap-2 text-[13px] text-muted"><input type="checkbox" checked={others} onChange={e => setOthers(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" /> Include spells with no class list</label>
      </div>
      <input aria-label="Search spells" placeholder={`Search the ${al!.list} list`} value={q} onChange={e => setQ(e.target.value)} className={field} />
      <ul className="m-0 grid max-h-[480px] list-none grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-1.5 overflow-y-auto p-0">
        {pool.map(s => {
          const on = chosenSet.has(s.name)
          return (
            <li key={s.name + s.source}>
              <button type="button" aria-pressed={on} onClick={() => toggle(s.name)} className={cx('flex w-full flex-col rounded-xl border px-3 py-2 text-left', on ? 'border-accent bg-accent-soft' : 'border-line bg-raised')}>
                <span className="text-[13px] font-semibold">{s.name}{s.concentration ? ' · C' : ''}{s.ritual ? ' · R' : ''}</span>
                <span className="text-xs text-muted">{s.level ? `${ordinal(s.level)} ${s.school}` : `${s.school} cantrip`} · {s.castingTime}{s.classes.length ? '' : ' · unlisted'}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Review({ issues }: { issues: ReturnType<typeof validateBuild> }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="m-0 font-display text-2xl font-semibold">Review</h2>
      {issues.length === 0 ? <p className="m-0 text-good">Everything checks out.</p> : (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {issues.map(i => <li key={i.message} className={cx('rounded-lg px-3 py-2', i.level === 'error' ? 'border border-bad text-bad' : 'bg-raised text-muted')}>{i.level === 'error' ? 'Must fix: ' : 'Heads up: '}{i.message}</li>)}
        </ul>
      )}
      <p className="m-0 text-[13px] text-muted">Warnings don’t block saving. Equipment is added on the sheet’s Inventory tab after you create the character.</p>
    </div>
  )
}
