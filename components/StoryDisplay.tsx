'use client'

interface StoryDisplayProps {
  story: string | null
  isRegenerist: boolean
}

export default function StoryDisplay({ story, isRegenerist }: StoryDisplayProps) {
  if (!story || story.trim().length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <p className="text-sm text-slate-400 text-center">
          {isRegenerist
            ? "This character's story is told in The Archivist's Chronicle."
            : "No backstory written yet. Click 'Edit Character' to add one."}
        </p>
      </div>
    )
  }

  if (isRegenerist) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <p className="text-sm text-slate-400 text-center">
          This character's story is told in The Archivist's Chronicle.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <div className="prose prose-invert prose-slate max-w-none">
        <div className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed">{story}</div>
      </div>
    </div>
  )
}
