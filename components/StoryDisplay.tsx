'use client'

interface StoryDisplayProps {
  story: string
  effect: string
}

interface Section {
  title: string
  content: string
}

function parseMarkdownSections(text: string): Section[] {
  const sections: Section[] = []
  const lines = text.split('\n')
  let currentTitle = ''
  let currentContent: string[] = []

  for (const line of lines) {
    // Check for ## headers
    const headerMatch = line.match(/^##\s+(.+)$/)
    if (headerMatch) {
      // Save previous section if exists
      if (currentTitle || currentContent.length > 0) {
        sections.push({
          title: currentTitle,
          content: currentContent.join('\n').trim(),
        })
      }
      currentTitle = headerMatch[1]
      currentContent = []
    } else {
      currentContent.push(line)
    }
  }

  // Don't forget the last section
  if (currentTitle || currentContent.length > 0) {
    sections.push({
      title: currentTitle,
      content: currentContent.join('\n').trim(),
    })
  }

  return sections.filter(s => s.content || s.title)
}

function parseMarkdownTable(content: string): { headers: string[]; rows: string[][] } | null {
  const lines = content.split('\n').filter(line => line.trim().startsWith('|'))
  if (lines.length < 3) return null

  const parseRow = (line: string): string[] => {
    return line
      .split('|')
      .slice(1, -1) // Remove empty first and last from split
      .map(cell => cell.trim())
  }

  const headers = parseRow(lines[0])
  // Skip separator line (lines[1])
  const rows = lines.slice(2).map(parseRow)

  return { headers, rows }
}

function renderContent(content: string, isRoleplayMoment: boolean = false): React.ReactNode {
  // Check if content contains a table
  const table = parseMarkdownTable(content)
  if (table) {
    const nonTableContent = content
      .split('\n')
      .filter(line => !line.trim().startsWith('|'))
      .join('\n')
      .trim()

    return (
      <>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-600">
                {table.headers.map((header, i) => (
                  <th key={i} className="text-left py-2 px-3 text-gold-400 font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, i) => (
                <tr key={i} className="border-b border-slate-700">
                  {row.map((cell, j) => (
                    <td key={j} className={`py-2 px-3 ${j === 0 ? 'text-slate-400 font-medium' : 'text-slate-300'}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {nonTableContent && <p className="text-sm text-slate-300 leading-relaxed">{nonTableContent}</p>}
      </>
    )
  }

  // Regular text content - split into paragraphs
  const paragraphs = content.split('\n\n').filter(p => p.trim())
  if (paragraphs.length > 1 || isRoleplayMoment) {
    return (
      <div className="space-y-3">
        {paragraphs.map((para, i) => (
          <p key={i} className="text-sm text-slate-300 leading-relaxed">
            {formatInlineStyles(para.trim())}
          </p>
        ))}
      </div>
    )
  }

  return <p className="text-sm text-slate-300 leading-relaxed">{formatInlineStyles(content)}</p>
}

function formatInlineStyles(text: string): React.ReactNode {
  // Handle *italic* text
  const parts = text.split(/(\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="text-amber-200">{part.slice(1, -1)}</em>
    }
    return part
  })
}

function getSectionIcon(title: string): string {
  if (title.startsWith('Your New Form')) return '🎭'
  if (title.includes('Roleplay Moment')) return '✨'
  if (title.includes('How to Play')) return '🎯'
  if (title.includes('Catchphrase')) return '💬'
  return '📜'
}

export default function StoryDisplay({ story, effect }: StoryDisplayProps) {
  const allSections = parseMarkdownSections(story)
  // Filter out the "Your New Form" section with the table - it's shown in FormSummary now
  const sections = allSections.filter(s => !s.title?.startsWith('Your New Form'))
  const hasStructuredContent = sections.some(s => s.title)

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 space-y-5">
      <h3 className="text-xs text-slate-400 font-semibold tracking-wider">THE ARCHIVIST&apos;S CHRONICLE</h3>

      {hasStructuredContent ? (
        <div className="space-y-5">
          {sections.map((section, index) => (
            <div key={index} className="space-y-2">
              {section.title && (
                <h4 className={`font-semibold flex items-center gap-2 ${
                  section.title.startsWith('Your New Form')
                    ? 'text-lg text-gold-400'
                    : section.title.includes('Catchphrase')
                    ? 'text-sm text-amber-300'
                    : 'text-sm text-gold-400'
                }`}>
                  <span>{getSectionIcon(section.title)}</span>
                  {section.title}
                </h4>
              )}
              {section.content && (
                <div className={
                  section.title?.includes('Catchphrase')
                    ? 'border-l-2 border-gold-500 pl-3'
                    : ''
                }>
                  {renderContent(section.content, section.title?.includes('Roleplay Moment'))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{story}</p>
      )}

      <div className="pt-4 border-t border-slate-700">
        <h4 className="text-xs text-gold-400 font-semibold tracking-wider mb-2 flex items-center gap-2">
          <span>🎲</span> QUIRKS
        </h4>
        <p className="text-sm text-slate-300 italic">{effect}</p>
      </div>
    </div>
  )
}
