// Minimal allow-list HTML sanitizer for imported rules text.
//
// Text between tags is always escaped, so stripping a disallowed tag can never splice together a
// new tag (e.g. "<<script>img onerror=…>" stays inert). Allowed tags are re-emitted without
// attributes, except https links.

const ALLOWED = new Set(['p', 'br', 'em', 'strong', 'b', 'i', 'u', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'h4', 'h5', 'h6', 'blockquote', 'span', 'a', 'caption'])
const HEADING_REMAP: Record<string, string> = { h1: 'h4', h2: 'h4', h3: 'h4' }
const DROP_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript'])
const VOID = new Set(['br'])

const escapeText = (s: string) => s.replace(/&(?!(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** DDB inline tags such as [action]Opportunity Attack;Opportunity Attacks[/action] → display text. */
export function stripDdbTags(text: string): string {
  return text.replace(/\[(\w+)\]([\s\S]*?)\[\/\1\]/g, (_m, _tag, inner: string) => {
    const parts = inner.split(';')
    return parts[parts.length - 1]
  })
}

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return ''
  const source = stripDdbTags(String(input))
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>|<!--[\s\S]*?-->/g
  let out = ''
  let last = 0
  let dropping: string | null = null
  let m: RegExpExecArray | null
  while ((m = tagRe.exec(source))) {
    if (!dropping) out += escapeText(source.slice(last, m.index))
    last = tagRe.lastIndex
    if (!m[2]) continue // comment
    const closing = m[1] === '/'
    let name = m[2].toLowerCase()
    if (dropping) {
      if (closing && name === dropping) dropping = null
      continue
    }
    if (DROP_CONTENT.has(name)) {
      if (!closing && !/\/\s*$/.test(m[3])) dropping = name
      continue
    }
    name = HEADING_REMAP[name] ?? name
    if (!ALLOWED.has(name)) continue
    if (closing) { if (!VOID.has(name)) out += `</${name}>`; continue }
    if (name === 'a') {
      const href = /href\s*=\s*"([^"]*)"|href\s*=\s*'([^']*)'/i.exec(m[3])
      const url = href ? (href[1] ?? href[2] ?? '') : ''
      out += /^https:\/\//i.test(url) ? `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">` : '<a>'
      continue
    }
    out += `<${name}>`
  }
  if (!dropping) out += escapeText(source.slice(last))
  return out.trim()
}

/** Plain text (for snippets and search). */
export function htmlToText(input: string | null | undefined): string {
  if (!input) return ''
  return stripDdbTags(String(input))
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|tr|h\d)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&rsquo;|&lsquo;/g, '’').replace(/&ldquo;|&rdquo;/g, '"').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}
