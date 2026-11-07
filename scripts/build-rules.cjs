#!/usr/bin/env node
// Builds normalized rules packs for the character builder.
//
//   Rules text: github.com/5etools-mirror-3/5etools-src (data/ folder), cloned once to
//         data/vendor/5etools/ (falls back to an older local copy in data/ for 2014).
//         2014 = PHB and other 5e books; 2024 = PHB (2024) and later books. Spell class lists come
//         from its spells/sources.json (plus lib/data/spellLists2014.json for 2014).
//   2024 class mechanics (uses, scaling dice, resources): github.com/nick-aschenbach/dnd-data,
//         downloaded once to data/vendor/dnd-data/. 2024 subclasses, feats, backgrounds and spells
//         come from 5etools. 2024 species mechanics are hand-entered below with 5etools trait text.
//
// Output: data/rules/rules-2014.json, data/rules/rules-2024.json (data/ is not committed).
// Usage: node scripts/build-rules.cjs [--offline] [--update]   (--update pulls the latest 5etools data)

require('./register-ts.cjs')
const fs = require('node:fs')
const path = require('node:path')
const { sanitizeHtml } = require('../lib/sheet/sanitize')

const root = path.resolve(__dirname, '..')
const dataDir = path.join(root, 'data')
const outDir = path.join(dataDir, 'rules')
const vendorDir = path.join(dataDir, 'vendor', 'dnd-data')
const fiveDir = path.join(dataDir, 'vendor', '5etools')
/** Where 5etools-format data is read from (set in main). */
let SRC = dataDir

