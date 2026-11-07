#!/usr/bin/env node
// Generates the sheet backdrops (public/backdrops/<theme>.svg): one original scene per theme.
// Deterministic (seeded), so rerunning gives the same files. Run: node scripts/backdrops.cjs
const fs = require('fs')
const path = require('path')

const W = 1600, H = 640
const OUT = path.join(__dirname, '..', 'public', 'backdrops')

function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const f = n => Math.round(n * 10) / 10

/** A mountain ridge by midpoint displacement, closed down to the bottom edge. */
function ridge(r, { base, rough, peaks = [], step = 8 }) {
  const n = Math.ceil(W / step) + 1
  const ys = new Array(n).fill(0).map((_, i) => base)
  // coarse random walk, then smooth
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

/* ───── Ember: a volcanic range at dusk, a ruined keep, drifting embers ───── */
function ember() {
  const r = rng(7)
  const defs = `
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e0a08"/><stop offset=".45" stop-color="#2b1009"/><stop offset=".72" stop-color="#7a2c10"/><stop offset="1" stop-color="#a8461a"/></linearGradient>
<radialGradient id="glow" cx="1090" cy="300" r="520" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff8a2a" stop-opacity=".55"/><stop offset=".4" stop-color="#e2541c" stop-opacity=".22"/><stop offset="1" stop-color="#e2541c" stop-opacity="0"/></radialGradient>
<linearGradient id="lava" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd27a"/><stop offset="1" stop-color="#ff5a1a" stop-opacity="0"/></linearGradient>
<filter id="blur8" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter>
<filter id="blur24" filterUnits="userSpaceOnUse" x="-200" y="-200" width="2000" height="1040"><feGaussianBlur stdDeviation="24"/></filter>
<filter id="blur2"><feGaussianBlur stdDeviation="1.6"/></filter>`
  let s = `<rect width="${W}" height="${H}" fill="url(#sky)"/><rect width="${W}" height="${H}" fill="url(#glow)"/>`
  // smoke plume drifting left from the crater
  for (let i = 0; i < 14; i++) {
    const t = i / 13
    s += `<ellipse cx="${f(1090 - t * 520 + (r() - 0.5) * 60)}" cy="${f(250 - t * 190 + (r() - 0.5) * 30)}" rx="${f(50 + t * 160)}" ry="${f(28 + t * 50)}" fill="#3a1d14" opacity="${f(0.6 - t * 0.4)}" filter="url(#blur24)"/>`
  }
  s += `<path d="${ridge(r, { base: 380, rough: 10, peaks: [{ x: 300, y: 300, w: 260 }, { x: 640, y: 330, w: 200 }, { x: 1450, y: 310, w: 240 }] })}" fill="#4d1d0f" opacity=".85"/>`
  // the volcano: a broad cone with a notched crater
  s += `<path d="M760 ${H} L880 420 Q980 330 1050 262 L1066 274 L1082 258 L1100 270 L1114 256 Q1190 330 1300 430 L1420 ${H} Z" fill="#2a120a"/>`
  s += `<ellipse cx="1084" cy="262" rx="60" ry="22" fill="#ff8a2a" opacity=".7" filter="url(#blur8)"/>`
  for (const [x1, x2, len] of [[1072, 1040, 120], [1092, 1118, 150], [1082, 1070, 70]]) {
    s += `<path d="M${x1} 266 Q${(x1 + x2) / 2 + 10} ${266 + len / 2} ${x2} ${266 + len}" stroke="url(#lava)" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
    s += `<path d="M${x1} 266 Q${(x1 + x2) / 2 + 10} ${266 + len / 2} ${x2} ${266 + len}" stroke="#ff7a22" stroke-width="10" fill="none" opacity=".35" filter="url(#blur8)"/>`
  }
  s += `<path d="${ridge(r, { base: 470, rough: 12, peaks: [{ x: 170, y: 360, w: 200, sharp: 1.1 }, { x: 1500, y: 420, w: 220 }] })}" fill="#1f100a"/>`
  // ruined keep on the left crag
  const kx = 150, ky = 362
  s += `<g fill="#1f100a"><rect x="${kx - 28}" y="${ky - 70}" width="56" height="80"/><rect x="${kx - 34}" y="${ky - 80}" width="10" height="14"/><rect x="${kx - 16}" y="${ky - 80}" width="10" height="14"/><rect x="${kx + 2}" y="${ky - 80}" width="10" height="10"/><rect x="${kx + 20}" y="${ky - 76}" width="10" height="10"/>`
  s += `<rect x="${kx + 28}" y="${ky - 34}" width="70" height="110"/><path d="M${kx + 98} ${ky - 34} l10 -22 l6 22 Z"/><rect x="${kx - 70}" y="${ky - 30}" width="44" height="120"/></g>`
  s += `<rect x="${kx - 5}" y="${ky - 48}" width="7" height="12" rx="3" fill="#ffb24a"/><rect x="${kx - 5}" y="${ky - 48}" width="7" height="12" fill="#ff9a3a" opacity=".6" filter="url(#blur8)"/>`
  s += `<path d="${ridge(r, { base: 560, rough: 8 })}" fill="#17100c"/>`
  s += `<path d="${ridge(r, { base: 615, rough: 6 })}" fill="#13110e"/>`
  // embers
  for (let i = 0; i < 140; i++) {
    const x = r() * W, y = 40 + r() * 520, rad = 0.7 + Math.pow(r(), 3) * 2.6, hot = r() > 0.6
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad)}" fill="${hot ? '#ffd27a' : '#ff8a3a'}" opacity="${f(0.35 + r() * 0.6)}"${rad > 2 ? ' filter="url(#blur2)"' : ''}/>`
  }
  write('ember', s, defs)
}

/* ───── Arcane: starfield, aurora, crescent moon, a wizard's tower among floating crystals ───── */
function arcane() {
  const r = rng(42)
  const defs = `
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#04060e"/><stop offset=".5" stop-color="#0f1736"/><stop offset=".85" stop-color="#26306a"/><stop offset="1" stop-color="#2f3a7a"/></linearGradient>
<linearGradient id="aur" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4fe0c0" stop-opacity="0"/><stop offset=".3" stop-color="#4fe0c0"/><stop offset=".65" stop-color="#8a7bff"/><stop offset="1" stop-color="#c58bff" stop-opacity="0"/></linearGradient>
<radialGradient id="moonGlow"><stop offset="0" stop-color="#cdd8ff" stop-opacity=".45"/><stop offset="1" stop-color="#cdd8ff" stop-opacity="0"/></radialGradient>
<radialGradient id="orb"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#bcc9ff"/><stop offset="1" stop-color="#7f8fff" stop-opacity="0"/></radialGradient>
<mask id="crescent"><rect width="${W}" height="${H}" fill="#000"/><circle cx="1260" cy="130" r="48" fill="#fff"/><circle cx="1282" cy="116" r="44" fill="#000"/></mask>
<filter id="blur30" filterUnits="userSpaceOnUse" x="-200" y="-200" width="2000" height="1040"><feGaussianBlur stdDeviation="30"/></filter>
<filter id="blur6" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="6"/></filter>`
  let s = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`
  for (let i = 0; i < 420; i++) {
    const y = Math.pow(r(), 1.4) * 470
    s += `<circle cx="${f(r() * W)}" cy="${f(y)}" r="${f(0.4 + Math.pow(r(), 4) * 1.4)}" fill="#fff" opacity="${f(0.25 + r() * 0.7)}"/>`
  }
  for (let i = 0; i < 9; i++) {
    const x = r() * W, y = 20 + r() * 300, k = 5 + r() * 7
    s += `<path d="M${f(x)} ${f(y - k)} L${f(x + k * 0.18)} ${f(y - k * 0.18)} L${f(x + k)} ${f(y)} L${f(x + k * 0.18)} ${f(y + k * 0.18)} L${f(x)} ${f(y + k)} L${f(x - k * 0.18)} ${f(y + k * 0.18)} L${f(x - k)} ${f(y)} L${f(x - k * 0.18)} ${f(y - k * 0.18)} Z" fill="#eef1ff" opacity=".9"/>`
  }
  // aurora ribbons
  for (const [y0, amp, wdt, op] of [[150, 40, 70, 0.35], [210, 55, 50, 0.28], [120, 30, 30, 0.3]]) {
    let d = `M-100 ${y0}`
    for (let x = -100; x <= W + 100; x += 200) d += ` Q${x + 100} ${f(y0 + (r() - 0.5) * amp * 2)} ${x + 200} ${f(y0 + (r() - 0.5) * amp)}`
    s += `<path d="${d}" stroke="url(#aur)" stroke-width="${wdt}" fill="none" opacity="${op}" filter="url(#blur30)"/>`
  }
  s += `<circle cx="1260" cy="130" r="150" fill="url(#moonGlow)"/><rect width="${W}" height="${H}" fill="#e9ecf8" mask="url(#crescent)"/>`
  s += `<path d="${ridge(r, { base: 420, rough: 9, peaks: [{ x: 260, y: 330, w: 240 }, { x: 900, y: 300, w: 280 }, { x: 1380, y: 350, w: 220 }] })}" fill="#1c2452"/>`
  s += `<path d="${ridge(r, { base: 500, rough: 10, peaks: [{ x: 470, y: 380, w: 170, sharp: 1.2 }, { x: 1180, y: 430, w: 200 }] })}" fill="#141a3a"/>`
  // the tower on the near peak
  const tx = 470, ty = 384
  s += `<g fill="#141a3a"><path d="M${tx - 22} ${ty + 20} L${tx - 16} ${ty - 150} L${tx + 16} ${ty - 150} L${tx + 22} ${ty + 20} Z"/><rect x="${tx - 24}" y="${ty - 160}" width="48" height="14"/><path d="M${tx - 26} ${ty - 160} L${tx} ${ty - 222} L${tx + 26} ${ty - 160} Z"/>`
  s += `<path d="M${tx + 16} ${ty - 90} L${tx + 44} ${ty - 90} L${tx + 46} ${ty + 20} L${tx + 18} ${ty + 20} Z"/><path d="M${tx + 14} ${ty - 90} L${tx + 30} ${ty - 122} L${tx + 48} ${ty - 90} Z"/></g>`
  for (const [x, y] of [[tx - 4, ty - 130], [tx - 4, ty - 96], [tx - 4, ty - 60], [tx + 27, ty - 66]]) s += `<rect x="${x}" y="${y}" width="7" height="12" rx="3.5" fill="#ffd98a"/>`
  s += `<circle cx="${tx}" cy="${ty - 236}" r="30" fill="url(#orb)"/><circle cx="${tx}" cy="${ty - 236}" r="4" fill="#fff"/>`
  // floating crystals
  for (const [x, y, k, rot] of [[400, 200, 18, -14], [548, 236, 12, 20], [600, 160, 9, 8], [360, 270, 8, 30], [1060, 260, 10, -20]]) {
    s += `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M0 ${-k * 1.8} L${k * 0.6} 0 L0 ${k * 1.4} L${-k * 0.6} 0 Z" fill="#a3b5ff" opacity=".55" filter="url(#blur6)"/><path d="M0 ${-k * 1.8} L${k * 0.6} 0 L0 ${k * 1.4} L${-k * 0.6} 0 Z" fill="#c9d4ff" opacity=".85"/><path d="M0 ${-k * 1.8} L${k * 0.6} 0 L0 ${k * 1.4} Z" fill="#7f8fe8" opacity=".7"/></g>`
  }
  s += `<path d="${ridge(r, { base: 570, rough: 8 })}" fill="#10152c"/>`
  s += `<path d="${ridge(r, { base: 620, rough: 5 })}" fill="#0d1120"/>`
  write('arcane', s, defs)
}

