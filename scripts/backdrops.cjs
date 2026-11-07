#!/usr/bin/env node
// Generates the sheet backdrops (public/backdrops/<theme>.svg): one original fantasy scene per theme.
// Deterministic (seeded), so rerunning gives the same files. Run: node scripts/backdrops.cjs
// The sheet header sits over roughly y 130–250 and cards cover most of the rest, so each scene keeps
// its set piece (castle, dragon, citadel…) in the top band and along the edges.
const fs = require('fs')
const path = require('path')

const W = 1600, H = 640
const OUT = path.join(__dirname, '..', 'public', 'backdrops')

function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const f = n => Math.round(n * 10) / 10

/** A ridge line by smoothed random walk, closed down to the bottom edge. */
function ridge(r, { base, rough, peaks = [], step = 8 }) {
  const n = Math.ceil(W / step) + 1
  const ys = new Array(n).fill(base)
  let y = base
  for (let i = 0; i < n; i++) { y += (r() - 0.5) * rough; y = Math.max(base - rough * 6, Math.min(base + rough * 3, y)); ys[i] = y }
  for (let k = 0; k < 3; k++) for (let i = 1; i < n - 1; i++) ys[i] = (ys[i - 1] + ys[i] * 2 + ys[i + 1]) / 4
  for (const p of peaks) for (let i = 0; i < n; i++) {
    const d = Math.abs(i * step - p.x) / p.w
    if (d < 1) ys[i] = Math.min(ys[i], p.y + (ys[i] - p.y) * Math.pow(d, p.sharp ?? 1.4) + (r() - 0.5) * 3)
  }
  return `M0 ${H} ` + ys.map((v, i) => `L${f(i * step)} ${f(v)}`).join(' ') + ` L${W} ${H} Z`
}

function write(name, body, defs) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice"><defs>${defs}</defs>${body}</svg>\n`
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, `${name}.svg`), svg)
  console.log(`${name}.svg ${(svg.length / 1024).toFixed(1)} KB`)
}

/* ─────────────── shared silhouettes ─────────────── */

/** A dragon in flight, facing left, wings raised; about 300 wide at scale 1, centred on (0,0). */
const DRAGON = [
  'M-118 -30', 'C-112 -36 -104 -40 -96 -40', 'L-90 -52', 'L-86 -40', 'L-80 -54', 'L-76 -38',
  'C-66 -34 -56 -24 -46 -14', 'C-38 -8 -28 -8 -18 -10',
  'C-26 -40 -46 -78 -84 -118', 'C-64 -112 -50 -106 -40 -104', 'C-38 -92 -34 -86 -26 -84', 'C-22 -72 -18 -66 -10 -64', 'C-8 -50 -2 -42 6 -38', 'C4 -28 6 -20 10 -16',
  'C18 -46 34 -84 70 -122', 'C70 -106 74 -96 80 -90', 'C76 -78 78 -70 86 -64', 'C80 -52 82 -44 88 -38', 'C70 -30 50 -20 36 -10',
  'C56 -6 80 0 104 6', 'C130 12 152 10 170 0', 'L184 -8', 'L180 6', 'L192 12', 'L174 12', 'C150 22 120 22 96 18', 'C76 16 58 14 44 12',
  'L48 26', 'L40 36', 'L36 26', 'L28 14', 'C10 16 -6 12 -16 6', 'L-14 20', 'L-22 28', 'L-26 18', 'L-28 4',
  'C-40 -2 -52 -8 -64 -16', 'C-80 -22 -96 -22 -110 -20', 'L-120 -24 Z',
].join(' ')
function dragon(x, y, s, fill, { flip = false, rot = 0, extra = '' } = {}) {
  return `<path transform="translate(${f(x)} ${f(y)}) rotate(${rot}) scale(${flip ? -s : s} ${s})" d="${DRAGON}" fill="${fill}"${extra}/>`
}

/** A castle standing on y=base, centred on x; s=1 is about 300 wide and 240 tall. */
function castle(x, base, s, { fill, win, flags, r, spires, wall = 70 } = {}) {
  const towers = spires ?? [
    { x: -130, w: 30, h: 150 }, { x: -78, w: 24, h: 112 }, { x: -22, w: 40, h: 205 }, { x: 22, w: 30, h: 168 }, { x: 78, w: 26, h: 122 }, { x: 132, w: 32, h: 160 },
  ]
  let g = `<g transform="translate(${f(x)} ${f(base)}) scale(${s})" fill="${fill}">`
  g += `<rect x="-140" y="${-wall}" width="280" height="${wall + 12}"/>`
  for (let cx = -138; cx < 138; cx += 12) g += `<rect x="${cx}" y="${-wall - 8}" width="7" height="9"/>`
  for (const t of towers) {
    g += `<rect x="${t.x - t.w / 2}" y="${-t.h}" width="${t.w}" height="${t.h + 12}"/>`
    if (t.flat) for (let k = 0; k < 3; k++) g += `<rect x="${t.x - t.w / 2 + k * (t.w / 2.5)}" y="${-t.h - 8}" width="${t.w / 5}" height="9"/>`
    else g += `<path d="M${t.x - t.w / 2 - 5} ${-t.h} L${t.x} ${-t.h - t.w * (t.spike ?? 1.5)} L${t.x + t.w / 2 + 5} ${-t.h} Z"/>`
    if (flags && !t.flat) { const top = -t.h - t.w * (t.spike ?? 1.5); g += `<path d="M${t.x} ${top} v-16" stroke="${fill}" stroke-width="1.6"/><path d="M${t.x} ${top - 16} l14 4 l-14 4 Z" fill="${flags}"/>` }
  }
  if (win) g += `<path d="M-14 12 V-22 A14 14 0 0 1 14 -22 V12 Z" fill="${win}" opacity=".6"/>`
  g += `</g>`
  if (win && r) for (const t of towers) for (let k = 0; k < 2 + Math.floor(r() * 2); k++) {
    const wx = x + (t.x + (r() - 0.5) * t.w * 0.4) * s, wy = base + -t.h * (0.25 + r() * 0.6) * s
    g += `<rect x="${f(wx - 2.5 * s)}" y="${f(wy)}" width="${f(5 * s)}" height="${f(9 * s)}" rx="${f(2.5 * s)}" fill="${win}"/>`
  }
  return g
}

const glow = (id, color, a = 0.6) => `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${a}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`
const blur = (id, sd) => `<filter id="${id}" filterUnits="userSpaceOnUse" x="-200" y="-200" width="2000" height="1040"><feGaussianBlur stdDeviation="${sd}"/></filter>`
const stars = (r, n, maxY, color = '#fff') => Array.from({ length: n }, () => `<circle cx="${f(r() * W)}" cy="${f(Math.pow(r(), 1.3) * maxY)}" r="${f(0.4 + Math.pow(r(), 4) * 1.4)}" fill="${color}" opacity="${f(0.25 + r() * 0.7)}"/>`).join('')