function ensure5etools() {
  const { spawnSync } = require('node:child_process')
  const git = args => spawnSync('git', args, { cwd: fiveDir, stdio: 'inherit' })
  if (fs.existsSync(path.join(fiveDir, 'data', 'class'))) {
    if (process.argv.includes('--update')) git(['pull', '--depth', '1', '--ff-only'])
    return true
  }
  if (process.argv.includes('--offline')) return false
  fs.mkdirSync(path.dirname(fiveDir), { recursive: true })
  process.stdout.write('Downloading 5etools data (github.com/5etools-mirror-3/5etools-src, data/ only)…\n')
  const clone = spawnSync('git', ['clone', '--depth', '1', '--filter=blob:none', '--sparse', 'https://github.com/5etools-mirror-3/5etools-src.git', fiveDir], { stdio: 'inherit' })
  if (clone.status !== 0) return false
  git(['sparse-checkout', 'set', 'data'])
  return fs.existsSync(path.join(fiveDir, 'data', 'class'))
}
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'))
const ABIL = { strength: 'str', dexterity: 'dex', constitution: 'con', intelligence: 'int', wisdom: 'wis', charisma: 'cha' }
const ABILS = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const SCHOOLS = { A: 'Abjuration', C: 'Conjuration', D: 'Divination', E: 'Enchantment', V: 'Evocation', I: 'Illusion', N: 'Necromancy', T: 'Transmutation' }
const slug = s => String(s).toLowerCase().replace(/[’']/g, '').replace(/,\s*/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const strip = t => String(t).replace(/\{@(\w+)\s+([^|}]+)(?:\|([^|}]*))?(?:\|([^}]*))?\}/g, (_m, tag, a, b, c) => (tag === 'scaledamage' || tag === 'scaledice') ? (c || a) : (c && tag !== 'spell' && tag !== 'item' ? c : a)).replace(/\{@\w+\}/g, '')

/* ───────── 5etools entries → HTML (with nested feature refs split out) ───────── */
function entriesToHtml(entries, refs) {
  if (!Array.isArray(entries)) return ''
  const out = []
  for (const e of entries) {
    if (typeof e === 'string') out.push(`<p>${esc(strip(e))}</p>`)
    else if (!e || typeof e !== 'object') continue
    else if (e.type === 'refClassFeature' || e.type === 'refSubclassFeature' || e.type === 'refOptionalfeature') { if (refs) refs.push(e) }
    else if (e.type === 'list') out.push(`<ul>${(e.items || []).map(i => `<li>${typeof i === 'string' ? esc(strip(i)) : i.name ? `<strong>${esc(strip(i.name))}</strong> ${esc(strip(i.entry || (i.entries || []).filter(x => typeof x === 'string').join(' ')))}` : entriesToHtml([i], refs)}</li>`).join('')}</ul>`)
    else if (e.type === 'table') {
      const head = (e.colLabels || []).map(c => `<th>${esc(strip(c))}</th>`).join('')
      const rows = (e.rows || []).map(r => `<tr>${(Array.isArray(r) ? r : r.row || []).map(c => `<td>${esc(strip(typeof c === 'object' && c ? (c.roll ? `${c.roll.min ?? c.roll.exact}${c.roll.max ? `–${c.roll.max}` : ''}` : c.entry || '') : String(c)))}</td>`).join('')}</tr>`).join('')
      out.push(`<table>${e.caption ? `<caption>${esc(e.caption)}</caption>` : ''}${head ? `<thead><tr>${head}</tr></thead>` : ''}<tbody>${rows}</tbody></table>`)
    } else if (e.entries) {
      const inner = entriesToHtml(e.entries, refs)
      out.push(e.name ? (inner.startsWith('<p>') ? inner.replace(/^<p>/, `<p><strong>${esc(strip(e.name))}.</strong> `) : `<h5>${esc(strip(e.name))}</h5>${inner}`) : inner)
    } else if (e.entry) out.push(`<p>${esc(strip(e.entry))}</p>`)
    else if (e.type === 'abilityDc') out.push(`<p><strong>${e.name} save DC</strong> = 8 + your proficiency bonus + your ${(e.attributes || []).map(a => a.toUpperCase()).join('/')} modifier</p>`)
    else if (e.type === 'abilityAttackMod') out.push(`<p><strong>${e.name} attack modifier</strong> = your proficiency bonus + your ${(e.attributes || []).map(a => a.toUpperCase()).join('/')} modifier</p>`)
  }
  return out.join('')
}
const html = (entries, refs) => sanitizeHtml(entriesToHtml(entries, refs))
const textOf = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

/** Guess action type and limited uses from rules text (2014 data carries neither). */
function inferActivation(text) {
  const t = textOf(text).toLowerCase()
  if (/\bbonus action\b/.test(t)) return 'bonus'
  if (/\byou can use your reaction\b|\bas a reaction\b|\buse your reaction\b/.test(t)) return 'reaction'
  if (/\bas an action\b|\buse your action\b|\bcan use an action\b|\bmagic action\b/.test(t)) return 'action'
  return undefined
}
function inferGrants(text) {
  const t = textOf(text).toLowerCase()
  const saves = []
  const re = /proficiency in (strength|dexterity|constitution|intelligence|wisdom|charisma)(?: and (strength|dexterity|constitution|intelligence|wisdom|charisma))? saving throws/g
  let m
  while ((m = re.exec(t))) { saves.push(ABIL[m[1]]); if (m[2]) saves.push(ABIL[m[2]]) }
  return saves.length ? { saves } : undefined
}
function inferUses(text) {
  const t = textOf(text).toLowerCase()
  const reset = /short or long rest/.test(t) ? 'short' : /long rest/.test(t) ? 'long' : /dawn/.test(t) ? 'dawn' : null
  if (!reset || !/(once you use|you can use this feature|number of times equal|times equal to|regain all expended uses|regain all uses|can't use it again|can’t use it again)/.test(t)) return undefined
  const ab = /times equal to your (strength|dexterity|constitution|intelligence|wisdom|charisma) modifier/.exec(t)
  if (ab) return { max: 0, ability: ABIL[ab[1]], reset }
  if (/times equal to your proficiency bonus/.test(t)) return { max: 0, addPb: true, reset }
  const n = /\b(once|twice|two times|three times)\b/.exec(t)
  return { max: n ? ({ once: 1, twice: 2, 'two times': 2, 'three times': 3 })[n[1]] : 1, reset }
}

/* ───────────────────────────── 2014 ───────────────────────────── */
/* ───────── 5etools classes and subclasses (shared by both editions) ───────── */
function classFiles() {
  return fs.readdirSync(path.join(SRC, 'class')).filter(f => /^class-(?!mystic|sidekick).*\.json$/.test(f)).map(f => readJson(path.join(SRC, 'class', f)))
}

/** Parse one subclass, resolving `_copy` entries (2014 subclasses offered for the 2024 class). */
function parseSubclass(d, cls, sub) {
  const subFeatureIndex = new Map((d.subclassFeature || []).map(f => [`${f.name}|${f.className}|${f.classSource || 'PHB'}|${f.subclassShortName}|${f.subclassSource}|${f.level}`.toLowerCase(), f]))
  const lookup = key => subFeatureIndex.get(`${key[0]}|${key[1]}|${key[2] || 'PHB'}|${key[3]}|${key[4] || 'PHB'}|${key[5]}`.toLowerCase())
  let src = sub
  if (sub._copy) {
    const c = sub._copy
    const orig = (d.subclass || []).find(x => x.name === c.name && x.source === c.source && (x.classSource || 'PHB') === (c.classSource || 'PHB') && !x._copy)
    if (!orig) return null
    src = { ...orig, ...Object.fromEntries(Object.entries(sub).filter(([k]) => k !== '_copy')) }
    if (!sub.subclassFeatures) src.subclassFeatures = orig.subclassFeatures
  }
  const feats = []
  for (const ref of src.subclassFeatures || []) {
    const key = String(typeof ref === 'string' ? ref : ref.subclassFeature || '').split('|')
    const level = key[5]
    const f = lookup(key)
    if (!f) continue
    const refs = []
    const description = html(f.entries, refs)
    // The first feature usually just introduces the subclass; keep its text unless it is empty.
    if (textOf(description).trim().length > 0 && !(refs.length && f.name === src.name)) feats.push({ name: f.name, level: Number(level), description, activation: inferActivation(description), uses: inferUses(description) })
    else if (refs.length && f.name === src.name && textOf(description).trim().length > 40) feats.push({ name: `${f.name}`, level: Number(level), description })
    for (const r of refs) {
      const child = lookup(String(r.subclassFeature || r.classFeature || '').split('|'))
      if (!child) continue
      const cd = html(child.entries)
      feats.push({ name: child.name, level: Number(String(r.subclassFeature || '').split('|')[5]) || Number(level), description: cd, activation: inferActivation(cd), uses: inferUses(cd) })
    }
  }
  const list = /^(Arcane Trickster|Eldritch Knight)$/.test(src.name) ? 'Wizard' : cls.name
  return { name: src.name, source: src.source, features: feats, spellcasting: src.spellcastingAbility ? spellcasting5e(src, list) : undefined }
}

function parseClass(d, cls, subFilter) {
  const featureIndex = new Map((d.classFeature || []).map(f => [`${f.name}|${f.className}|${f.level}|${f.source}`.toLowerCase(), f]))
  const columns = []
  for (const g of cls.classTableGroups || []) {
    if (g.title && /spell slots/i.test(g.title)) continue
    ;(g.colLabels || []).forEach((label, i) => {
      const l = strip(label)
      if (/^(cantrips known|spells known|prepared spells|spell slots|slot level|[1-9](st|nd|rd|th))$/i.test(l)) return
      columns.push({ label: l, values: (g.rows || []).map(r => cellText(r[i])) })
    })
  }
  const sc = cls.spellcastingAbility ? spellcasting5e(cls, cls.name) : undefined
  const features = []
  let subclassLevel = 3
  const asiLevels = []
  for (const ref of cls.classFeatures || []) {
    const s = typeof ref === 'string' ? ref : ref.classFeature
    const [name, className, classSource, level, fsrc] = s.split('|')
    const f = featureIndex.get(`${name}|${className}|${level}|${fsrc || classSource || cls.source}`.toLowerCase()) || featureIndex.get(`${name}|${className}|${level}|phb`.toLowerCase())
    if (!f) continue
    if (/^(Ability Score Improvement|Epic Boon)$/i.test(f.name)) { asiLevels.push(Number(level)); if (/^Ability/i.test(f.name)) continue }
    const description = html(f.entries)
    const col = columns.find(c => c.label.toLowerCase() === f.name.toLowerCase() || f.name.toLowerCase().startsWith(c.label.toLowerCase()))
    features.push({ name: f.name, level: Number(level), description, activation: inferActivation(description), uses: inferUses(description), optional: (cls.source !== 'TCE' && fsrc === 'TCE') || f.isClassFeatureVariant || undefined, scaling: col?.values, grants: Number(level) > 1 ? inferGrants(description) : undefined })
  }
  const first = (cls.classFeatures || []).find(r => typeof r === 'object' && r.gainSubclassFeature)
  if (first) subclassLevel = Number(first.classFeature.split('|')[3])
  const subclasses = []
  for (const sub of (d.subclass || []).filter(subFilter)) {
    const parsed = parseSubclass(d, cls, sub)
    if (parsed && !subclasses.some(x => x.name === parsed.name)) subclasses.push(parsed)
  }
  const sp = cls.startingProficiencies || {}
  const skillChoose = (sp.skills || []).find(s => s.choose) || {}
  const anySkill = (sp.skills || []).find(s => s.any)
  const mc = cls.multiclassing || {}
  const mcReq = mc.requirements || {}
  const mcSkills = (mc.proficienciesGained?.skills || []).find(s => s.choose)
  const out = {
    name: cls.name, source: cls.source, hitDie: cls.hd?.faces || 8, saves: cls.proficiency || [],
    armor: (sp.armor || []).map(a => (typeof a === 'string' ? armorName(a) : armorName(a.proficiency || ''))),
    weapons: (sp.weapons || []).map(w => (typeof w === 'string' ? weaponName(w) : weaponName(w.proficiency || ''))),
    tools: (sp.tools || []).map(t => strip(typeof t === 'string' ? t : t.proficiency || '')),
    skillChoices: anySkill ? { count: anySkill.any, from: [] } : { count: skillChoose.choose?.count || 2, from: (skillChoose.choose?.from || []).map(slug) },
    subclassTitle: strip(cls.subclassTitle || 'Subclass'), subclassLevel, asiLevels, features, subclasses,
    spellcasting: sc, columns,
    multiclass: {
      requirements: Object.fromEntries(Object.entries(mcReq).filter(([k]) => ABILS.includes(k))), anyOf: !!mcReq.or,
      armor: (mc.proficienciesGained?.armor || []).map(a => armorName(typeof a === 'string' ? a : a.proficiency || '')),
      weapons: (mc.proficienciesGained?.weapons || []).map(w => weaponName(typeof w === 'string' ? w : w.proficiency || '')),
      tools: (mc.proficienciesGained?.tools || []).map(t => strip(typeof t === 'string' ? t : '')),
      skills: mcSkills ? { count: mcSkills.choose.count || 1, from: (mcSkills.choose.from || []).map(slug) } : undefined,
    },
    expertise: features.filter(f => f.name === 'Expertise').map(f => ({ level: f.level, count: 2 })),
  }
  if (mcReq.or) out.multiclass.requirements = Object.assign({}, ...mcReq.or)
  return out
}

const BOOKS_2014 = new Set(['PHB', 'DMG', 'PSA', 'PSK', 'PSZ', 'PSI', 'PSD', 'TCE', 'ERLW', 'EGW', 'XGE', 'SCAG', 'VGM', 'MPMM', 'EEPC', 'MTF', 'GGR', 'MOT', 'VRGR', 'FTD', 'WBtW', 'SCC', 'AAG', 'BGG', 'TDCSR', 'BMT', 'AI', 'IDRotF', 'LLK', 'SatO', 'AitFR-AVT', 'DSotDQ', 'HWCS', 'GHLoE', 'PSK', 'PSX', 'TCE'])
const BOOKS_2024 = new Set(['XPHB', 'XDMG', 'EFA', 'FRHoF'])

/** 2014 pack from 5etools, plus anything only the older local copy in data/ has (e.g. Critical Role content). */
function build2014() {
  const pack = build2014From()
  if (SRC === dataDir || !fs.existsSync(path.join(dataDir, 'class'))) return pack
  const main = SRC
  SRC = dataDir
  let local
  try { local = build2014From() } catch (e) { console.warn(`Local data/ not merged: ${e.message}`); return pack } finally { SRC = main }
  let added = 0
  for (const lc of local.classes) {
    const c = pack.classes.find(x => x.name === lc.name)
    if (!c) { pack.classes.push(lc); added += 1 + lc.subclasses.length; continue }
    for (const sub of lc.subclasses) if (!c.subclasses.some(x => x.name === sub.name)) { c.subclasses.push(sub); added++ }
  }
  for (const k of ['species', 'backgrounds', 'feats', 'spells']) for (const x of local[k]) if (!pack[k].some(y => y.name === x.name)) { pack[k].push(x); added++ }
  if (added) console.log(`2014: ${added} entries kept from the local data/ folder`)
  return pack
}

function build2014From() {
  const classes = []
  for (const d of classFiles()) {
    const cls = (d.class || []).find(c => ['PHB', 'TCE', 'ERLW', 'EGW'].includes(c.source) && !c.isReprinted && c.edition !== 'one')
    if (!cls) continue
    classes.push(parseClass(d, cls, sub => (sub.classSource || 'PHB') === cls.source && !sub.isReprinted && !sub._copy && sub.edition !== 'one' && BOOKS_2014.has(sub.source)))
  }
  // Species: races + subraces flattened ("Elf (High)").
  const r = readJson(path.join(SRC, 'races.json'))
  const species = []
  const okSources = new Set(['PHB', 'VGM', 'MPMM', 'EEPC', 'MTF', 'ERLW', 'GGR', 'TCE', 'SCAG', 'EGW', 'MOT', 'VRGR', 'FTD', 'WBtW', 'SCC', 'AAG', 'BGG', 'TDCSR'])
  const toSpecies = (base, sub) => {
    const x = sub ? { ...base, ...sub, ability: sub.ability || base.ability, entries: [...(base.entries || []), ...(sub.entries || [])] } : base
    const name = sub && sub.name ? `${base.name} (${sub.name})` : base.name
    const abilityRaw = (sub?.overwrite?.ability ? sub.ability : [...(base.ability || []).map(a => ({ ...a })), ...((sub && sub !== base && sub.ability) || [])]) || []
    const abilities = {}
    const abilityChoice = []
    for (const a of abilityRaw) for (const [k, v] of Object.entries(a || {})) {
      if (ABILS.includes(k)) abilities[k] = (abilities[k] || 0) + v
      else if (k === 'choose') abilityChoice.push({ count: v.count || 1, amount: v.amount || 1, from: v.from })
    }
    if (!abilityRaw.length && !sub) abilityChoice.push({ count: 1, amount: 2 }, { count: 1, amount: 1 })
    const langs = []
    let langChoice = 0
    for (const l of x.languageProficiencies || []) for (const [k, v] of Object.entries(l)) { if (k === 'anyStandard' || k === 'any') langChoice += v; else if (v === true) langs.push(k.replace(/\b\w/g, c => c.toUpperCase())) }
    const skills = []
    let skillChoice
    for (const s of x.skillProficiencies || []) for (const [k, v] of Object.entries(s)) { if (k === 'choose') skillChoice = { count: v.count || 1, from: (v.from || []).map(slug) }; else if (k === 'any') skillChoice = { count: v, from: [] }; else if (v === true) skills.push(slug(k)) }
    const traits = (x.entries || []).filter(e => e && e.name && !/^(Age|Alignment|Size|Speed|Languages|Ability Score Increase|Creature Type)$/i.test(e.name)).map(e => {
      const d = html([{ entries: e.entries }])
      return { name: e.name, description: d, activation: inferActivation(d), uses: inferUses(d) }
    })
    const size = (x.size || ['M']).includes('S') && (x.size || []).includes('M') ? 'small or medium' : (x.size || ['M'])[0] === 'S' ? 'small' : (x.size || ['M'])[0] === 'L' ? 'large' : 'medium'
    const speed = typeof x.speed === 'number' ? { walk: x.speed } : { walk: x.speed?.walk || 30, fly: x.speed?.fly === true ? x.speed?.walk || 30 : x.speed?.fly, swim: x.speed?.swim === true ? x.speed?.walk || 30 : x.speed?.swim, climb: x.speed?.climb === true ? x.speed?.walk || 30 : x.speed?.climb }
    return {
      name, source: x.source, size, speed, darkvision: x.darkvision, abilities: Object.keys(abilities).length ? abilities : undefined,
      abilityChoice: abilityChoice.length ? abilityChoice : undefined, resist: (x.resist || []).filter(v => typeof v === 'string'),
      languages: langs, languageChoice: langChoice || undefined, skills: skills.length ? skills : undefined, skillChoice,
      hpPerLevel: /Dwarven Toughness/.test(JSON.stringify(x.entries || [])) ? 1 : undefined, traits,
      weapons: keysOf(x.weaponProficiencies).map(k => weaponName(k.split('|')[0])),
      armor: keysOf(x.armorProficiencies).map(armorName),
      tools: keysOf(x.toolProficiencies).filter(k => k !== 'any' && k !== 'choose').map(k => k.replace(/\b\w/g, c => c.toUpperCase())),
    }
  }
  for (const base of r.race || []) {
    if (!okSources.has(base.source) || base._copy || base.isReprinted) continue
    const subs = (r.subrace || []).filter(s => s.raceName === base.name && s.raceSource === base.source)
    const named = subs.filter(s => s.name)
    const unnamed = subs.find(s => !s.name)
    // The plain race is playable when it has an unnamed subrace (Tiefling, Human) or no subraces at all.
    if (unnamed || !named.length) species.push(toSpecies(base, unnamed))
    for (const s of named) species.push(toSpecies(base, s))
  }

  const b = readJson(path.join(SRC, 'backgrounds.json'))
  const backgrounds = (b.background || []).filter(x => okSources.has(x.source) && !x._copy).map(x => {
    const skills = []; for (const s of x.skillProficiencies || []) for (const [k, v] of Object.entries(s)) if (v === true) skills.push(slug(k))
    const tools = []; for (const t of x.toolProficiencies || []) for (const [k, v] of Object.entries(t)) if (v === true || typeof v === 'number') tools.push(k.replace(/\b\w/g, c => c.toUpperCase()))
    let languages = 0; for (const l of x.languageProficiencies || []) for (const [k, v] of Object.entries(l)) languages += k.startsWith('any') ? v : 1
    const feat = (x.entries || []).find(e => e && /^Feature:/.test(e.name || ''))
    return { name: x.name, source: x.source, skills, tools, languages, description: html((x.entries || []).filter(e => e !== feat)), feature: feat ? { name: feat.name.replace(/^Feature:\s*/, ''), description: html(feat.entries) } : undefined }
  })

  const feats = parseFeats(x => okSources.has(x.source))
  const spells = parseSpells('2014')
  return { edition: '2014', builtAt: new Date().toISOString(), classes, species, backgrounds, feats, spells }
}

function parseFeats(keep) {
  const f = readJson(path.join(SRC, 'feats.json'))
  return (f.feat || []).filter(x => keep(x) && !x._copy).map(x => {
    const ch = (x.ability || []).find(a => a.choose)
    const fixed = (x.ability || []).find(a => !a.choose && Object.keys(a).some(k => ABILS.includes(k)))
    return {
      name: x.name, source: x.source, description: html(x.entries),
      prerequisite: (x.prerequisite || []).map(p => Object.entries(p).map(([k, v]) => k === 'ability' ? v.map(o => Object.entries(o).map(([a, n]) => `${a.toUpperCase()} ${n}`).join(' or ')).join(', ') : k === 'spellcasting' || k === 'spellcasting2020' ? 'Spellcasting' : k === 'race' ? v.map(r => r.name).join(' or ') : k === 'level' ? `Level ${v.level || v}` : k === 'proficiency' ? v.map(o => Object.keys(o).join(' ')).join(', ') + ' proficiency' : '').filter(Boolean).join('; ')).filter(Boolean).join('; ') || undefined,
      abilityChoice: ch ? { from: ch.choose.from || ABILS, amount: ch.choose.amount || 1 } : fixed ? { from: Object.keys(fixed).filter(k => ABILS.includes(k)), amount: Object.values(fixed)[0] } : undefined,
      origin: x.category === 'O' || undefined, category: x.category || undefined,
    }
  })
}

/** Spells from 5etools for one edition, with class lists from spells/sources.json. */
function parseSpells(edition) {
  const books = edition === '2024' ? BOOKS_2024 : BOOKS_2014
  const sourcesFile = path.join(SRC, 'spells', 'sources.json')
  const lists = fs.existsSync(sourcesFile) ? readJson(sourcesFile) : {}
  const legacy = edition === '2014' && fs.existsSync(path.join(root, 'lib/data/spellLists2014.json')) ? readJson(path.join(root, 'lib/data/spellLists2014.json')) : {}
  const classBook = c => (edition === '2024' ? BOOKS_2024.has(c.source) : !BOOKS_2024.has(c.source) && c.source !== 'WoW') && (!c.definedInSource || books.has(c.definedInSource) || c.definedInSource === 'PHB')
  const out = new Map()
  const files = fs.readdirSync(path.join(SRC, 'spells')).filter(n => /^spells-.*\.json$/.test(n))
  // 2024: the PHB (2024) version wins over a same-named spell from another book.
  files.sort((x, y) => Number(y === 'spells-xphb.json') - Number(x === 'spells-xphb.json'))
  for (const file of files) {
    for (const s of readJson(path.join(SRC, 'spells', file)).spell || []) {
      if (!books.has(s.source) || out.has(s.name.toLowerCase())) continue
      const entry = lists[s.source]?.[s.name] || {}
      const names = new Set([...(entry.class || []), ...(entry.classVariant || [])].filter(classBook).map(c => c.name))
      for (const [k, list] of Object.entries(legacy)) if (list.includes(s.name)) names.add(k.replace(/\b\w/g, c => c.toUpperCase()))
      const classes = [...names]
      const t = (s.time || [])[0] || {}
      const desc = html([...(s.entries || []), ...(s.entriesHigherLevel || [])])
      const dice = /(\d+d\d+)/.exec(textOf(desc))
      const dur = (s.duration || [])[0] || {}
      const range = s.range?.distance ? (s.range.distance.amount ? `${s.range.distance.amount} ${s.range.distance.type === 'feet' ? 'ft' : s.range.distance.type}` : s.range.distance.type.replace(/\b\w/g, c => c.toUpperCase())) : s.range?.type || ''
      const scale = (s.entriesHigherLevel ? /\{@scaledamage ([^|]+)\|(\d+)-\d+\|([^}]+)\}/.exec(JSON.stringify(s.entriesHigherLevel)) : null)
      const sld = Array.isArray(s.scalingLevelDice) ? s.scalingLevelDice[0] : s.scalingLevelDice
      const plainUp = !scale && s.entriesHigherLevel ? /increases by (\d+d\d+) for each slot level above/i.exec(textOf(desc)) : null
      const spell = {
        name: s.name, source: s.source, level: s.level, school: SCHOOLS[s.school] || s.school, classes,
        castingTime: `${t.number || 1} ${t.unit === 'bonus' ? 'bonus action' : t.unit || 'action'}`, activation: t.unit === 'bonus' ? 'bonus' : t.unit === 'reaction' ? 'reaction' : t.unit === 'action' ? 'action' : 'special',
        range, components: [s.components?.v && 'V', s.components?.s && 'S', s.components?.m && `M (${typeof s.components.m === 'string' ? s.components.m : s.components.m.text || ''})`].filter(Boolean).join(', '),
        duration: dur.type === 'instant' ? 'Instantaneous' : dur.type === 'timed' ? `${dur.concentration ? 'Concentration, up to ' : ''}${dur.duration.amount} ${dur.duration.type}${dur.duration.amount > 1 ? 's' : ''}` : dur.type === 'permanent' ? 'Until dispelled' : 'Special',
        concentration: !!dur.concentration, ritual: !!s.meta?.ritual, description: desc,
        dice: sld ? sld.scaling['1'] : dice ? dice[1] : undefined, damageType: (s.damageInflict || [])[0] || (s.miscTags || []).includes('HL') ? (s.damageInflict || [])[0] || 'healing' : undefined,
        save: s.savingThrow ? ABIL[s.savingThrow[0]] : undefined, attack: s.spellAttack ? (s.spellAttack[0] === 'M' ? 'melee' : 'ranged') : undefined,
        scaling: sld ? { kind: 'character', steps: Object.entries(sld.scaling).filter(([l]) => l !== '1').map(([l, d]) => ({ level: Number(l), dice: d })) } : scale ? { kind: 'slot', dice: scale[3], every: 1 } : plainUp ? { kind: 'slot', dice: plainUp[1], every: 1 } : undefined,
      }
      out.set(s.name.toLowerCase(), spell)
    }
  }
  return [...out.values()]
}

function cellText(c) {
  if (c == null) return ''
  if (typeof c === 'string' || typeof c === 'number') return strip(String(c))
  if (c.type === 'dice') return (c.toRoll || []).map(r => `${r.number}d${r.faces}`).join('+')
  if (c.type === 'bonus') return `+${c.value}`
  if (c.type === 'bonusSpeed') return `+${c.value} ft.`
  return strip(c.value ?? '')
}
function keysOf(list) { return (list || []).flatMap(o => Object.entries(o || {}).filter(([, v]) => v === true).map(([k]) => k)) }
function armorName(a) { const s = strip(a).toLowerCase(); return s === 'light' ? 'Light Armor' : s === 'medium' ? 'Medium Armor' : s === 'heavy' ? 'Heavy Armor' : s === 'shield' || s === 'shields' ? 'Shields' : strip(a) }
function weaponName(w) { const s = strip(w); return s === 'simple' ? 'Simple Weapons' : s === 'martial' ? 'Martial Weapons' : s.replace(/s$/, '').replace(/\b\w/g, c => c.toUpperCase()) }
function spellcasting5e(c, list) {
  const prog = { full: 'full', '1/2': 'half', '1/3': 'third', pact: 'pact', artificer: 'artificer' }[c.casterProgression] || 'full'
  const pf = String(c.preparedSpells || '')
  return {
    ability: c.spellcastingAbility, progression: prog, cantrips: c.cantripProgression || Array(20).fill(0),
    known: c.spellsKnownProgression || undefined, prepared: c.preparedSpellsProgression || undefined,
    preparedFormula: pf && !c.preparedSpellsProgression ? (/\/ 2/.test(pf) ? 'half' : 'level') : undefined, list,
  }
}

/* ───────────────────────────── 2024 ───────────────────────────── */
async function vendor(file) {
  const target = path.join(vendorDir, file)
  if (fs.existsSync(target)) return readJson(target)
  if (process.argv.includes('--offline')) throw new Error(`Missing ${target} (offline)`)
  fs.mkdirSync(vendorDir, { recursive: true })
  const url = `https://raw.githubusercontent.com/nick-aschenbach/dnd-data/main/data/${file}`
  process.stdout.write(`Downloading ${url}\n`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  const text = await res.text()
  fs.writeFileSync(target, text)
  return JSON.parse(text)
}
const paraHtml = t => sanitizeHtml(String(t || '').split(/\n{2,}/).map(p => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join(''))
const abilityOf = name => ABIL[String(name).toLowerCase()]
const resetOf = r => (/short/i.test(r) ? 'short' : /long/i.test(r) ? 'long' : /dawn/i.test(r) ? 'dawn' : 'other')

/** 2024 backgrounds from 5etools: ability options, origin feat, skills, tool. */
function backgrounds2024() {
  const title = t => t.replace(/\b\w/g, c => c.toUpperCase())
  return (readJson(path.join(SRC, 'backgrounds.json')).background || []).filter(x => BOOKS_2024.has(x.source) && x.edition === 'one' && !x._copy).map(x => {
    const skills = keysOf(x.skillProficiencies).map(slug)
    const tools = (x.toolProficiencies || []).flatMap(t => Object.entries(t).filter(([k, v]) => v === true && k !== 'any').map(([k]) => title(k)))
    const opts = (x.ability || []).map(a => a.choose?.weighted?.from).find(Boolean) || []
    const featKey = Object.keys((x.feats || [])[0] || {})[0] || ''
    const [featName, featArg] = featKey.split('|')[0].split(';').map(v => v.trim())
    const feat = featName ? `${title(featName)}${featArg ? ` (${title(featArg)})` : ''}` : undefined
    return { name: x.name, source: x.source, skills, tools, languages: 0, abilityOptions: opts, feat, description: html(x.entries) }
  })
}

async function build2024() {
  const classesRaw = await vendor('classes.json')
  const speciesRaw = await vendor('species.json')
  const backgroundsRaw = await vendor('backgrounds.json')
  const spellsRaw = await vendor('spells.json')

  const classes = []
  for (const c of classesRaw.filter(x => x.book === 'Free Basic Rules (2024)' && x.properties?.['data-datarecords'])) {
    const recs = JSON.parse(c.properties['data-datarecords']).map(r => ({ ...r, p: r.payload ? JSON.parse(r.payload) : {} }))
    const byName = new Map(recs.map(r => [r.name, r]))
    const details = recs.find(r => r.p.type === 'Class Details')?.p || {}
    const hd = recs.find(r => r.p.type === 'Hit Dice')?.p.dieSize || 8
    const detailsName = recs.find(r => r.p.type === 'Class Details')?.name
    const base = r => r.parent === detailsName && !/Multiclass/i.test(r.name)
    const saves = recs.filter(r => r.p.type === 'Proficiency' && r.p.category === 'Saving Throw' && base(r)).map(r => abilityOf(r.p.proficiency)).filter(Boolean)
    const profs = cat => recs.filter(r => r.p.type === 'Proficiency' && r.p.category === cat && base(r)).map(r => String(r.p.proficiency).replace(/^Lists:(\w+) Weapons Proficiency$/, 'Martial Weapons (Finesse or Light)'))
    const mcProfs = cat => recs.filter(r => r.p.type === 'Proficiency' && r.p.category === cat && /Multiclass/i.test(r.name)).map(r => String(r.p.proficiency))
    const skillRec = recs.find(r => r.p.type === 'Proficiency Choice' && r.p.subtype === 'Skill' && r.p.proficiencyLevel === 'Proficient' && !/Multiclass/i.test(r.name))
    const mcSkill = recs.find(r => r.p.type === 'Proficiency Choice' && r.p.subtype === 'Skill' && /Multiclass/i.test(r.name))
    // Walk up the parent chain to the feature a record belongs to.
    const featureOf = r => { let cur = r; const seen = new Set(); while (cur && cur.p.type !== 'Features' && cur.parent && !seen.has(cur.name)) { seen.add(cur.name); cur = byName.get(cur.parent) } return cur && cur.p.type === 'Features' ? cur : null }
    const features = []
    const asiLevels = []
    const featMap = new Map()
    for (const r of recs) {
      if (r.p.type !== 'Features') continue
      const lvl = Number(r.level) || 1
      if (/^Ability Score Improvement$/i.test(r.p.name) || /^Epic Boon$/i.test(r.p.name)) asiLevels.push(lvl)
      if (/^Ability Score Improvement$/i.test(r.p.name)) continue
      const f = { name: String(r.p.name).trim(), level: lvl, description: paraHtml(r.p.description) }
      features.push(f); featMap.set(r.name, f)
    }
    // Later "Feat Choice" records under the ASI feature carry the other ASI levels.
    for (const r of recs) if (r.p.type === 'Feat Choice' && /Ability Score|Feat Choice/i.test(r.name) && !asiLevels.includes(Number(r.level))) asiLevels.push(Number(r.level))
    for (const r of recs) {
      const owner = featureOf(r); if (!owner) continue
      const f = featMap.get(owner.name); if (!f) continue
      if (r.p.type === 'Action' && !f.activation) f.activation = /bonus/i.test(r.p.actionType) ? 'bonus' : /reaction/i.test(r.p.actionType) ? 'reaction' : 'action'
      if (r.p.type === 'Resource') {
        const fm = r.p.maxValueFormula || {}
        const rr = r.p.recoveryRate && typeof r.p.recoveryRate === 'object' ? Object.keys(r.p.recoveryRate) : []
        const recovery = r.p.recovery || (rr.includes('Short Rest') && r.p.recoveryRate['Short Rest'].type === 'Full' ? 'Short Rest' : rr.includes('Long Rest') ? 'Long Rest' : '')
        f.uses = { max: fm.flatValue || 0, ability: fm.ability?.ability ? abilityOf(fm.ability.ability) : undefined, addPb: !!fm.proficiency?.add || undefined, reset: resetOf(recovery) }
        f.resourceName = r.p.name
      }
      if (r.p.type === 'Proficiency' && r.p.category === 'Saving Throw' && !base(r)) (f.grants ||= { saves: [] }).saves.push(abilityOf(r.p.proficiency))
    }
    // Resource maximums that grow with level ("Rage 3" … records with calculation Modify).
    for (const f of features) if (f.uses) {
      const key = f.resourceName || f.name
      const own = recs.filter(r => r.p.type === 'modifier' && r.name.startsWith(key) && (r.p.modifications?.maxValue != null || r.p.modifications?.['maxValueFormula.flatValue'] != null)).sort((a, b) => a.level - b.level)
      if (own.length) { const by = Array(20).fill(f.uses.max); for (const r of own) for (let l = Number(r.level); l <= 20; l++) by[l - 1] = Number(r.p.modifications.maxValue ?? r.p.modifications['maxValueFormula.flatValue']); f.uses.byLevel = by }
      delete f.resourceName
    }
    // Dice that grow with level (Sneak Attack, Martial Arts, Bardic Inspiration die …).
    for (const f of features) {
      const mods = recs.filter(r => r.p.type === 'modifier' && r.p.modifications?.diceValue && r.name.startsWith(f.name)).sort((a, b) => a.level - b.level)
      const base = recs.find(r => (r.p.type === 'Effect' || r.p.type === 'Attack' || r.p.type === 'Damage') && featureOf(r)?.p.name === f.name && /\d+d\d+/.test(JSON.stringify(r.p)))
      if (mods.length) {
        const first = base ? (/(\d+d\d+)/.exec(JSON.stringify(base.p)) || [])[1] : undefined
        const by = Array(20).fill(first || '')
        for (const m of mods) for (let l = Number(m.level); l <= 20; l++) by[l - 1] = m.p.modifications.diceValue
        f.scaling = by
      }
    }
    for (const f of features) if (!f.activation) f.activation = inferActivation(f.description)
    for (const f of features) if (!f.uses) f.uses = inferUses(f.description)

    let spellcasting
    const scRec = recs.find(r => r.p.type === 'Spellcasting')
    if (scRec) {
      const cantrips = Array(20).fill(0); const prepared = Array(20).fill(0)
      for (const r of recs.filter(r => r.p.type === 'Spell Choice' && r.p.spellLevel === 0 && !/Multiclass/i.test(r.name))) for (let l = Number(r.level); l <= 20; l++) cantrips[l - 1] += r.p.choices || 0
      for (const r of recs.filter(r => r.p.type === 'Prepared Spell Slot').sort((a, b) => a.level - b.level)) {
        const v = r.p.valueFormula?.flatValue || 0
        for (let l = Number(r.level); l <= 20; l++) prepared[l - 1] = r.p.calculation === 'Set Base' ? v : prepared[l - 1] + v
      }
      const prog = { full: 'full', half: 'half', third: 'third', pact: 'pact' }[String(scRec.p.casterType).toLowerCase()] || (c.name === 'Warlock' ? 'pact' : 'full')
      spellcasting = { ability: abilityOf(scRec.p.ability), progression: prog, cantrips, prepared, list: c.name }
    }
    const reqText = c.properties['filter-Primary Ability'] || ''
    const req = {}
    for (const a of String(reqText).split(/,|or|and/).map(s => abilityOf(s.trim())).filter(Boolean)) req[a] = 13
    classes.push({
      name: c.name, source: 'XPHB', hitDie: hd, saves,
      armor: profs('Armor').map(a => a.replace(/^(Light|Medium|Heavy) Armor$/, '$1 Armor')), weapons: profs('Weapon'), tools: profs('Tool'),
      skillChoices: { count: skillRec?.p.numOfChoices || 2, from: (skillRec?.p.list || []).map(slug) },
      subclassTitle: details.subclassName || 'Subclass', subclassLevel: details.subclassLevel || 3,
      asiLevels: [...new Set(asiLevels)].sort((a, b) => a - b), features: features.sort((a, b) => a.level - b.level), subclasses: [], spellcasting, columns: [],
      multiclass: { requirements: req, anyOf: /\bor\b/.test(String(reqText)), armor: mcProfs('Armor'), weapons: mcProfs('Weapon'), tools: mcProfs('Tool'), skills: mcSkill ? { count: mcSkill.p.numOfChoices || 1, from: (mcSkill.p.list || []).map(slug) } : undefined },
      expertise: recs.filter(r => r.p.type === 'Proficiency Choice' && r.p.proficiencyLevel === 'Expertise').map(r => ({ level: Number(r.level), count: r.p.numOfChoices || 2 })),
    })
  }

  const have5e = SRC !== dataDir
  if (have5e) {
    // Subclasses from 5etools: the 2024 ones, plus 2014 subclasses offered for the 2024 class.
    const files = classFiles()
    for (const c of classes) {
      const d = files.find(f => (f.class || []).some(x => x.name === c.name && x.source === 'XPHB'))
      const cls = d && d.class.find(x => x.name === c.name && x.source === 'XPHB')
      if (!cls) continue
      const subs = (d.subclass || []).filter(sub => sub.classSource === 'XPHB' && (BOOKS_2024.has(sub.source) || BOOKS_2014.has(sub.source)))
      // Prefer the 2024 printing when a subclass exists in both.
      subs.sort((x, y) => Number(y.edition === 'one') - Number(x.edition === 'one'))
      for (const sub of subs) {
        const parsed = parseSubclass(d, cls, sub)
        if (parsed && parsed.features.length && !c.subclasses.some(x => x.name === parsed.name)) c.subclasses.push(parsed)
      }
      c.subclasses.sort((x, y) => Number(BOOKS_2014.has(x.source)) - Number(BOOKS_2014.has(y.source)) || x.name.localeCompare(y.name))
      if (cls.subclassTitle) c.subclassTitle = strip(cls.subclassTitle)
    }
    // Classes outside the free rules (Artificer 2024), parsed from 5etools text.
    for (const d of files) for (const cls of (d.class || []).filter(x => x.edition === 'one' && BOOKS_2024.has(x.source) && x.source !== 'XPHB')) {
      if (classes.some(c => c.name === cls.name)) continue
      classes.push(parseClass(d, cls, sub => sub.classSource === cls.source && BOOKS_2024.has(sub.source)))
    }
  }

  // 2024 species: mechanics entered by hand; description text from the PHB 2024 entries.
  const sp = name => speciesRaw.find(x => x.name === name && x.book === "Player's Handbook (2024)")?.description || ''
  const blurb = name => paraHtml(sp(name).replace(/\s+([A-Z][\w’' ]{2,40})\.\s/g, '\n\n$1. '))
  const t = (name, description, extra = {}) => ({ name, description: `<p>${esc(description)}</p>`, ...extra })
  const species = [
    { name: 'Aasimar', size: 'small or medium', speed: { walk: 30 }, darkvision: 60, resist: ['necrotic', 'radiant'], traits: [t('Celestial Resistance', 'Resistance to Necrotic and Radiant damage.'), t('Healing Hands', 'Magic action: touch a creature and roll d4s equal to your proficiency bonus; it regains that many HP. Once per long rest.', { activation: 'action', uses: { max: 1, reset: 'long' } }), t('Light Bearer', 'You know the Light cantrip (Charisma).'), t('Celestial Revelation', 'At level 3, Bonus Action to transform for 1 minute (Heavenly Wings, Inner Radiance, or Necrotic Shroud). Once per long rest.', { activation: 'bonus', uses: { max: 1, reset: 'long' } })] },
    { name: 'Dragonborn', size: 'medium', speed: { walk: 30 }, darkvision: 60, traits: [t('Draconic Ancestry', 'Your ancestry determines your breath weapon damage and resistance.'), t('Breath Weapon', 'When you take the Attack action, replace one attack with a 15-ft cone or 30-ft line: DEX save (DC 8 + CON mod + PB), 1d10 damage (2d10 at 5, 3d10 at 11, 4d10 at 17). Uses equal to your proficiency bonus per long rest.', { activation: 'action', uses: { max: 0, addPb: true, reset: 'long' } }), t('Damage Resistance', 'Resistance to the damage type of your ancestry.'), t('Draconic Flight', 'At level 5, Bonus Action to sprout wings for 10 minutes (fly speed equal to speed). Once per long rest.', { activation: 'bonus', uses: { max: 1, reset: 'long' } })],
      options: { label: 'Draconic ancestry', choices: [['Black', 'acid'], ['Blue', 'lightning'], ['Brass', 'fire'], ['Bronze', 'lightning'], ['Copper', 'acid'], ['Gold', 'fire'], ['Green', 'poison'], ['Red', 'fire'], ['Silver', 'cold'], ['White', 'cold']].map(([n, d]) => ({ name: n, resist: [d] })) } },
    { name: 'Dwarf', size: 'medium', speed: { walk: 30 }, darkvision: 120, resist: ['poison'], hpPerLevel: 1, traits: [t('Dwarven Resilience', 'Resistance to Poison damage; advantage on saves to avoid or end the Poisoned condition.'), t('Dwarven Toughness', 'Your HP maximum increases by 1, and by 1 again whenever you gain a level.'), t('Stonecunning', 'Bonus Action: gain Tremorsense 60 ft for 10 minutes while on or touching stone. Uses equal to your proficiency bonus per long rest.', { activation: 'bonus', uses: { max: 0, addPb: true, reset: 'long' } })] },
    { name: 'Elf', size: 'medium', speed: { walk: 30 }, darkvision: 60, skillChoice: { count: 1, from: ['insight', 'perception', 'survival'] }, traits: [t('Fey Ancestry', 'Advantage on saves to avoid or end the Charmed condition.'), t('Keen Senses', 'Proficiency in Insight, Perception, or Survival.'), t('Trance', 'You don’t need to sleep; a long rest takes 4 hours of trancelike meditation.'), t('Elven Lineage', 'Drow, High Elf, or Wood Elf lineage grants a cantrip at level 1 and spells at levels 3 and 5.')],
      options: { label: 'Elven lineage', choices: [{ name: 'Drow', description: 'Darkvision 120 ft; Dancing Lights; Faerie Fire (3), Darkness (5).' }, { name: 'High Elf', description: 'Prestidigitation (swap after long rest); Detect Magic (3), Misty Step (5).' }, { name: 'Wood Elf', description: 'Speed 35 ft; Druidcraft; Longstrider (3), Pass without Trace (5).' }] } },
    { name: 'Gnome', size: 'small', speed: { walk: 30 }, darkvision: 60, traits: [t('Gnomish Cunning', 'Advantage on Intelligence, Wisdom, and Charisma saving throws.'), t('Gnomish Lineage', 'Forest Gnome (Minor Illusion, Speak with Animals) or Rock Gnome (Mending, Prestidigitation, clockwork devices).')], options: { label: 'Gnomish lineage', choices: [{ name: 'Forest Gnome' }, { name: 'Rock Gnome' }] } },
    { name: 'Goliath', size: 'medium', speed: { walk: 35 }, traits: [t('Giant Ancestry', 'Choose a supernatural boon (Cloud’s Jaunt, Fire’s Burn, Frost’s Chill, Hill’s Tumble, Stone’s Endurance, Storm’s Thunder). Uses equal to your proficiency bonus per long rest.', { uses: { max: 0, addPb: true, reset: 'long' } }), t('Large Form', 'At level 5, Bonus Action to become Large for 10 minutes (advantage on STR checks, +10 ft speed). Once per long rest.', { activation: 'bonus', uses: { max: 1, reset: 'long' } }), t('Powerful Build', 'Advantage on checks to end the Grappled condition; count as one size larger for carrying capacity.')],
      options: { label: 'Giant ancestry', choices: ['Cloud’s Jaunt', 'Fire’s Burn', 'Frost’s Chill', 'Hill’s Tumble', 'Stone’s Endurance', 'Storm’s Thunder'].map(n => ({ name: n })) } },
    { name: 'Halfling', size: 'small', speed: { walk: 30 }, traits: [t('Brave', 'Advantage on saves to avoid or end the Frightened condition.'), t('Halfling Nimbleness', 'You can move through the space of any creature that is a size larger than you.'), { name: 'Lucky', description: '<p>When you roll a 1 on the d20 of a D20 Test, you can reroll the die, and you must use the new roll.</p>' }, t('Naturally Stealthy', 'You can take the Hide action even when obscured only by a creature at least one size larger than you.')] },
    { name: 'Human', size: 'small or medium', speed: { walk: 30 }, skillChoice: { count: 1, from: [] }, traits: [t('Resourceful', 'You gain Heroic Inspiration whenever you finish a long rest.'), t('Skillful', 'You gain proficiency in one skill of your choice.'), t('Versatile', 'You gain an Origin feat of your choice (Skilled is recommended).')] },
    { name: 'Orc', size: 'medium', speed: { walk: 30 }, darkvision: 120, traits: [t('Adrenaline Rush', 'Take the Dash action as a Bonus Action and gain temporary HP equal to your proficiency bonus. Uses equal to your proficiency bonus per short or long rest.', { activation: 'bonus', uses: { max: 0, addPb: true, reset: 'short' } }), t('Relentless Endurance', 'When reduced to 0 HP but not killed outright, drop to 1 HP instead. Once per long rest.', { uses: { max: 1, reset: 'long' } })] },
    { name: 'Tiefling', size: 'small or medium', speed: { walk: 30 }, darkvision: 60, traits: [t('Fiendish Legacy', 'Abyssal (poison), Chthonic (necrotic), or Infernal (fire): resistance plus a cantrip, with spells at levels 3 and 5.'), t('Otherworldly Presence', 'You know the Thaumaturgy cantrip.')],
      options: { label: 'Fiendish legacy', choices: [{ name: 'Abyssal', resist: ['poison'], description: 'Poison Spray; Ray of Sickness (3), Hold Person (5).' }, { name: 'Chthonic', resist: ['necrotic'], description: 'Chill Touch; False Life (3), Ray of Enfeeblement (5).' }, { name: 'Infernal', resist: ['fire'], description: 'Fire Bolt; Hellish Rebuke (3), Darkness (5).' }] } },
  ].map(s => ({ source: 'XPHB', languages: ['Common'], languageChoice: 2, ...s, traits: s.traits, description: blurb(s.name) }))
  if (have5e) {
    // Full trait text from 5etools in place of the short summaries above.
    const races = readJson(path.join(SRC, 'races.json')).race || []
    for (const sp of species) {
      const r = races.find(x => x.name === sp.name && x.source === 'XPHB')
      for (const e of (r?.entries || []).filter(e => e && e.name)) {
        const t = sp.traits.find(t => t.name.toLowerCase() === strip(e.name).toLowerCase())
        if (t) t.description = html([{ entries: e.entries }])
      }
    }
  }

  if (have5e) {
    const feats = parseFeats(x => BOOKS_2024.has(x.source))
    const backgrounds = backgrounds2024()
    // Use the feat's own spelling ("Mark of Making", "Magic Initiate (Wizard)").
    for (const b of backgrounds) if (b.feat) {
      const [base, arg] = /^(.*?)(?: \((.*)\))?$/.exec(b.feat).slice(1)
      const f = feats.find(x => x.name.toLowerCase() === base.toLowerCase())
      if (f) b.feat = arg ? `${f.name} (${arg})` : f.name
    }
    return { edition: '2024', builtAt: new Date().toISOString(), classes, species, backgrounds, feats, spells: parseSpells('2024') }
  }

  // Fallback without 5etools: parse the fixed "Ability Scores / Feat / Skill Proficiencies / Tool Proficiency" lines.
  const backgrounds = backgroundsRaw.filter(x => x.book === "Player's Handbook (2024)").map(x => {
    const d = x.description
    const grab = re => (re.exec(d) || [])[1]?.trim()
    const abilities = (grab(/Ability Scores:?\s*([A-Za-z, ]+?)\s+Feat:?\s/) || '').split(/,\s*|\s+and\s+/).map(abilityOf).filter(Boolean)
    const feat = grab(/\sFeat:?\s+(.+?)\s+Skill Proficiencies:?\s/)
    const skills = (grab(/Skill Proficiencies:?\s+(.+?)\s+Tool Proficienc(?:y|ies):?\s/) || '').split(/\s+and\s+|,\s*/).map(slug).filter(Boolean)
    const tool = grab(/Tool Proficienc(?:y|ies):?\s+(.+?)\s+Equipment:?\s/)
    return { name: x.name, source: 'XPHB', skills, tools: tool ? [tool] : [], languages: 0, abilityOptions: abilities, feat, description: paraHtml(d.replace(/\s+(Ability Scores|Feat|Skill Proficiencies|Tool Proficiency|Equipment)(?=\s)/g, '\n\n$1:').replace(/^(Ability Scores)/, '$1:')) }
  })

  const feats = [
    ['Alert', 'Add your proficiency bonus to Initiative. After rolling Initiative, you can swap your result with a willing ally’s.'],
    ['Crafter', 'Proficiency with three Artisan’s Tools; 20% discount on nonmagical items; craft faster.'],
    ['Healer', 'Use a Healer’s Kit to let a creature spend a Hit Die; reroll 1s on healing dice.'],
    ['Lucky', 'Luck points equal to your proficiency bonus per long rest: spend one for Advantage on a D20 Test or to impose Disadvantage on an attack against you.'],
    ['Magic Initiate', 'Two cantrips and one level 1 spell from the Cleric, Druid, or Wizard list; cast the level 1 spell once per long rest without a slot.'],
    ['Musician', 'Proficiency with three instruments; after a short or long rest, give Heroic Inspiration to allies who hear you play.'],
    ['Savage Attacker', 'Once per turn when you hit with a weapon, roll the damage dice twice and use either roll.'],
    ['Skilled', 'Proficiency in any combination of three skills or tools.'],
    ['Tavern Brawler', 'Unarmed strikes deal 1d4 + STR; reroll 1s; push 5 ft once per turn; proficiency with improvised weapons.'],
    ['Tough', 'Your Hit Point maximum increases by twice your character level, and by 2 more each level.'],
  ].map(([name, d]) => ({ name, source: 'XPHB', origin: true, description: `<p>${esc(d)}</p>` }))
  feats.push({ name: 'Ability Score Improvement', source: 'XPHB', description: '<p>Increase one ability score by 2, or two ability scores by 1 (maximum 20).</p>' })

  const spells = spellsRaw.filter(x => x.book === "Player's Handbook (2024)").map(x => {
    const p = x.properties
    const d = x.description
    const head = /^(?:Level \d+ \w+|\w+ Cantrip) \(([^)]*)\)\s*Casting Time:\s*(.+?)\s+Range:\s*(.+?)\s+Components:\s*(.+?)\s+Duration:\s*(.+?)\s{1,2}(?=[A-Z])/.exec(d)
    const body = head ? d.slice(head[0].length) : d
    const duration = head ? head[5].trim() : ''
    const dmg = /(\d+d\d+)(?:\s*\+\s*your spellcasting ability modifier)?\s+(\w+)\s+damage/i.exec(body)
    const heal = /regains? (?:a number of )?Hit Points equal to (\d+d\d+)/i.exec(body)
    const up = /increases by (\d+d\d+) for each spell slot level above (\d+)/i.exec(body)
    const cantripUp = /Cantrip Upgrade\..*?levels 5 \((\d+d\d+)\), 11 \((\d+d\d+)\), and 17 \((\d+d\d+)\)/i.exec(body)
    const ct = String(p['Casting Time'] || (head && head[2]) || '')
    return {
      name: x.name, source: 'XPHB', level: Number(p.Level) || 0, school: p.School, classes: head ? head[1].split(/,\s*/) : [],
      castingTime: ct.replace(/^Action$/, '1 action').replace(/^Bonus Action$/, '1 bonus action').replace(/^Reaction.*$/, '1 reaction'),
      activation: /^bonus/i.test(ct) ? 'bonus' : /^reaction/i.test(ct) ? 'reaction' : /^action/i.test(ct) ? 'action' : 'special',
      range: head ? head[3].replace(/feet/, 'ft') : '', components: head ? head[4] : String(p.Components || ''),
      duration, concentration: /^Concentration/i.test(duration), ritual: /Ritual/i.test(d.slice(0, 120)),
      description: paraHtml(body.replace(/\s+(Using a Higher-Level Spell Slot\.|Cantrip Upgrade\.)/g, '\n\n$1')),
      dice: dmg ? dmg[1] : heal ? heal[1] : undefined, damageType: dmg ? dmg[2].toLowerCase() : heal ? 'healing' : undefined,
      save: p.Save ? abilityOf(p.Save) : undefined, attack: /make a melee spell attack/i.test(body) ? 'melee' : /make a ranged spell attack/i.test(body) ? 'ranged' : undefined,
      scaling: cantripUp ? { kind: 'character', steps: [{ level: 5, dice: cantripUp[1] }, { level: 11, dice: cantripUp[2] }, { level: 17, dice: cantripUp[3] }] } : up ? { kind: 'slot', dice: up[1], every: 1 } : undefined,
    }
  })
  return { edition: '2024', builtAt: new Date().toISOString(), classes, species, backgrounds, feats, spells }
}

;(async () => {
  fs.mkdirSync(outDir, { recursive: true })
  if (ensure5etools()) SRC = path.join(fiveDir, 'data')
  else console.warn('5etools data not available; using the local data/ folder (2014 only, no 2024 subclasses).')
  console.log(`Rules text from ${path.relative(root, SRC)}`)
  const p14 = build2014()
  fs.writeFileSync(path.join(outDir, 'rules-2014.json'), JSON.stringify(p14))
  console.log(`2014: ${p14.classes.length} classes (${p14.classes.reduce((t, c) => t + c.subclasses.length, 0)} subclasses), ${p14.species.length} species, ${p14.backgrounds.length} backgrounds, ${p14.feats.length} feats, ${p14.spells.length} spells`)
  try {
    const p24 = await build2024()
    // The 2014 spell-list file is incomplete; borrow class lists from the 2024 reprint of the same spell.
    const lists24 = new Map(p24.spells.map(sp => [sp.name.toLowerCase(), sp.classes]))
    let filled = 0
    for (const sp of p14.spells) if (!sp.classes.length && lists24.has(sp.name.toLowerCase())) { sp.classes = lists24.get(sp.name.toLowerCase()); sp.classListFrom2024 = true; filled++ }
    fs.writeFileSync(path.join(outDir, 'rules-2014.json'), JSON.stringify(p14))
    console.log(`2014: class lists filled from 2024 for ${filled} spells; ${p14.spells.filter(sp => !sp.classes.length).length} still without a list`)
    fs.writeFileSync(path.join(outDir, 'rules-2024.json'), JSON.stringify(p24))
    console.log(`2024: ${p24.classes.length} classes, ${p24.species.length} species, ${p24.backgrounds.length} backgrounds, ${p24.feats.length} feats, ${p24.spells.length} spells`)
  } catch (e) {
    console.error(`2024 pack not built: ${e.message}`)
    process.exitCode = 1
  }
})()
