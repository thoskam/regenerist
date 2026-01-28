'use client'

import React from 'react'
import type { Entry } from '@/lib/types/5etools'

interface EntryRendererProps {
  entries: Entry[] | string
  className?: string
}

// Convert 5eTools tags to display text with styling
function renderInlineText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const tagRegex = /{@(\w+)\s+([^|}]+)(?:\|[^}]*)?}/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tagRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }

    const [, tagType, tagContent] = match
    const key = `tag-${match.index}`

    // Style different tag types
    switch (tagType) {
      case 'spell':
      case 'item':
        parts.push(
          <span key={key} className="text-gold-400 italic">
            {tagContent}
          </span>
        )
        break
      case 'dice':
      case 'damage':
        parts.push(
          <span key={key} className="text-blue-400 font-mono">
            {tagContent}
          </span>
        )
        break
      case 'condition':
      case 'status':
        parts.push(
          <span key={key} className="text-red-400">
            {tagContent}
          </span>
        )
        break
      case 'action':
      case 'skill':
        parts.push(
          <span key={key} className="text-emerald-400">
            {tagContent}
          </span>
        )
        break
      case 'creature':
      case 'race':
      case 'class':
        parts.push(
          <span key={key} className="text-purple-400">
            {tagContent}
          </span>
        )
        break
      case 'b':
        parts.push(
          <strong key={key} className="font-semibold">
            {tagContent}
          </strong>
        )
        break
      case 'i':
        parts.push(
          <em key={key} className="italic">
            {tagContent}
          </em>
        )
        break
      default:
        parts.push(tagContent)
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

function EntryItem({ entry, depth = 0 }: { entry: Entry; depth?: number }) {
  if (typeof entry === 'string') {
    return <p className="mb-2 last:mb-0">{renderInlineText(entry)}</p>
  }

  if (!entry || typeof entry !== 'object') {
    return null
  }

  switch (entry.type) {
    case 'entries':
    case 'section':
    case 'inset':
      return (
        <div className={`${depth > 0 ? 'ml-4' : ''} mb-3`}>
          {entry.name && (
            <h4 className="font-semibold text-gold-400 mb-1">{entry.name}</h4>
          )}
          {entry.entries.map((e, i) => (
            <EntryItem key={i} entry={e} depth={depth + 1} />
          ))}
        </div>
      )

    case 'list':
      return (
        <div className="mb-3">
          {entry.name && (
            <h4 className="font-semibold text-gold-400 mb-1">{entry.name}</h4>
          )}
          <ul className="list-disc list-inside space-y-1 ml-2">
            {entry.items.map((item, i) => (
              <li key={i} className="text-slate-300">
                {typeof item === 'string' ? (
                  renderInlineText(item)
                ) : (
                  <EntryItem entry={item} depth={depth + 1} />
                )}
              </li>
            ))}
          </ul>
        </div>
      )

    case 'table':
      return (
        <div className="mb-3 overflow-x-auto">
          {entry.caption && (
            <div className="font-semibold text-gold-400 mb-2">{entry.caption}</div>
          )}
          <table className="w-full text-sm">
            {entry.colLabels && (
              <thead>
                <tr className="border-b border-slate-600">
                  {entry.colLabels.map((label, i) => (
                    <th key={i} className="text-left py-1 px-2 text-slate-400 font-medium">
                      {renderInlineText(label)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {entry.rows.map((row, i) => (
                <tr key={i} className="border-b border-slate-700 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="py-1 px-2 text-slate-300">
                      {typeof cell === 'string' ? (
                        renderInlineText(cell)
                      ) : (
                        <EntryItem entry={cell} depth={depth + 1} />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'quote':
      return (
        <blockquote className="border-l-2 border-gold-500 pl-3 my-3 italic text-slate-400">
          {entry.entries.map((e, i) => (
            <EntryItem key={i} entry={e} depth={depth} />
          ))}
          {entry.by && (
            <footer className="text-sm mt-1 not-italic">— {entry.by}</footer>
          )}
        </blockquote>
      )

    case 'insetReadaloud':
      return (
        <div className="bg-slate-700/50 border border-slate-600 rounded p-3 my-3 italic">
          {entry.entries.map((e, i) => (
            <EntryItem key={i} entry={e} depth={depth} />
          ))}
        </div>
      )

    case 'refOptionalfeature':
      return (
        <p className="text-slate-400 mb-2">
          [See: {entry.optionalfeature.split('|')[0]}]
        </p>
      )

    case 'refClassFeature':
      return (
        <p className="text-slate-400 mb-2">
          [See: {entry.classFeature.split('|')[0]}]
        </p>
      )

    case 'refSubclassFeature':
      return (
        <p className="text-slate-400 mb-2">
          [See: {entry.subclassFeature.split('|')[0]}]
        </p>
      )

    default:
      // Handle unknown types by checking for entries
      if ('entries' in entry && Array.isArray((entry as { entries: Entry[] }).entries)) {
        return (
          <>
            {(entry as { entries: Entry[] }).entries.map((e, i) => (
              <EntryItem key={i} entry={e} depth={depth} />
            ))}
          </>
        )
      }
      return null
  }
}

export default function EntryRenderer({ entries, className = '' }: EntryRendererProps) {
  const entryArray = typeof entries === 'string' ? [entries] : entries

  return (
    <div className={`text-slate-300 text-sm leading-relaxed ${className}`}>
      {entryArray.map((entry, i) => (
        <EntryItem key={i} entry={entry} />
      ))}
    </div>
  )
}