/* ───── Ember: a dragon over a black fortress, a volcano and a river of lava ───── */
function ember() {
  const r = rng(7)
  const defs = `
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140906"/><stop offset=".35" stop-color="#3a120a"/><stop offset=".6" stop-color="#8a3010"/><stop offset=".78" stop-color="#c4561c"/><stop offset="1" stop-color="#5a1e0c"/></linearGradient>
<radialGradient id="vglow" cx="1200" cy="330" r="560" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff8a2a" stop-opacity=".6"/><stop offset=".45" stop-color="#e2541c" stop-opacity=".2"/><stop offset="1" stop-color="#e2541c" stop-opacity="0"/></radialGradient>
<linearGradient id="lava" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff6a1a"/><stop offset=".5" stop-color="#ffc25a"/><stop offset="1" stop-color="#ff6a1a"/></linearGradient>
${glow('win', '#ff7a2a', 0.8)}${blur('b4', 4)}${blur('b10', 10)}${blur('b28', 28)}`
  let s = `<rect width="${W}" height="${H}" fill="url(#sky)"/><rect width="${W}" height="${H}" fill="url(#vglow)"/>`
  // smoke columns rising from the volcano across the top
  for (let i = 0; i < 16; i++) { const t = i / 15; s += `<ellipse cx="${f(1200 - t * 700 + (r() - 0.5) * 80)}" cy="${f(250 - t * 230 + (r() - 0.5) * 30)}" rx="${f(60 + t * 200)}" ry="${f(30 + t * 60)}" fill="#2a120c" opacity="${f(0.65 - t * 0.35)}" filter="url(#b28)"/>` }
  s += `<path d="${ridge(r, { base: 400, rough: 10, peaks: [{ x: 620, y: 330, w: 200 }, { x: 1520, y: 320, w: 220 }] })}" fill="#4d1d0f" opacity=".85"/>`
  // the volcano
  s += `<path d="M900 ${H} L1010 420 Q1100 330 1166 262 L1182 274 L1198 258 L1216 270 L1230 256 Q1300 330 1400 420 L1520 ${H} Z" fill="#2a120a"/>`
  s += `<ellipse cx="1198" cy="262" rx="64" ry="22" fill="#ff8a2a" opacity=".75" filter="url(#b10)"/>`
  for (const [x1, x2, len] of [[1186, 1150, 140], [1208, 1236, 170], [1198, 1186, 80]]) s += `<path d="M${x1} 266 Q${(x1 + x2) / 2 + 10} ${266 + len / 2} ${x2} ${266 + len}" stroke="#ffb24a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M${x1} 266 Q${(x1 + x2) / 2 + 10} ${266 + len / 2} ${x2} ${266 + len}" stroke="#ff7a22" stroke-width="12" fill="none" opacity=".4" filter="url(#b10)"/>`
  // the crag and the black fortress
  s += `<path d="M60 ${H} L110 430 L170 340 L196 312 L524 306 L556 336 L620 430 L690 ${H} Z" fill="#1f100a"/>`
  s += castle(360, 304, 1.15, { fill: '#170b07', win: '#ff8a3a', flags: '#b3261e', r, spires: [
    { x: -130, w: 30, h: 150, spike: 2.2 }, { x: -78, w: 24, h: 110, flat: true }, { x: -22, w: 42, h: 220, spike: 2.4 }, { x: 24, w: 30, h: 172, spike: 2.2 }, { x: 80, w: 26, h: 120, flat: true }, { x: 132, w: 32, h: 160, spike: 2.2 },
  ] })
  s += `<ellipse cx="360" cy="140" rx="200" ry="150" fill="url(#win)" opacity=".18"/>`
  // the dragons, rim-lit by the fire
  s += dragon(870, 130, 1.35, 'none', { rot: -6, extra: ' stroke="#ff8a3a" stroke-width="6" opacity=".55" filter="url(#b4)"' })
  s += dragon(870, 130, 1.35, '#120806', { rot: -6 })
  s += dragon(1420, 70, 0.42, '#1a0b07', { flip: true, rot: 8 })
  // lava river through the foreground
  s += `<path d="${ridge(r, { base: 500, rough: 10, peaks: [{ x: 60, y: 440, w: 160 }] })}" fill="#1f100a"/>`
  const river = 'M-20 600 C200 560 360 610 560 570 S900 540 1100 580 S1400 620 1620 560'
  s += `<path d="${river}" stroke="#ff6a1a" stroke-width="40" fill="none" opacity=".5" filter="url(#b10)"/><path d="${river}" stroke="url(#lava)" stroke-width="12" fill="none"/>`
  s += `<path d="${ridge(r, { base: 630, rough: 5 })}" fill="#13110e"/>`
  for (let i = 0; i < 150; i++) { const rad = 0.7 + Math.pow(r(), 3) * 2.6; s += `<circle cx="${f(r() * W)}" cy="${f(20 + r() * 560)}" r="${f(rad)}" fill="${r() > 0.6 ? '#ffd27a' : '#ff8a3a'}" opacity="${f(0.35 + r() * 0.6)}"/>` }
  write('ember', s, defs)
}

