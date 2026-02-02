'use client'

import { useState } from 'react'
import conditions from '@/lib/data/conditions.json'

interface ConditionsTrackerProps {
  activeConditions: string[]
  onUpdate: (conditions: string[]) => void
}

export default function ConditionsTracker({ activeConditions, onUpdate }: ConditionsTrackerProps) {
  const [showPicker, setShowPicker] = useState(false)

  const toggleCondition = (conditionId: string) => {
    if (activeConditions.includes(conditionId)) {
      onUpdate(activeConditions.filter((c) => c !== conditionId))
    } else {
      onUpdate([...activeConditions, conditionId])
    }
  }

  const activeConditionData = conditions.conditions.filter((c) => activeConditions.includes(c.id))

  return (
    <div className="border border-slate-600 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold">Conditions</h3>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="text-sm px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded"
        >
          {showPicker ? 'Done' : '+ Add'}
        </button>
      </div>

      {activeConditionData.length > 0 ? (
        <div className="space-y-2 mb-3">
          {activeConditionData.map((condition) => (
            <div key={condition.id} className="bg-red-900/30 border border-red-600 rounded p-2">
              <div className="flex justify-between items-start">
                <span className="font-medium">
                  {condition.icon} {condition.name}
                </span>
                <button
                  onClick={() => toggleCondition(condition.id)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  ✕ Remove
                </button>
              </div>
              <ul className="text-xs text-slate-400 mt-1 list-disc list-inside">
                {condition.effects.map((effect, i) => (
                  <li key={i}>{effect}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-500 text-sm mb-3">No active conditions</p>
      )}

      {showPicker && (
        <div className="border-t border-slate-600 pt-3 mt-3 grid grid-cols-2 gap-2">
          {conditions.conditions.map((condition) => (
            <button
              key={condition.id}
              onClick={() => toggleCondition(condition.id)}
              className={`text-left p-2 rounded text-sm ${
                activeConditions.includes(condition.id)
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              {condition.icon} {condition.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
