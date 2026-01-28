import type { Entry, SpellData, SpellComponents, SpellRange, SpellDuration, SPELL_SCHOOLS } from './types/5etools'

/**
 * Strip 5eTools tags from text, extracting just the display content
 * Examples:
 *   {@spell fireball} → "fireball"
 *   {@damage 1d8} → "1d8"
 *   {@condition stunned|PHB} → "stunned"
 *   {@dice 1d6} → "1d6"
 *   {@action Attack} → "Attack"
 */
export function stripTags(text: string): string {
  return text.replace(/{@\w+\s+([^|}]+)(?:\|[^}]*)?}/g, '$1')
}

/**
 * Convert entries array to plain text recursively
 */
export function entriesToText(entries: Entry[], indent = 0): string {
  const lines: string[] = []
  const prefix = '  '.repeat(indent)

  for (const entry of entries) {
    if (typeof entry === 'string') {
      lines.push(prefix + stripTags(entry))
    } else if (entry && typeof entry === 'object') {
      switch (entry.type) {
        case 'entries':
        case 'section':
        case 'inset':
          if (entry.name) {
            lines.push('')
            lines.push(prefix + entry.name + ':')
          }
          lines.push(entriesToText(entry.entries, indent + (entry.name ? 1 : 0)))
          break

        case 'list':
          if (entry.name) {
            lines.push(prefix + entry.name + ':')
          }
          for (const item of entry.items) {
            if (typeof item === 'string') {
              lines.push(prefix + '• ' + stripTags(item))
            } else {
              lines.push(prefix + '• ' + entriesToText([item], 0).trim())
            }
          }
          break

        case 'table':
          if (entry.caption) {
            lines.push(prefix + entry.caption)
          }
          if (entry.colLabels) {
            lines.push(prefix + entry.colLabels.map(stripTags).join(' | '))
            lines.push(prefix + '-'.repeat(entry.colLabels.join(' | ').length))
          }
          for (const row of entry.rows) {
            const rowText = row.map((cell) => {
              if (typeof cell === 'string') return stripTags(cell)
              return entriesToText([cell], 0).trim()
            })
            lines.push(prefix + rowText.join(' | '))
          }
          break

        case 'quote':
          lines.push(prefix + '"' + entriesToText(entry.entries, 0).trim() + '"')
          if (entry.by) {
            lines.push(prefix + '  — ' + entry.by)
          }
          break

        case 'insetReadaloud':
          lines.push('')
          lines.push(prefix + '---')
          lines.push(entriesToText(entry.entries, indent))
          lines.push(prefix + '---')
          break

        case 'refOptionalfeature':
          lines.push(prefix + `[${entry.optionalfeature.split('|')[0]}]`)
          break

        case 'refClassFeature':
          lines.push(prefix + `[${entry.classFeature.split('|')[0]}]`)
          break

        case 'refSubclassFeature':
          lines.push(prefix + `[${entry.subclassFeature.split('|')[0]}]`)
          break

        default:
          // Handle unknown types by trying to get entries or just skipping
          if ('entries' in entry && Array.isArray((entry as { entries: Entry[] }).entries)) {
            lines.push(entriesToText((entry as { entries: Entry[] }).entries, indent))
          }
      }
    }
  }

  return lines.filter((line) => line !== '').join('\n')
}

/**
 * Parse a feature reference string like "Feature Name|ClassName|ClassSource|Level"
 */
export function parseFeatureRef(ref: string): {
  name: string
  className: string
  classSource: string
  level: number
} {
  const parts = ref.split('|')
  return {
    name: parts[0] || '',
    className: parts[1] || '',
    classSource: parts[2] || '',
    level: parseInt(parts[3] || '0', 10),
  }
}

/**
 * Parse a subclass feature reference string like "Feature Name|ClassName|ClassSource|SubclassShortName|SubclassSource|Level"
 */
export function parseSubclassFeatureRef(ref: string): {
  name: string
  className: string
  classSource: string
  subclassShortName: string
  subclassSource: string
  level: number
} {
  const parts = ref.split('|')
  return {
    name: parts[0] || '',
    className: parts[1] || '',
    classSource: parts[2] || '',
    subclassShortName: parts[3] || '',
    subclassSource: parts[4] || '',
    level: parseInt(parts[5] || '0', 10),
  }
}

/**
 * Normalize a name for matching (lowercase, remove non-alphanumeric)
 */
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Match a database subclass name to 5eTools subclass data
 */
export function matchSubclassName(dbName: string, toolsName: string, toolsShortName: string): boolean {
  const normalized = normalizeName(dbName)
  return normalizeName(toolsName) === normalized || normalizeName(toolsShortName) === normalized
}

/**
 * Format spell casting time
 */
export function formatCastingTime(time: SpellData['time']): string {
  if (!time || time.length === 0) return 'Unknown'
  const t = time[0]
  let result = `${t.number} ${t.unit}`
  if (t.number !== 1) result += 's'
  if (t.condition) result += ` (${t.condition})`
  return result
}

/**
 * Format spell range
 */
export function formatSpellRange(range: SpellRange): string {
  if (range.type === 'special') return 'Special'
  if (range.type === 'point') {
    if (!range.distance) return 'Self'
    if (range.distance.type === 'self') return 'Self'
    if (range.distance.type === 'touch') return 'Touch'
    if (range.distance.type === 'sight') return 'Sight'
    if (range.distance.type === 'unlimited') return 'Unlimited'
    return `${range.distance.amount} ${range.distance.type}`
  }
  if (range.type === 'radius' || range.type === 'sphere' || range.type === 'cone' || range.type === 'line' || range.type === 'cube' || range.type === 'hemisphere') {
    const dist = range.distance
    if (!dist) return range.type
    return `${dist.amount}-foot ${range.type}`
  }
  return 'Unknown'
}

/**
 * Format spell components
 */
export function formatSpellComponents(components: SpellComponents): string {
  const parts: string[] = []
  if (components.v) parts.push('V')
  if (components.s) parts.push('S')
  if (components.m) {
    if (typeof components.m === 'string') {
      parts.push(`M (${components.m})`)
    } else {
      parts.push(`M (${components.m.text})`)
    }
  }
  return parts.join(', ')
}

/**
 * Format spell duration
 */
export function formatSpellDuration(duration: SpellDuration[]): string {
  if (!duration || duration.length === 0) return 'Unknown'
  const d = duration[0]
  let result = ''

  if (d.concentration) result = 'Concentration, '

  switch (d.type) {
    case 'instant':
      result += 'Instantaneous'
      break
    case 'timed':
      if (d.duration) {
        result += `${d.duration.amount} ${d.duration.type}`
        if (d.duration.amount !== 1) result += 's'
      }
      break
    case 'permanent':
      result += 'Until dispelled'
      break
    case 'special':
      result += 'Special'
      break
    default:
      result += d.type
  }

  return result
}

/**
 * Get spell school full name from abbreviation
 */
export function getSpellSchool(abbrev: string): string {
  const schools: Record<string, string> = {
    A: 'Abjuration',
    C: 'Conjuration',
    D: 'Divination',
    E: 'Enchantment',
    V: 'Evocation',
    I: 'Illusion',
    N: 'Necromancy',
    T: 'Transmutation',
  }
  return schools[abbrev] || abbrev
}