/* ───── Arcane: a citadel on a floating island inside a vast rune circle ───── */
function arcane() {
  const r = rng(42)
  const defs = `
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#04060e"/><stop offset=".5" stop-color="#101838"/><stop offset=".85" stop-color="#232c64"/><stop offset="1" stop-color="#0d1120"/></linearGradient>
<linearGradient id="aur" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4fe0c0" stop-opacity="0"/><stop offset=".3" stop-color="#4fe0c0"/><stop offset=".65" stop-color="#8a7bff"/><stop offset="1" stop-color="#c58bff" stop-opacity="0"/></linearGradient>
<linearGradient id="beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#cfd8ff" stop-opacity=".9"/><stop offset="1" stop-color="#8a9bff" stop-opacity="0"/></linearGradient>
<linearGradient id="rock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3263"/><stop offset="1" stop-color="#0f1430"/></linearGradient>
${glow('orb', '#c9d4ff', 0.9)}${glow('moonGlow', '#cdd8ff', 0.45)}${glow('crys', '#8fe8ff', 0.8)}
<mask id="crescent"><rect width="${W}" height="${H}" fill="#000"/><circle cx="1400" cy="96" r="44" fill="#fff"/><circle cx="1420" cy="82" r="40" fill="#000"/></mask>
${blur('b3', 3)}${blur('b30', 30)}`
  let s = `<rect width="${W}" height="${H}" fill="url(#sky)"/>` + stars(r, 380, 460)
  for (const [y0, amp, wdt, op] of [[110, 40, 70, 0.3], [170, 55, 50, 0.22]]) {
    let d = `M-100 ${y0}`
    for (let x = -100; x <= W + 100; x += 200) d += ` Q${x + 100} ${f(y0 + (r() - 0.5) * amp * 2)} ${x + 200} ${f(y0 + (r() - 0.5) * amp)}`
    s += `<path d="${d}" stroke="url(#aur)" stroke-width="${wdt}" fill="none" opacity="${op}" filter="url(#b30)"/>`
  }
  s += `<circle cx="1400" cy="96" r="130" fill="url(#moonGlow)"/><rect width="${W}" height="${H}" fill="#e9ecf8" mask="url(#crescent)"/>`
  // the rune circle
  const cx = 800, cy = 190
  let rc = `<g stroke="#a3b5ff" fill="none" opacity=".5"><circle cx="${cx}" cy="${cy}" r="230" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="214" stroke-width="1"/><circle cx="${cx}" cy="${cy}" r="150" stroke-width="1.5"/>`
  const pts = Array.from({ length: 7 }, (_, k) => [cx + Math.cos(-Math.PI / 2 + k * 2 * Math.PI / 7) * 214, cy + Math.sin(-Math.PI / 2 + k * 2 * Math.PI / 7) * 214])
  rc += `<path d="M${pts.map((_, k) => pts[(k * 3) % 7].map(f).join(' ')).join(' L')} Z" stroke-width="1.2"/>`
  for (let k = 0; k < 28; k++) { const a = k * 2 * Math.PI / 28, x = cx + Math.cos(a) * 222, y = cy + Math.sin(a) * 222; rc += `<path transform="translate(${f(x)} ${f(y)}) rotate(${f(a * 180 / Math.PI + 90)})" d="M-4 -4 L0 4 L4 -4 M0 -5 V0" stroke-width="1.2"/>` }
  rc += `</g>`
  s += `<g filter="url(#b3)" opacity=".9">${rc}</g>${rc}`
  // the floating island
  const isl = 'M560 300 L600 286 L680 292 L760 282 L860 290 L960 284 L1040 296 L1010 330 L980 360 L930 380 L890 420 L850 440 L820 500 L800 520 L780 470 L740 430 L690 400 L640 370 L600 336 Z'
  s += `<path d="${isl}" fill="url(#rock)"/>`
  for (const [x, y, k] of [[700, 380, 10], [860, 410, 12], [800, 470, 9], [930, 360, 8]]) s += `<circle cx="${x}" cy="${y + k}" r="${k * 3}" fill="url(#crys)"/><path d="M${x} ${y} l${k * 0.5} ${k * 1.4} l${-k * 0.5} ${k * 1.4} l${-k * 0.5} ${-k * 1.4} Z" fill="#c9f2ff" opacity=".9"/>`
  for (let i = 0; i < 9; i++) { const x = 620 + r() * 380; s += `<path d="M${f(x)} ${f(300 + r() * 40)} q${f((r() - 0.5) * 20)} 40 ${f((r() - 0.5) * 16)} ${f(50 + r() * 60)}" stroke="#2a3263" stroke-width="2" fill="none"/>` }
  // the citadel
  s += `<rect x="794" y="-40" width="12" height="80" fill="url(#beam)" transform="rotate(0)"/><rect x="785" y="-40" width="30" height="70" fill="url(#beam)" opacity=".35"/>`
  s += castle(800, 296, 0.82, { fill: '#121735', win: '#ffd98a', r, spires: [
    { x: -120, w: 26, h: 130, spike: 2 }, { x: -70, w: 22, h: 100, spike: 2 }, { x: 0, w: 34, h: 250, spike: 2.6 }, { x: 50, w: 26, h: 160, spike: 2.2 }, { x: 100, w: 22, h: 110, spike: 2 }, { x: 132, w: 24, h: 140, spike: 2 },
  ] })
  s += `<circle cx="800" cy="${f(296 - (250 + 34 * 2.6) * 0.82 - 4)}" r="26" fill="url(#orb)"/>`
  // small floating rocks
  for (const [x, y, k] of [[360, 210, 1], [1230, 250, 0.8], [470, 120, 0.5], [1110, 110, 0.55]]) s += `<path transform="translate(${x} ${y}) scale(${k})" d="M-60 0 L-30 -10 L20 -6 L60 0 L30 30 L0 70 L-20 30 Z" fill="url(#rock)"/><circle cx="${x}" cy="${y - 14 * k}" r="${18 * k}" fill="url(#crys)"/><path transform="translate(${x} ${y - 6 * k}) scale(${k})" d="M0 -26 L8 0 L0 4 L-8 0 Z" fill="#c9f2ff"/>`
  s += `<path d="${ridge(r, { base: 520, rough: 10, peaks: [{ x: 200, y: 430, w: 220 }, { x: 1400, y: 440, w: 240 }] })}" fill="#151b3c"/>`
  s += `<path d="${ridge(r, { base: 610, rough: 6 })}" fill="#0d1120"/>`
  write('arcane', s, defs)
}

