'use client'

import { useState } from 'react'

interface Feature {
  name: string
  level: number
  description: string
}

interface FeatureDisplayProps {
  title: string
  features: Feature[]
  currentLevel: number
  noContainer?: boolean
}

export default function FeatureDisplay({ title, features, currentLevel, noContainer = false }: FeatureDisplayProps) {
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set())

  const toggleFeature = (featureName: string) => {
    const newExpanded = new Set(expandedFeatures)
    if (newExpanded.has(featureName)) {
      newExpanded.delete(featureName)
    } else {
      newExpanded.add(featureName)
    }
    setExpandedFeatures(newExpanded)
  }

  const expandAll = () => {
    setExpandedFeatures(new Set(features.map((f) => f.name)))
  }

  const collapseAll = () => {
    setExpandedFeatures(new Set())
  }

  // Group features by level
  const featuresByLevel = features.reduce((acc, feature) => {
    const level = feature.level
    if (!acc[level]) acc[level] = []
    acc[level].push(feature)
    return acc
  }, {} as Record<number, Feature[]>)

  const levels = Object.keys(featuresByLevel)
    .map(Number)
    .sort((a, b) => a - b)

  if (features.length === 0) {
    return null
  }

  const content = (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs text-slate-400 font-semibold tracking-wider">{title}</h3>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Expand all
          </button>
          <span className="text-slate-600">|</span>
          <button
            onClick={collapseAll}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Collapse all
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {levels.map((level) => (
          <div key={level}>
            <div className="text-xs text-slate-500 mb-2">Level {level}</div>
            <div className="space-y-2">
              {featuresByLevel[level].map((feature) => {
                const isExpanded = expandedFeatures.has(feature.name)
                const isAvailable = level <= currentLevel

                return (
                  <div
                    key={feature.name}
                    className={`border rounded-lg overflow-hidden transition-colors ${
                      isAvailable
                        ? 'border-slate-600 bg-slate-700/50'
                        : 'border-slate-700 bg-slate-800/50 opacity-60'
                    }`}
                  >
                    <button
                      onClick={() => toggleFeature(feature.name)}
                      className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium ${
                            isAvailable ? 'text-gold-400' : 'text-slate-500'
                          }`}
                        >
                          {feature.name}
                        </span>
                        {!isAvailable && (
                          <span className="text-xs text-slate-600 bg-slate-700 px-1.5 py-0.5 rounded">
                            Lvl {level}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-slate-500 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      >
                        ▼
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="px-3 py-2 border-t border-slate-600">
                        <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {feature.description}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  )

  if (noContainer) {
    return content
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      {content}
    </div>
  )
}
