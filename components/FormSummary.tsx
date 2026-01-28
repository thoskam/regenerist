'use client'

interface FormSummaryProps {
  race: string
  className: string
  subclass: string
  effect: string
  story: string
}

function extractFormTitle(story: string): string | null {
  const match = story.match(/##\s*Your New Form:\s*(.+)/i)
  return match ? match[1].trim() : null
}

function extractTableData(story: string): { race: string; class: string; effect: string } | null {
  const lines = story.split('\n').filter(line => line.trim().startsWith('|'))
  if (lines.length < 4) return null // header + separator + at least 1 row

  const parseRow = (line: string): string[] => {
    return line
      .split('|')
      .slice(1, -1)
      .map(cell => cell.trim())
  }

  const rows = lines.slice(2).map(parseRow) // Skip header and separator

  const data: { race: string; class: string; effect: string } = {
    race: '',
    class: '',
    effect: '',
  }

  for (const row of rows) {
    if (row[0]?.toLowerCase() === 'race') {
      data.race = row[2] || ''
    } else if (row[0]?.toLowerCase() === 'class') {
      data.class = row[2] || ''
    } else if (row[0]?.toLowerCase() === 'effect') {
      data.effect = row[2] || ''
    }
  }

  return data.race || data.class || data.effect ? data : null
}

export default function FormSummary({ race, className, subclass, effect, story }: FormSummaryProps) {
  const formTitle = extractFormTitle(story)
  const tableData = extractTableData(story)

  return (
    <div>
      {formTitle && (
        <h3 className="text-lg font-bold text-gold-400 mb-4 flex items-center gap-2">
          <span>🎭</span> {formTitle}
        </h3>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-600">
              <th className="text-left py-2 px-3 text-gold-400 font-semibold w-20">Category</th>
              <th className="text-left py-2 px-3 text-gold-400 font-semibold w-28">Result</th>
              <th className="text-left py-2 px-3 text-gold-400 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-700">
              <td className="py-3 px-3 text-slate-400 font-medium">Race</td>
              <td className="py-3 px-3 text-white font-medium">{race}</td>
              <td className="py-3 px-3 text-slate-300 text-sm">
                {tableData?.race || 'Unique racial traits and abilities.'}
              </td>
            </tr>
            <tr className="border-b border-slate-700">
              <td className="py-3 px-3 text-slate-400 font-medium">Class</td>
              <td className="py-3 px-3 text-white font-medium">{className}: {subclass}</td>
              <td className="py-3 px-3 text-slate-300 text-sm">
                {tableData?.class || 'Specialized class features and combat style.'}
              </td>
            </tr>
            <tr className="border-b border-slate-700">
              <td className="py-3 px-3 text-slate-400 font-medium">Effect</td>
              <td className="py-3 px-3 text-white font-medium">{effect.split(':')[0]}</td>
              <td className="py-3 px-3 text-slate-300 text-sm">
                {tableData?.effect || effect.split(':')[1]?.trim() || effect}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