/* ───── Frost: an ice citadel on the summit, a white dragon, aurora over the peaks ───── */
function frost() {
  const r = rng(2718)
  const defs = `
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#06101a"/><stop offset=".35" stop-color="#12304a"/><stop offset=".58" stop-color="#3f7896"/><stop offset=".7" stop-color="#9fc9d8"/><stop offset="1" stop-color="#0c151b"/></linearGradient>
<linearGradient id="aur" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5fffc0" stop-opacity="0"/><stop offset=".4" stop-color="#5fffc0"/><stop offset=".8" stop-color="#5fc8ff"/><stop offset="1" stop-color="#5fc8ff" stop-opacity="0"/></linearGradient>
<linearGradient id="ice" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d8eef6"/><stop offset=".5" stop-color="#9cc6d8"/><stop offset="1" stop-color="#5f8fa6"/></linearGradient>
${glow('cwin', '#9ff0ff', 0.9)}${blur('b30', 30)}${blur('soft', 1.2)}`
  let s = `<rect width="${W}" height="${H}" fill="url(#sky)"/>` + stars(r, 160, 260)
  for (const [y0, wdt, op] of [[70, 80, 0.4], [130, 40, 0.3]]) {
    let d = `M-100 ${y0}`
    for (let x = -100; x <= W + 100; x += 220) d += ` Q${x + 110} ${f(y0 + (r() - 0.5) * 90)} ${x + 220} ${f(y0 + (r() - 0.5) * 40)}`
    s += `<path d="${d}" stroke="url(#aur)" stroke-width="${wdt}" fill="none" opacity="${op}" filter="url(#b30)"/>`
  }
  const peak = (x, base, h, lw, rw, rock, snow) => {
    const ty = base - h
    const edge = (dir, w) => [0.15, 0.3, 0.5, 0.7, 0.85].map(t => [x + dir * w * t + (r() - 0.5) * 16, ty + h * t + (r() - 0.5) * 12])
    const L = edge(-1, lw), R = edge(1, rw)
    const pts = [[x - lw, base], ...L.slice().reverse(), [x, ty], ...R, [x + rw, base]]
    let g = `<path d="M${pts.map(p => `${f(p[0])} ${f(p[1])}`).join(' L')} Z" fill="${rock}"/>`
    let cap = `M${f(L[1][0])} ${f(L[1][1])} L${f(L[0][0])} ${f(L[0][1])} L${x} ${ty} L${f(R[0][0])} ${f(R[0][1])} L${f(R[1][0])} ${f(R[1][1])}`
    for (let k = 1; k < 6; k++) { const t = k / 6; cap += ` L${f(R[1][0] + (L[1][0] - R[1][0]) * t)} ${f(R[1][1] + (L[1][1] - R[1][1]) * t + (k % 2 ? -h * 0.05 : h * 0.05))}` }
    return g + `<path d="${cap} Z" fill="${snow}"/><path d="M${x} ${ty} L${f(x + rw * 0.18)} ${f(ty + h * 0.5)} L${f(x + rw * 0.1)} ${base} L${f(x + rw)} ${base} Z" fill="#000" opacity=".2"/>`
  }
  for (const [x, h, lw, rw] of [[140, 230, 220, 200], [460, 200, 200, 230], [1150, 210, 220, 200], [1480, 250, 200, 220]]) s += peak(x, 440, h, lw, rw, '#3d6275', '#dcebf0')
  // the summit and the ice citadel
  s += peak(800, 470, 250, 330, 330, '#2f5164', '#e6f3f8')
  s += `<path d="M650 236 L950 236 L1000 290 L1040 330 L1060 380 L1130 470 L470 470 L530 390 L560 330 L600 290 Z" fill="#2f5164"/><path d="M800 236 L950 236 L1000 290 L1040 330 L1060 380 L1130 470 L860 470 Z" fill="#000" opacity=".18"/><path d="M660 236 L940 236 L980 268 L900 262 L820 276 L740 262 L620 270 Z" fill="#e6f3f8"/>`
  s += `<ellipse cx="800" cy="130" rx="190" ry="110" fill="url(#cwin)" opacity=".25"/>`
  s += castle(800, 236, 0.9, { fill: 'url(#ice)', win: '#bff6ff', r, spires: [
    { x: -128, w: 22, h: 120, spike: 3 }, { x: -80, w: 18, h: 90, spike: 3 }, { x: -26, w: 30, h: 200, spike: 3.4 }, { x: 22, w: 24, h: 160, spike: 3.2 }, { x: 78, w: 18, h: 100, spike: 3 }, { x: 128, w: 22, h: 130, spike: 3 },
  ] })
  // the white dragon
  s += dragon(330, 120, 0.95, '#e8f4f8', { rot: -10 }) + dragon(330, 120, 0.95, 'none', { rot: -10, extra: ' stroke="#7fb2c6" stroke-width="2"' })
  s += dragon(1290, 70, 0.38, '#c8e0ea', { flip: true, rot: 6 })
  s += `<path d="${ridge(r, { base: 540, rough: 6 })}" fill="#1c3442"/>`
  const pine = (x, base, h, c) => {
    let g = `<rect x="${f(x - h * 0.03)}" y="${f(base - h * 0.15)}" width="${f(h * 0.06)}" height="${f(h * 0.15)}" fill="${c}"/>`
    for (let k = 0; k < 4; k++) { const t = k / 4, w = h * (0.32 - t * 0.06), y0 = base - h * 0.12 - t * h * 0.24; g += `<path d="M${f(x - w)} ${f(y0)} L${f(x)} ${f(y0 - h * 0.42)} L${f(x + w)} ${f(y0)} Z" fill="${c}"/>` }
    return g
  }
  for (let i = 0; i < 30; i++) s += pine(r() * W, 560 + r() * 10, 60 + r() * 50, '#14262f')
  for (let i = 0; i < 22; i++) s += pine(r() * W, 640, 90 + r() * 70, '#0c151b')
  s += `<path d="${ridge(r, { base: 628, rough: 3 })}" fill="#0c151b"/>`
  for (let i = 0; i < 150; i++) { const k = 0.8 + Math.pow(r(), 3) * 2.4; s += `<circle cx="${f(r() * W)}" cy="${f(r() * 600)}" r="${f(k)}" fill="#f4fbff" opacity="${f(0.35 + r() * 0.5)}"${k > 2 ? ' filter="url(#soft)"' : ''}/>` }
  write('frost', s, defs)
}

