'use client'

import { useState } from 'react'
import { X, BookOpen, Sparkles, Loader2 } from 'lucide-react'

interface ArchivistConsultModalProps {
  isOpen: boolean
  onClose: () => void
  characterSlug: string
  lifeId: number
}

interface ArchivistResponse {
  advice: string
  suggestedSpells?: string[]
}

const QUICK_PROMPTS = [
  {
    label: 'Best combat spells?',
    question: 'What are my best options for dealing damage and controlling the battlefield in combat?',
    context: 'combat' as const,
  },
  {
    label: 'Preparation advice',
    question: 'What spells should I prepare for a typical adventuring day with exploration and combat?',
    context: 'preparation' as const,
  },
  {
    label: 'Defensive options',
    question: 'What are my best defensive and protective spells? When should I use them?',
    context: 'combat' as const,
  },
  {
    label: 'Utility spells',
    question: 'Which of my spells are best for solving problems outside of combat?',
    context: 'general' as const,
  },
]

export default function ArchivistConsultModal({
  isOpen,
  onClose,
  characterSlug,
  lifeId,
}: ArchivistConsultModalProps) {
  const [question, setQuestion] = useState('')
  const [context, setContext] = useState<'general' | 'preparation' | 'combat'>('general')
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<ArchivistResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!question.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/characters/${characterSlug}/lives/${lifeId}/archivist-consult`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), context }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to get response')
      }

      const data: ArchivistResponse = await res.json()
      setResponse(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to consult The Archivist')
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickPrompt = (prompt: typeof QUICK_PROMPTS[0]) => {
    setQuestion(prompt.question)
    setContext(prompt.context)
  }

  const handleReset = () => {
    setResponse(null)
    setQuestion('')
    setError(null)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-400">The Archivist</h2>
              <p className="text-xs text-slate-400">Keeper of Magical Knowledge</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {!response ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-300">
                Ask The Archivist for spell recommendations, tactical advice, or explanations about your magical abilities.
              </p>

              {/* Quick Prompts */}
              <div>
                <span className="text-xs text-slate-400 font-medium">QUICK QUESTIONS</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickPrompt(prompt)}
                      className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                    >
                      {prompt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Input */}
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">
                  YOUR QUESTION
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What spells should I prepare for a dungeon crawl?"
                  className="w-full h-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-300 placeholder-slate-500 resize-none focus:outline-none focus:border-amber-500"
                  maxLength={500}
                />
                <div className="text-xs text-slate-500 text-right mt-1">
                  {question.length}/500
                </div>
              </div>

              {/* Context Selector */}
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">
                  CONTEXT
                </label>
                <select
                  value={context}
                  onChange={(e) => setContext(e.target.value as 'general' | 'preparation' | 'combat')}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="general">General Question</option>
                  <option value="preparation">Spell Preparation</option>
                  <option value="combat">Combat / Tactical</option>
                </select>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-3 bg-red-900/30 border border-red-600/50 rounded-lg text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={!question.trim() || isLoading}
                className={`
                  w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all
                  ${!question.trim() || isLoading
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-500 text-white'
                  }
                `}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Consulting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Ask The Archivist
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Advice Display */}
              <div className="bg-slate-700/50 rounded-lg p-4 border-l-4 border-amber-500">
                <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {response.advice}
                </p>
              </div>

              {/* Suggested Spells */}
              {response.suggestedSpells && response.suggestedSpells.length > 0 && (
                <div>
                  <span className="text-xs text-slate-400 font-medium block mb-2">
                    SUGGESTED SPELLS
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {response.suggestedSpells.map((spell, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded text-sm font-medium"
                      >
                        {spell}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleReset}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium transition-colors"
                >
                  Ask Another Question
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
