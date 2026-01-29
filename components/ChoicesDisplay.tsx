'use client'

import { useState } from 'react'
import choiceDescriptionsData from '@/lib/data/choiceDescriptions.json'

interface ChoiceData {
  featureName: string
  level: number
  choices: Record<string, string>
}

type ChoiceDescriptions = Record<string, ChoiceData>

const choiceDescriptions = choiceDescriptionsData as ChoiceDescriptions

interface Feature {
  name: string
  level: number
  description: string
}

interface ChoicesDisplayProps {
  className: string
  subclass: string
  subclassChoice: string | null
  level: number
  subclassFeatures?: Feature[]
  subclassName?: string
}

function getChoiceKey(className: string, subclass: string): string | null {
  // Try different key formats used in the JSON
  const keyFormats = [
    `${className}: ${subclass}`,              // "Barbarian: Path of the Totem Warrior"
    `${subclass} (${className})`,             // "Draconic Bloodline (Sorcerer)"
    `${className}: School of ${subclass}`,    // "Wizard: School of Illusion"
  ]

  for (const key of keyFormats) {
    if (choiceDescriptions[key]) {
      return key
    }
  }

  // Check for class-wide choices (e.g., all Warlocks get Pact Boon)
  const classWideKeys: Record<string, string> = {
    Warlock: 'Warlock: Pact Boon',
  }

  const classWideKey = classWideKeys[className]
  if (classWideKey && choiceDescriptions[classWideKey]) {
    return classWideKey
  }

  return null
}

export default function ChoicesDisplay({
  className,
  subclass,
  subclassChoice,
  level,
  subclassFeatures = [],
  subclassName,
}: ChoicesDisplayProps) {
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set())

  const choiceKey = getChoiceKey(className, subclass)
  const choiceData = choiceKey ? choiceDescriptions[choiceKey] : null
  const choiceDescription = choiceData && subclassChoice ? choiceData.choices[subclassChoice] : null

  const toggleFeature = (featureName: string) => {
    const newExpanded = new Set(expandedFeatures)
    if (newExpanded.has(featureName)) {
      newExpanded.delete(featureName)
    } else {
      newExpanded.add(featureName)
    }
    setExpandedFeatures(newExpanded)
  }

  // Group features by level
  const featuresByLevel = subclassFeatures.reduce((acc, feature) => {
    const lvl = feature.level
    if (!acc[lvl]) acc[lvl] = []
    acc[lvl].push(feature)
    return acc
  }, {} as Record<number, Feature[]>)

  const levels = Object.keys(featuresByLevel)
    .map(Number)
    .sort((a, b) => a - b)

  // Check if we have any content to show
  const hasChoice = choiceData && subclassChoice
  const hasFeatures = subclassFeatures.length > 0

  if (!hasChoice && !hasFeatures) {
    return (
      <div className="text-center py-4">
        <p className="text-slate-500 text-sm">No subclass features available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Subclass header */}
      {subclassName && (
        <div className="flex items-center justify-between">
          <h3 className="text-xs text-slate-400 font-semibold tracking-wider">
            {subclassName.toUpperCase()}
          </h3>
        </div>
      )}

      {/* The Choice Made - highlighted at top */}
      {hasChoice && choiceDescription && (
        <div className={`rounded-lg border ${level >= choiceData.level ? 'border-gold-500/50 bg-gold-500/5' : 'border-slate-600 bg-slate-900/30'} p-4`}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className={`font-semibold ${level >= choiceData.level ? 'text-gold-400' : 'text-slate-500'}`}>
                {choiceData.featureName}
              </h4>
              <p className="text-xs text-slate-500">Level {choiceData.level} Choice</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${level >= choiceData.level ? 'bg-gold-500/20 text-gold-400' : 'bg-slate-700 text-slate-500'}`}>
              {level >= choiceData.level ? 'Active' : `Unlocks Lv. ${choiceData.level}`}
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white font-medium">{subclassChoice}</span>
            </div>
            <p className={`text-sm leading-relaxed ${level >= choiceData.level ? 'text-slate-300' : 'text-slate-500'}`}>
              {choiceDescription}
            </p>
          </div>
        </div>
      )}

      {/* Subclass Features grouped by level */}
      {hasFeatures && (
        <div className="space-y-4">
          {levels.map((lvl) => {
            // Skip the choice level if we already showed the choice above
            const features = featuresByLevel[lvl]

            return (
              <div key={lvl}>
                <div className="text-xs text-slate-500 mb-2">Level {lvl}</div>
                <div className="space-y-2">
                  {features.map((feature) => {
                    const isExpanded = expandedFeatures.has(feature.name)
                    const isAvailable = lvl <= level

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
                                Lvl {lvl}
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
            )
          })}
        </div>
      )}
    </div>
  )
}