/* ───── Verdant: an elven city in an ancient tree, rope bridges, a fey portal in a stone ring ───── */
function verdant() {
  const r = rng(314)
  const defs = `
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050b08"/><stop offset=".55" stop-color="#10261c"/><stop offset="1" stop-color="#0d1510"/></linearGradient>
${glow('moon', '#e6f5d8', 0.6)}${glow('fly', '#d9ff8a', 0.9)}${glow('lamp', '#ffd27a', 0.9)}${glow('portal', '#7ff0e0', 0.85)}${glow('feyglow', '#5fd39a', 0.3)}`
  let s = `<rect width="${W}" height="${H}" fill="url(#sky)"/><circle cx="1350" cy="100" r="150" fill="url(#moon)"/><circle cx="1350" cy="100" r="40" fill="#eef8e2" opacity=".92"/>`
  const forest = (base, size, color, n, clearing) => {
    let g = `<g fill="${color}">`
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * (W + 100) - 50 + (r() - 0.5) * 40, h = size * (0.8 + r() * 0.6)
      if (clearing && x > clearing[0] && x < clearing[1]) continue
      g += `<rect x="${f(x - size * 0.06)}" y="${f(base - h)}" width="${f(size * 0.12)}" height="${f(h + 40)}"/>`
      for (let k = 0; k < 4; k++) g += `<circle cx="${f(x + (r() - 0.5) * size * 0.7)}" cy="${f(base - h - r() * size * 0.4)}" r="${f(size * (0.3 + r() * 0.25))}"/>`
    }
    return g + `<rect x="0" y="${base}" width="${W}" height="${H - base}"/></g>`
  }
  s += forest(330, 90, '#183324', 22)
  s += `<ellipse cx="800" cy="220" rx="460" ry="260" fill="url(#feyglow)"/>`
  // the great tree: trunk, branches, a crown
  s += `<g fill="#0e1f16"><path d="M720 640 C735 540 755 440 760 330 C700 300 640 260 590 210 C660 240 720 270 768 280 C768 230 752 170 720 120 C790 160 812 230 814 280 C846 220 900 170 980 140 C900 200 860 260 850 320 C858 440 880 540 900 640 Z"/>`
  for (const [x, y, rad] of [[690, 70, 110], [820, 30, 130], [960, 80, 110], [600, 140, 80], [1040, 150, 80], [800, 110, 120], [560, 200, 60], [1080, 220, 60]]) s += `<circle cx="${x}" cy="${y}" r="${rad}"/>`
  s += `</g>`
  // elven houses and towers on the branches
  const house = (x, y, w, h) => `<rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" fill="#1b3527"/><path d="M${x - w / 2 - 6} ${y - h} L${x} ${y - h - w * 1.3} L${x + w / 2 + 6} ${y - h} Z" fill="#2c5a3c"/><rect x="${x - w / 2 - 10}" y="${y}" width="${w + 20}" height="4" fill="#1b3527"/><rect x="${x - 3}" y="${y - h * 0.65}" width="6" height="10" rx="3" fill="#ffd27a"/><circle cx="${x}" cy="${y - h * 0.6}" r="16" fill="url(#lamp)" opacity=".6"/>`
  for (const [x, y, w, h] of [[640, 210, 22, 30], [700, 150, 26, 40], [800, 120, 30, 56], [880, 170, 24, 36], [960, 140, 22, 32], [760, 250, 20, 26], [850, 240, 22, 28], [1010, 230, 18, 24], [590, 260, 18, 22]]) s += house(x, y, w, h)
  // rope bridges to the side trees, hung with lanterns
  const bridge = (x1, y1, x2, y2, sag) => {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + sag
    let g = `<path d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}" stroke="#3e6b4a" stroke-width="2" fill="none"/><path d="M${x1} ${y1 - 10} Q${mx} ${my - 10} ${x2} ${y2 - 10}" stroke="#3e6b4a" stroke-width="1" fill="none" opacity=".7"/>`
    for (let k = 1; k < 6; k++) { const t = k / 6, x = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * mx + t * t * x2, y = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * my + t * t * y2; g += `<circle cx="${f(x)}" cy="${f(y + 6)}" r="10" fill="url(#lamp)"/><circle cx="${f(x)}" cy="${f(y + 6)}" r="2" fill="#ffe9b0"/>` }
    return g
  }
  s += bridge(560, 230, 330, 210, 40) + bridge(1060, 230, 1300, 200, 40) + bridge(620, 280, 420, 300, 30) + bridge(1000, 270, 1210, 290, 30)
  for (const [x, y, w, h] of [[330, 210, 20, 30], [1300, 200, 22, 34], [420, 300, 18, 24], [1210, 290, 18, 24]]) s += house(x, y, w, h)
  s += forest(560, 100, '#0d1a13', 14, [480, 1120])
  // the fey ring: standing stones around a glowing portal
  s += `<ellipse cx="800" cy="560" rx="90" ry="120" fill="url(#portal)"/><ellipse cx="800" cy="560" rx="46" ry="74" fill="none" stroke="#b9fff2" stroke-width="3" opacity=".8"/>`
  for (const [x, h] of [[690, 110], [740, 80], [860, 84], [910, 112]]) s += `<path d="M${x - 16} 620 L${x - 12} ${620 - h} L${x + 10} ${620 - h - 6} L${x + 16} 620 Z" fill="#132a1e"/>`
  s += `<path d="M680 ${620 - 120} L920 ${620 - 124} L920 ${620 - 106} L680 ${620 - 102} Z" fill="#132a1e"/>`
  for (let i = 0; i < 30; i++) { const k = 4 + r() * 9; s += `<circle cx="${f(r() * W)}" cy="${f(60 + r() * 520)}" r="${f(k)}" fill="url(#fly)" opacity="${f(0.5 + r() * 0.5)}"/>` }
  s += `<path d="${ridge(r, { base: 628, rough: 4 })}" fill="#0d1510"/>`
  write('verdant', s, defs)
}

