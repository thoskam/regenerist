'use client'

const ALIGNMENTS = [
  ['Lawful Good', 'Neutral Good', 'Chaotic Good'],
  ['Lawful Neutral', 'True Neutral', 'Chaotic Neutral'],
  ['Lawful Evil', 'Neutral Evil', 'Chaotic Evil'],
] as const

export const ALIGNMENT_SHORT: Record<string, string> = {
  'Lawful Good': 'LG',
  'Neutral Good': 'NG',
  'Chaotic Good': 'CG',
  'Lawful Neutral': 'LN',
  'True Neutral': 'TN',
  'Chaotic Neutral': 'CN',
  'Lawful Evil': 'LE',
  'Neutral Evil': 'NE',
  'Chaotic Evil': 'CE',
}

const SELECTED_STYLE: Record<string, string> = {
  'Lawful Good':     'bg-blue-600 border-blue-400 text-white',
  'Neutral Good':    'bg-green-600 border-green-400 text-white',
  'Chaotic Good':    'bg-teal-600 border-teal-400 text-white',
  'Lawful Neutral':  'bg-slate-500 border-slate-300 text-white',
  'True Neutral':    'bg-slate-600 border-slate-400 text-white',
  'Chaotic Neutral': 'bg-orange-600 border-orange-400 text-white',
  'Lawful Evil':     'bg-purple-700 border-purple-500 text-white',
  'Neutral Evil':    'bg-red-700 border-red-500 text-white',
  'Chaotic Evil':    'bg-red-900 border-red-700 text-white',
}

interface AlignmentPickerProps {
  value: string
  onChange: (v: string) => void
}

export default function AlignmentPicker({ value, onChange }: AlignmentPickerProps) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5" style={{ maxWidth: 260 }}>
        {ALIGNMENTS.map((row) =>
          row.map((alignment) => {
            const selected = value === alignment
            return (
              <button
                key={alignment}
                type="button"
                onClick={() => onChange(selected ? '' : alignment)}
                title={alignment}
                className={`px-1 py-2.5 rounded-lg border transition-all text-center ${
                  selected
                    ? SELECTED_STYLE[alignment]
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                }`}
              >
                <div className="text-sm font-bold leading-none">{ALIGNMENT_SHORT[alignment]}</div>
                <div className="text-[9px] mt-1 leading-tight opacity-70 font-normal">{alignment}</div>
              </button>
            )
          })
        )}
      </div>
      {value && (
        <p className="text-xs text-slate-400 mt-2">
          <span className="text-white font-medium">{value}</span>
          <button
            type="button"
            onClick={() => onChange('')}
            className="ml-2 text-slate-500 hover:text-slate-300 underline"
          >
            clear
          </button>
        </p>
      )}
    </div>
  )
}