/* ───── Parchment: an inked adventurer's map (transparent, sits on the parchment colour) ───── */
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
  // coastline across the lower left, sea below it
  let coast = `M-20 ${430}`
  const coastPts = []
  for (let x = 0; x <= 760; x += 40) { const y = 430 + Math.sin(x / 110) * 40 + x * 0.22 + j(10); coastPts.push([x, y]); coast += ` L${x} ${f(y)}` }
  coast += ` Q800 640 840 700`
  s += `<path d="${coast}" stroke-width="2.4" opacity=".75"/><path d="${coast}" stroke-width="1" opacity=".35" transform="translate(0 10)"/><path d="${coast}" stroke-width="0.8" opacity=".2" transform="translate(0 20)"/>`
  for (let i = 0; i < 26; i++) {
    const [cx, cy] = coastPts[Math.floor(r() * coastPts.length)]
    const x = cx - 20 + r() * 60, y = cy + 40 + r() * 140
    if (y > H - 10) continue
    s += `<path d="M${f(x)} ${f(y)} q8 -7 16 0 q8 7 16 0" stroke-width="1.2" opacity=".45"/>`
  }
  // sea serpent
  s += `<path d="M240 590 q20 -40 40 0 q20 -40 40 0 q20 -40 40 0 q12 -26 24 -20" stroke-width="2" opacity=".55"/><circle cx="386" cy="568" r="1.6" fill="${ink}" opacity=".6"/>`
  // mountain range glyphs
  const mountain = (x, y, h) => {
    const w = h * 0.9
    let m = `<path d="M${f(x - w + j())} ${f(y)} L${f(x + j())} ${f(y - h)} L${f(x + w + j())} ${f(y)}" stroke-width="1.8" opacity=".7"/>`
    for (let k = 1; k <= 4; k++) { const t = k / 5; m += `<path d="M${f(x + w * t * 0.25)} ${f(y - h + h * t)} L${f(x + w * t * 0.25 + w * 0.35)} ${f(y - h * 0.1 + j(2))}" stroke-width="1" opacity=".4"/>` }
    return m
  }
  for (const [x, y, h] of [[820, 300, 70], [900, 290, 96], [990, 300, 80], [1070, 310, 60], [860, 360, 50], [950, 365, 62], [1040, 372, 54], [1130, 330, 70], [1210, 345, 52]]) s += mountain(x, y, h)
  // forests
  const tree = (x, y) => `<path d="M${f(x)} ${f(y)} v-4 M${f(x - 6)} ${f(y - 4)} L${f(x)} ${f(y - 18 + j(2))} L${f(x + 6)} ${f(y - 4)} Z" stroke-width="1.2" opacity=".6"/>`
  for (let i = 0; i < 28; i++) s += tree(1180 + r() * 260, 440 + r() * 120)
  for (let i = 0; i < 16; i++) s += tree(560 + r() * 160, 260 + r() * 80)
  // river from the mountains to the sea
  s += `<path d="M960 380 C900 440 820 420 760 470 S640 520 610 560" stroke-width="1.8" opacity=".55"/>`
  // the route, a town, and the X
  s += `<path d="M300 300 C420 250 520 330 640 300 S800 220 900 210 S1100 260 1260 230" stroke-width="2" stroke-dasharray="2 9" opacity=".7"/>`
  s += `<g opacity=".7" stroke-width="1.6"><rect x="288" y="288" width="12" height="12"/><path d="M286 288 l8 -8 l8 8"/><rect x="304" y="292" width="10" height="8"/></g>`
  s += `<path d="M1250 220 l20 20 m0 -20 l-20 20" stroke="#9e2b25" stroke-width="3.4" opacity=".75"/>`
  // compass rose
  const cx = 1460, cy = 120
  s += `<circle cx="${cx}" cy="${cy}" r="62" stroke-width="1.4" opacity=".55"/><circle cx="${cx}" cy="${cy}" r="54" stroke-width=".8" opacity=".4"/>`
  for (let k = 0; k < 16; k++) { const a = (k * Math.PI) / 8; s += `<path d="M${f(cx + Math.cos(a) * 54)} ${f(cy + Math.sin(a) * 54)} L${f(cx + Math.cos(a) * 62)} ${f(cy + Math.sin(a) * 62)}" stroke-width=".9" opacity=".5"/>` }
  s += `</g>`
  const star = (len, wid, rot, fill) => `<path transform="translate(${cx} ${cy}) rotate(${rot})" d="M0 ${-len} L${wid} 0 L0 ${len} L${-wid} 0 Z" fill="${fill}" stroke="${ink}" stroke-width="1" opacity=".75"/>`
  s += star(46, 8, 45, '#d8c49a') + star(46, 8, -45, '#d8c49a') + star(70, 11, 0, '#ecdcb8') + star(70, 11, 90, '#ecdcb8')
  s += `<path transform="translate(${cx} ${cy})" d="M0 -70 L11 0 L0 0 Z M0 70 L-11 0 L0 0 Z M70 0 L0 11 L0 0 Z M-70 0 L0 -11 L0 0 Z" fill="${ink}" opacity=".6"/>`
  s += `<text x="${cx}" y="${cy - 80}" text-anchor="middle" font-family="Georgia, serif" font-size="20" font-weight="700" fill="${ink}" opacity=".75">N</text>`
  s += `<g font-family="Georgia, serif" font-style="italic" fill="${ink}" opacity=".6"><text x="40" y="560" font-size="22">The Sundered Sea</text><text x="880" y="180" font-size="20" letter-spacing="3">THE GREYSPINE</text><text x="1240" y="600" font-size="17">Whisperwood</text><text x="470" y="625" font-size="13">here be serpents</text></g>`
  write('parchment', s, defs)
}

ember(); arcane(); parchment()