/* ───── Papyrus: a desert tomb, a pyramid with a glowing eye, a purple worm breaching the dunes ───── */
function papyrus() {
  const r = rng(99)
  const ink = '#4a3220'
  const defs = `
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9d6ae" stop-opacity=".55"/><stop offset=".6" stop-color="#e3c48a" stop-opacity=".6"/><stop offset="1" stop-color="#f2ece0" stop-opacity="0"/></linearGradient>
${glow('sun', '#e9a94a', 0.8)}${glow('rune', '#e6703a', 0.9)}
<filter id="wash" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves="3" seed="4"/><feDisplacementMap in="SourceGraphic" scale="12"/><feGaussianBlur stdDeviation="1"/></filter>`
  let s = `<rect width="${W}" height="${H}" fill="url(#sky)"/><circle cx="1240" cy="120" r="150" fill="url(#sun)"/><circle cx="1240" cy="120" r="54" fill="#e7a548" opacity=".55" filter="url(#wash)"/>`
  // the great pyramid with a glowing eye at its capstone
  const px = 1080, pw = 280, ph = 300, py = 400
  s += `<path d="M${px - pw} ${py} L${px} ${py - ph} L${px + pw} ${py} Z" fill="#e2c089" filter="url(#wash)"/><path d="M${px} ${py - ph} L${px + pw} ${py} L${px + pw * 0.2} ${py} Z" fill="#b88d55" opacity=".6" filter="url(#wash)"/>`
  for (let k = 1; k < 9; k++) { const t = k / 9; s += `<path d="M${f(px - pw * t)} ${f(py - ph + ph * t)} L${f(px + pw * t)} ${f(py - ph + ph * t)}" stroke="${ink}" stroke-width=".7" opacity=".3"/>` }
  s += `<path d="M${px - pw} ${py} L${px} ${py - ph} L${px + pw} ${py}" fill="none" stroke="${ink}" stroke-width="1.8" opacity=".6"/>`
  s += `<circle cx="${px}" cy="${py - ph + 40}" r="40" fill="url(#rune)"/><path d="M${px - 16} ${py - ph + 40} Q${px} ${py - ph + 28} ${px + 16} ${py - ph + 40} Q${px} ${py - ph + 52} ${px - 16} ${py - ph + 40} Z" fill="#fff1d0" stroke="${ink}" stroke-width="1.4"/><circle cx="${px}" cy="${py - ph + 40}" r="4.5" fill="${ink}"/>`
  // cliff with a carved tomb façade on the left
  s += `<path d="M0 60 L120 70 L180 110 L260 120 L300 180 L330 400 L0 420 Z" fill="#d4b47e" filter="url(#wash)"/><path d="M0 60 L120 70 L180 110 L260 120 L300 180 L330 400" fill="none" stroke="${ink}" stroke-width="1.6" opacity=".55"/>`
  s += `<g stroke="${ink}" stroke-width="1.4" opacity=".75" fill="none"><path d="M70 330 V190 L170 150 L270 190 V330"/><path d="M60 196 L170 146 L280 196"/>`
  for (const x of [90, 130, 210, 250]) s += `<path d="M${x} 330 V206 M${x - 8} 206 H${x + 8} M${x - 8} 330 H${x + 8}"/>`
  s += `</g><path d="M146 330 V250 A24 24 0 0 1 194 250 V330 Z" fill="#3a2414" opacity=".85"/><circle cx="170" cy="270" r="44" fill="url(#rune)" opacity=".7"/>`
  for (const [x, y] of [[158, 262], [182, 262], [170, 290], [170, 236]]) s += `<path d="M${x - 4} ${y} L${x} ${y - 6} L${x + 4} ${y} L${x} ${y + 6} Z" fill="#ffb36b"/>`
  s += `<path d="M110 176 L230 176" stroke="${ink}" stroke-width="1"/><text x="170" y="172" text-anchor="middle" font-family="Georgia, serif" font-size="11" letter-spacing="4" fill="${ink}" opacity=".7">ᚦ ᛟ ᛗ ᛒ</text>`
  // the dunes
  s += `<path d="${ridge(r, { base: 410, rough: 4, step: 20 })}" fill="#d9bd85" opacity=".7" filter="url(#wash)"/>`
  // the purple worm, breaching in an arc
  const worm = 'M480 420 C470 300 520 200 620 170 C690 150 750 180 762 236'
  s += `<path d="${worm}" stroke="#6c4a86" stroke-width="58" fill="none" stroke-linecap="round" opacity=".75" filter="url(#wash)"/><path d="${worm}" stroke="${ink}" stroke-width="56" fill="none" stroke-linecap="round" opacity=".18"/>`
  for (const t of [0.12, 0.24, 0.36, 0.48, 0.6, 0.72]) {
    // segment rings, drawn as short strokes across the body
    const P = [[480, 420], [470, 300], [520, 200], [620, 170]], Q = [[620, 170], [690, 150], [740, 190], [760, 250]]
    const bz = (p, u) => [0, 1].map(i => (1 - u) ** 3 * p[0][i] + 3 * (1 - u) ** 2 * u * p[1][i] + 3 * (1 - u) * u * u * p[2][i] + u ** 3 * p[3][i])
    const u = t * 2, p = u <= 1 ? bz(P, u) : bz(Q, u - 1), p2 = u <= 1 ? bz(P, Math.min(1, u + 0.02)) : bz(Q, Math.min(1, u - 1 + 0.02))
    const a = Math.atan2(p2[1] - p[1], p2[0] - p[0]) + Math.PI / 2
    s += `<path d="M${f(p[0] - Math.cos(a) * 26)} ${f(p[1] - Math.sin(a) * 26)} L${f(p[0] + Math.cos(a) * 26)} ${f(p[1] + Math.sin(a) * 26)}" stroke="${ink}" stroke-width="1.6" opacity=".55"/>`
  }
  // the head flares into a round maw ringed with teeth, tilted toward the viewer
  s += `<path d="M732 236 L792 236 L812 300 L712 300 Z" fill="#6c4a86" opacity=".85" filter="url(#wash)"/><path d="M732 236 L712 300 M792 236 L812 300" stroke="${ink}" stroke-width="1.6" opacity=".6"/>`
  s += `<ellipse cx="762" cy="302" rx="52" ry="22" fill="#3a2016"/><ellipse cx="762" cy="302" rx="52" ry="22" fill="none" stroke="${ink}" stroke-width="2.2"/>`
  for (let k = 0; k < 18; k++) { const a = k * Math.PI / 9; s += `<path d="M${f(762 + Math.cos(a) * 50)} ${f(302 + Math.sin(a) * 20)} L${f(762 + Math.cos(a + 0.08) * 34)} ${f(302 + Math.sin(a + 0.08) * 12)} L${f(762 + Math.cos(a + 0.18) * 50)} ${f(302 + Math.sin(a + 0.18) * 20)} Z" fill="#f6ecd8"/>` }
  s += `<ellipse cx="762" cy="303" rx="22" ry="8" fill="#1a0c08"/>`
  for (let i = 0; i < 16; i++) { const a = r() * Math.PI, d = 40 + r() * 70; s += `<circle cx="${f(480 + Math.cos(a) * d)}" cy="${f(420 - Math.sin(a) * d * 0.4)}" r="${f(2 + r() * 4)}" fill="#c9a66a" opacity=".7"/>` }
  // vultures circling
  for (const [x, y, k] of [[560, 70, 11], [620, 50, 8], [700, 80, 9], [1400, 220, 7]]) s += `<path d="M${x - k} ${y} q${k / 2} ${-k / 2} ${k} 0 q${k / 2} ${-k / 2} ${k} 0" fill="none" stroke="${ink}" stroke-width="1.6" opacity=".6"/>`
  s += `<path d="M0 560 Q400 530 800 560 T1600 552 L1600 ${H} L0 ${H} Z" fill="#f2ece0" opacity=".7"/>`
  write('papyrus', s, defs)
}

