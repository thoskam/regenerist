'use client'

import type { HydratedActiveState } from '@/lib/types/5etools'
import DeathSaves from './DeathSaves'
import ConditionsTracker from './ConditionsTracker'
import ExhaustionTracker from './ExhaustionTracker'
import ConcentrationTracker from './ConcentrationTracker'
import TempHpTracker from './TempHpTracker'

interface CombatStatusPanelProps {
  characterSlug: string
  activeState: HydratedActiveState
  onUpdate: () => void
}

export default function CombatStatusPanel({ characterSlug, activeState, onUpdate }: CombatStatusPanelProps) {
  const updateDeathSaves = async (successes: number, failures: number) => {
    await fetch(`/api/characters/${characterSlug}/active-state/death-saves`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ successes, failures }),
    })
    onUpdate()
  }

  const updateConditions = async (conditions: string[]) => {
    await fetch(`/api/characters/${characterSlug}/active-state/conditions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conditions }),
    })
    onUpdate()
  }

  const updateExhaustion = async (level: number) => {
    await fetch(`/api/characters/${characterSlug}/active-state/exhaustion`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level }),
    })
    onUpdate()
  }

  const updateConcentration = async (spellName: string | null) => {
    await fetch(`/api/characters/${characterSlug}/active-state/concentration`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spellName }),
    })
    onUpdate()
  }

  const updateTempHp = async (tempHp: number) => {
    await fetch(`/api/characters/${characterSlug}/active-state/temp-hp`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempHp }),
    })
    onUpdate()
  }

  return (
    <div className="space-y-4">
      <ConcentrationTracker
        spellName={activeState.concentratingOn}
        onBreak={() => updateConcentration(null)}
      />
      <DeathSaves
        successes={activeState.deathSaveSuccesses}
        failures={activeState.deathSaveFailures}
        currentHp={activeState.currentHp}
        onUpdate={updateDeathSaves}
      />
      <TempHpTracker tempHp={activeState.tempHp} onUpdate={updateTempHp} />
      <ConditionsTracker
        activeConditions={activeState.conditions as string[]}
        onUpdate={updateConditions}
      />
      <ExhaustionTracker level={activeState.exhaustionLevel} onUpdate={updateExhaustion} />
    </div>
  )
}
