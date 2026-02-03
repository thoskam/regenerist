'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Scroll, Sparkles, Swords, MessageCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import DraggableModule from '@/components/layout/DraggableModule'

interface ChronicleSection {
  title: string
  content: string
}

interface ChronicleModuleProps {
  chronicle: string | null
  quirk?: string | null
  isRegenerist: boolean
}

function parseMarkdownSections(text: string): ChronicleSection[] {
  const sections: ChronicleSection[] = []
  const lines = text.split('\n')
  let currentTitle = ''
  let currentContent: string[] = []

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+(.+)$/)
    if (headerMatch) {
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

  if (currentTitle || currentContent.length > 0) {
    sections.push({
      title: currentTitle,
      content: currentContent.join('\n').trim(),
    })
  }

  return sections.filter((section) => section.title || section.content)
}

function ChronicleSectionBlock({
  icon,
  title,
  isExpanded,
  onToggle,
  children,
}: {
  icon: React.ReactNode
  title: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-slate-700 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <span className="flex items-center gap-2 font-medium text-slate-200">
          {icon}
          {title}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>

      {isExpanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

export default function ChronicleModule({ chronicle, quirk, isRegenerist }: ChronicleModuleProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [expandedSections, setExpandedSections] = useState({
    roleplay: true,
    tactics: true,
    catchphrase: true,
    quirk: true,
  })

  const sections = useMemo(() => {
    if (!chronicle) return []
    return parseMarkdownSections(chronicle).filter(
      (section) => !section.title?.startsWith('Your New Form')
    )
  }, [chronicle])

  const roleplaySection = sections.find((section) =>
    section.title.toLowerCase().includes('roleplay moment')
  )
  const tacticsSection = sections.find((section) =>
    section.title.toLowerCase().includes('how to play')
  )
  const catchphraseSection = sections.find((section) =>
    section.title.toLowerCase().includes('catchphrase')
  )
  const hasStructured =
    Boolean(roleplaySection?.content) ||
    Boolean(tacticsSection?.content) ||
    Boolean(catchphraseSection?.content)

  if (!isRegenerist && !chronicle) {
    return null
  }

  if (!chronicle || chronicle.trim().length === 0) {
    return null
  }

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <DraggableModule moduleId="chronicle">
      <div className="rounded-lg border border-slate-700 bg-slate-800 overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
        >
          <h3 className="font-semibold flex items-center gap-2 text-amber-400">
            <Scroll className="w-5 h-5" />
            The Archivist&apos;s Chronicle
          </h3>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {isExpanded && (
          <div className="border-t border-slate-700">
            {roleplaySection?.content && (
              <ChronicleSectionBlock
                icon={<Sparkles className="w-4 h-4 text-purple-400" />}
                title="The Roleplay Moment"
                isExpanded={expandedSections.roleplay}
                onToggle={() => toggleSection('roleplay')}
              >
                <div className="prose prose-invert prose-slate prose-sm max-w-none">
                  <ReactMarkdown>{roleplaySection.content}</ReactMarkdown>
                </div>
              </ChronicleSectionBlock>
            )}

            {tacticsSection?.content && (
              <ChronicleSectionBlock
                icon={<Swords className="w-4 h-4 text-red-400" />}
                title="How to Play This Life"
                isExpanded={expandedSections.tactics}
                onToggle={() => toggleSection('tactics')}
              >
                <div className="prose prose-invert prose-slate prose-sm max-w-none">
                  <ReactMarkdown>{tacticsSection.content}</ReactMarkdown>
                </div>
              </ChronicleSectionBlock>
            )}

            {catchphraseSection?.content && (
              <ChronicleSectionBlock
                icon={<MessageCircle className="w-4 h-4 text-yellow-400" />}
                title="Signature Catchphrase"
                isExpanded={expandedSections.catchphrase}
                onToggle={() => toggleSection('catchphrase')}
              >
                <blockquote className="border-l-4 border-amber-500 pl-4 italic text-amber-200 text-lg">
                  {catchphraseSection.content.replace(/^\"|\"$/g, '')}
                </blockquote>
              </ChronicleSectionBlock>
            )}

            {quirk && (
              <ChronicleSectionBlock
                icon={<span className="text-lg">🎭</span>}
                title="Quirk"
                isExpanded={expandedSections.quirk}
                onToggle={() => toggleSection('quirk')}
              >
                <p className="text-sm text-slate-300 italic">{quirk}</p>
              </ChronicleSectionBlock>
            )}

            {!hasStructured && (
              <div className="p-4">
                <div className="prose prose-invert prose-slate prose-sm max-w-none">
                  <ReactMarkdown>{chronicle}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DraggableModule>
  )
}