/* ───── Parchment: an inked adventurer's map — a keep, a dragon over the mountains, a kraken ───── */
function parchment() {
  const r = rng(1234)
  const ink = '#5b4630'
  const j = (n = 1.5) => (r() - 0.5) * 2 * n
  const defs = `
<radialGradient id="stain" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#a07a45" stop-opacity="0"/><stop offset=".75" stop-color="#a07a45" stop-opacity=".07"/><stop offset="1" stop-color="#7a5a30" stop-opacity=".16"/></radialGradient>
<radialGradient id="blot"><stop offset="0" stop-color="#8a6a3a" stop-opacity=".12"/><stop offset="1" stop-color="#8a6a3a" stop-opacity="0"/></radialGradient>`
  let s = `<rect width="${W}" height="${H}" fill="url(#stain)"/>`
  for (let i = 0; i < 6; i++) s += `<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(80 + r() * 160)}" fill="url(#blot)"/>`
  s += `<g fill="none" stroke="${ink}" stroke-linecap="round" stroke-linejoin="round">`
  let coast = `M-20 430`
  for (let x = 0; x <= 760; x += 40) coast += ` L${x} ${f(430 + Math.sin(x / 110) * 40 + x * 0.22 + j(10))}`
  coast += ` Q800 640 840 700`
  s += `<path d="${coast}" stroke-width="2.4" opacity=".75"/><path d="${coast}" stroke-width="1" opacity=".35" transform="translate(0 10)"/>`
  for (let i = 0; i < 18; i++) { const x = r() * 700, y = 520 + r() * 100; s += `<path d="M${f(x)} ${f(y)} q8 -7 16 0 q8 7 16 0" stroke-width="1.2" opacity=".45"/>` }
  // kraken tentacles curling out of the sea
  for (const [x, h, dir] of [[300, 90, 1], [350, 120, -1], [410, 80, 1]]) s += `<path d="M${x} 600 C${x + dir * 30} ${600 - h * 0.5} ${x - dir * 30} ${600 - h * 0.8} ${x + dir * 6} ${600 - h} q${dir * 14} -8 ${dir * 8} 10" stroke-width="3" opacity=".6"/>`
  // mountain glyphs
  const mountain = (x, y, h) => {
    const w = h * 0.9
    let m = `<path d="M${f(x - w + j())} ${f(y)} L${f(x + j())} ${f(y - h)} L${f(x + w + j())} ${f(y)}" stroke-width="1.8" opacity=".7"/>`
    for (let k = 1; k <= 4; k++) { const t = k / 5; m += `<path d="M${f(x + w * t * 0.25)} ${f(y - h + h * t)} L${f(x + w * t * 0.25 + w * 0.35)} ${f(y - h * 0.1 + j(2))}" stroke-width="1" opacity=".4"/>` }
    return m
  }
  for (const [x, y, h] of [[820, 330, 70], [900, 320, 96], [990, 330, 80], [1070, 340, 60], [860, 390, 50], [950, 395, 62], [1040, 400, 54], [1130, 360, 70], [1210, 375, 52]]) s += mountain(x, y, h)
  // forests
  const tree = (x, y) => `<path d="M${f(x)} ${f(y)} v-4 M${f(x - 6)} ${f(y - 4)} L${f(x)} ${f(y - 18 + j(2))} L${f(x + 6)} ${f(y - 4)} Z" stroke-width="1.2" opacity=".6"/>`
  for (let i = 0; i < 28; i++) s += tree(1180 + r() * 260, 460 + r() * 110)
  s += `<path d="M960 400 C900 450 820 430 760 480 S640 530 610 560" stroke-width="1.8" opacity=".55"/>`
  s += `<path d="M300 250 C420 210 520 290 640 260 S800 190 900 180 S1100 230 1260 210" stroke-width="2" stroke-dasharray="2 9" opacity=".7"/>`
  s += `</g>`
  // the keep, drawn in ink with a light wash
  s += castle(300, 250, 0.42, { fill: '#e6d6b4', spires: [{ x: -110, w: 30, h: 150 }, { x: -22, w: 40, h: 210 }, { x: 40, w: 30, h: 160 }, { x: 110, w: 30, h: 140 }] })
  s += `<g transform="translate(300 250) scale(.42)" fill="none" stroke="${ink}" stroke-width="3.2" opacity=".75"><rect x="-140" y="-70" width="280" height="82"/>`
  for (const t of [{ x: -110, w: 30, h: 150 }, { x: -22, w: 40, h: 210 }, { x: 40, w: 30, h: 160 }, { x: 110, w: 30, h: 140 }]) s += `<rect x="${t.x - t.w / 2}" y="${-t.h}" width="${t.w}" height="${t.h + 12}"/><path d="M${t.x - t.w / 2 - 5} ${-t.h} L${t.x} ${-t.h - t.w * 1.5} L${t.x + t.w / 2 + 5} ${-t.h} Z"/>`
  s += `<path d="M-14 12 V-22 A14 14 0 0 1 14 -22 V12"/></g>`
  // a dragon over the mountains, drawn as an ink outline with a red wash
  s += dragon(960, 150, 0.85, '#b5443a', { rot: -8, extra: ' opacity=".28"' }) + dragon(960, 150, 0.85, 'none', { rot: -8, extra: ` stroke="${ink}" stroke-width="2.4" opacity=".75"` })
  // the X and the crypt entrance
  s += `<path d="M1250 200 l20 20 m0 -20 l-20 20" stroke="#9e2b25" stroke-width="3.4" opacity=".8"/>`
  s += `<g transform="translate(1320 470)" stroke="${ink}" fill="none" stroke-width="1.8" opacity=".75"><path d="M-22 10 V-8 A22 22 0 0 1 22 -8 V10 Z" fill="#3a2a1a" fill-opacity=".25"/><circle cx="0" cy="-6" r="6"/><path d="M-3 -6 h0.1 M3 -6 h0.1 M-3 2 v4 M0 2 v4 M3 2 v4"/></g>`
  // compass rose
  const cx = 1470, cy = 110
  s += `<g fill="none" stroke="${ink}"><circle cx="${cx}" cy="${cy}" r="62" stroke-width="1.4" opacity=".55"/><circle cx="${cx}" cy="${cy}" r="54" stroke-width=".8" opacity=".4"/></g>`
  const star = (len, wid, rot, fill) => `<path transform="translate(${cx} ${cy}) rotate(${rot})" d="M0 ${-len} L${wid} 0 L0 ${len} L${-wid} 0 Z" fill="${fill}" stroke="${ink}" stroke-width="1" opacity=".75"/>`
  s += star(46, 8, 45, '#d8c49a') + star(46, 8, -45, '#d8c49a') + star(70, 11, 0, '#ecdcb8') + star(70, 11, 90, '#ecdcb8')
  s += `<text x="${cx}" y="${cy - 78}" text-anchor="middle" font-family="Georgia, serif" font-size="20" font-weight="700" fill="${ink}" opacity=".75">N</text>`
  s += `<g font-family="Georgia, serif" font-style="italic" fill="${ink}" opacity=".65"><text x="300" y="282" text-anchor="middle" font-size="18">Dragonspire Keep</text><text x="40" y="580" font-size="20">The Sundered Sea</text><text x="1000" y="268" text-anchor="middle" font-size="16" letter-spacing="3">HERE BE DRAGONS</text><text x="1320" y="510" text-anchor="middle" font-size="15">The Sunless Crypt</text><text x="1270" y="610" font-size="16">Whisperwood</text></g>`
  write('parchment', s, defs)
}

/* ───── Dungeon: a torch-lit stone corridor through an archway, a glowing door at the end ───── */
function dungeon() {
  const r = rng(666)
  const vx = 800, top = 150, bot = 430, dl = 700, dr = 900 // far opening
  const defs = `
<linearGradient id="ceil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0b0c"/><stop offset="1" stop-color="#26221e"/></linearGradient>
<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2620"/><stop offset="1" stop-color="#121214"/></linearGradient>
<linearGradient id="wallL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#16151a"/><stop offset="1" stop-color="#36302a"/></linearGradient>
<linearGradient id="wallR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#16151a"/><stop offset="1" stop-color="#36302a"/></linearGradient>
${glow('torch', '#ffae4a', 0.75)}${glow('doorGlow', '#6dff9a', 0.7)}${blur('b6', 6)}`
  let s = `<rect width="${W}" height="${H}" fill="#121214"/>`
  // corridor surfaces
  s += `<path d="M0 0 L${W} 0 L${dr} ${top} L${dl} ${top} Z" fill="url(#ceil)"/>`
  s += `<path d="M0 ${H} L${dl} ${bot} L${dr} ${bot} L${W} ${H} Z" fill="url(#floor)"/>`
  s += `<path d="M0 0 L${dl} ${top} L${dl} ${bot} L0 ${H} Z" fill="url(#wallL)"/><path d="M${W} 0 L${dr} ${top} L${dr} ${bot} L${W} ${H} Z" fill="url(#wallR)"/>`
  // stone courses on the walls (lines converging on the far opening) and staggered joints
  const mix = (a, b, t) => a + (b - a) * t
  let g = `<g stroke="#0c0b0d" stroke-width="2" opacity=".75" fill="none">`
  for (let k = 1; k < 12; k++) { const t = k / 12; g += `<path d="M0 ${f(H * t)} L${dl} ${f(mix(top, bot, t))}"/><path d="M${W} ${f(H * t)} L${dr} ${f(mix(top, bot, t))}"/>` }
  for (let k = 0; k < 12; k++) for (const d of [0.08, 0.2, 0.34, 0.5, 0.66, 0.8]) {
    const dd = d + (k % 2 ? 0.06 : 0), t0 = k / 12, t1 = (k + 1) / 12
    for (const side of [0, 1]) {
      const X = side ? mix(W, dr, dd) : mix(0, dl, dd)
      const y0 = mix(H * t0, mix(top, bot, t0), dd), y1 = mix(H * t1, mix(top, bot, t1), dd)
      g += `<path d="M${f(X)} ${f(y0)} L${f(X)} ${f(y1)}"/>`
    }
  }
  for (let k = 1; k < 10; k++) { const t = Math.pow(k / 10, 1.6); g += `<path d="M${f(mix(0, dl, 1 - t))} ${f(mix(H, bot, 1 - t))} L${f(mix(W, dr, 1 - t))} ${f(mix(H, bot, 1 - t))}"/>` }
  for (let k = -8; k <= 8; k++) g += `<path d="M${f(vx + k * 110)} ${H} L${f(vx + k * 12.5)} ${bot}"/>`
  s += g + `</g>`
  // the far door: an arched iron-bound door with eerie light around it
  s += `<rect x="${dl}" y="${top}" width="${dr - dl}" height="${bot - top}" fill="#0c0c0e"/><ellipse cx="${vx}" cy="${bot - 90}" rx="160" ry="150" fill="url(#doorGlow)"/>`
  s += `<path d="M${vx - 56} ${bot} V${bot - 140} A56 56 0 0 1 ${vx + 56} ${bot - 140} V${bot} Z" fill="#2a1d14" stroke="#6dff9a" stroke-opacity=".5" stroke-width="3"/>`
  for (const y of [bot - 150, bot - 90, bot - 30]) s += `<rect x="${vx - 56}" y="${y}" width="112" height="7" fill="#151515"/>`
  s += `<path d="M${vx} ${bot} V${bot - 194}" stroke="#151515" stroke-width="3"/><circle cx="${vx + 30}" cy="${bot - 70}" r="6" fill="none" stroke="#151515" stroke-width="3"/>`
  // torches in iron sconces
  for (const [x, y] of [[300, 110], [1300, 110], [560, 210], [1040, 210]]) {
    const k = x === 300 || x === 1300 ? 1 : 0.65
    s += `<circle cx="${x}" cy="${y}" r="${f(220 * k)}" fill="url(#torch)"/>`
    s += `<path d="M${x - 8 * k} ${y + 20 * k} L${x + 8 * k} ${y + 20 * k} L${x + 4 * k} ${y + 70 * k} L${x - 4 * k} ${y + 70 * k} Z" fill="#1a1512"/><path d="M${x - 14 * k} ${y + 20 * k} H${x + 14 * k}" stroke="#2a221b" stroke-width="${4 * k}"/>`
    s += `<path d="M${x} ${y - 40 * k} C${x + 16 * k} ${y - 10 * k} ${x + 14 * k} ${y + 16 * k} ${x} ${y + 18 * k} C${x - 14 * k} ${y + 16 * k} ${x - 16 * k} ${y - 10 * k} ${x} ${y - 40 * k} Z" fill="#ff9a2a" filter="url(#b6)"/>`
    s += `<path d="M${x} ${y - 24 * k} C${x + 8 * k} ${y - 4 * k} ${x + 8 * k} ${y + 12 * k} ${x} ${y + 14 * k} C${x - 8 * k} ${y + 12 * k} ${x - 8 * k} ${y - 4 * k} ${x} ${y - 24 * k} Z" fill="#ffe08a"/>`
  }
  // chains from the ceiling
  for (const [x, len] of [[420, 120], [1180, 150], [640, 60]]) { let c = ''; for (let y = 0; y < len; y += 12) c += `<ellipse cx="${x}" cy="${y + 6}" rx="${y / 12 % 2 ? 2 : 4}" ry="6" fill="none" stroke="#3a342e" stroke-width="2.4"/>`; s += c }
  // cobwebs in the corners
  for (const [x, y, sx, sy] of [[0, 0, 1, 1], [W, 0, -1, 1]]) {
    let w = `<g transform="translate(${x} ${y}) scale(${sx} ${sy})" stroke="#c9c2b6" stroke-width="1" fill="none" opacity=".35">`
    for (let k = 0; k <= 5; k++) { const a = k * Math.PI / 10; w += `<path d="M0 0 L${f(Math.cos(a) * 170)} ${f(Math.sin(a) * 170)}"/>` }
    for (const rad of [40, 80, 120, 160]) { let d = ''; for (let k = 0; k <= 5; k++) { const a = k * Math.PI / 10, rr = rad * (k % 2 ? 0.9 : 1); d += `${k ? 'L' : 'M'}${f(Math.cos(a) * rr)} ${f(Math.sin(a) * rr)} ` } w += `<path d="${d}"/>` }
    s += w + `</g>`
  }
  // the foreground arch of dressed stone
  s += `<path d="M0 0 H${W} V${H} H1460 V300 C1460 120 1180 40 800 40 C420 40 140 120 140 300 V${H} H0 Z" fill="#17161a"/>`
  let v = `<g stroke="#08080a" stroke-width="3" fill="none">`
  for (let k = 0; k <= 16; k++) { const a = Math.PI + k * Math.PI / 16, cx = 800, rx = 660, ry = 260, cy = 300; v += `<path d="M${f(cx + Math.cos(a) * rx)} ${f(cy + Math.sin(a) * ry)} L${f(cx + Math.cos(a) * (rx + 60))} ${f(cy + Math.sin(a) * (ry + 60))}"/>` }
  v += `<path d="M140 ${H} V300 C140 120 420 40 800 40 C1180 40 1460 120 1460 300 V${H}"/>`
  for (let y = 340; y < H; y += 50) v += `<path d="M80 ${y} H140 M1460 ${y} H1520"/>`
  s += v + `</g>`
  s += `<path d="M800 40 l-26 -6 l10 -34 h32 l10 34 Z" fill="#232127" stroke="#08080a" stroke-width="3"/><circle cx="800" cy="14" r="7" fill="#08080a"/>`
  s += `<rect x="0" y="600" width="${W}" height="40" fill="#121214"/>`
  for (let i = 0; i < 30; i++) s += `<circle cx="${f(200 + r() * 1200)}" cy="${f(120 + r() * 380)}" r="${f(0.6 + r() * 1.4)}" fill="#ffd9a0" opacity="${f(0.2 + r() * 0.5)}"/>`
  write('dungeon', s, defs)
}

ember(); arcane(); frost(); verdant(); papyrus(); parchment(); dungeon()
