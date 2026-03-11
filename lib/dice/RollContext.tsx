'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import type { RollResult, AdvantageState } from './types'

interface RollSettings {
  showAnimations: boolean
  enableAINarration: boolean
  soundEnabled: boolean
  autoSendToRoll20: boolean
}

interface RollContextType {
  rollHistory: RollResult[]
  addRoll: (roll: RollResult) => void
  clearHistory: () => void
  currentRoll: RollResult | null
  showRollResult: (roll: RollResult) => void
  dismissRollResult: () => void
  globalAdvantage: AdvantageState
  setGlobalAdvantage: (state: AdvantageState) => void
  settings: RollSettings
  updateSettings: (settings: Partial<RollSettings>) => void
  sendToRoll20: (roll: RollResult) => void
  roll20Connected: boolean
  setRoll20Connected: (connected: boolean) => void
  campaignId: string | null
  setCampaignId: (id: string | null) => void
}

const defaultSettings: RollSettings = {
  showAnimations: true,
  enableAINarration: false,
  soundEnabled: true,
  autoSendToRoll20: false,
}

const RollContext = createContext<RollContextType | null>(null)

export function useRoll() {
  const context = useContext(RollContext)
  if (!context) {
    throw new Error('useRoll must be used within RollProvider')
  }
  return context
}

/**
 * Build a pre-formatted Roll20 chat message showing the actual result
 * from the app rather than re-rolling in Roll20.
 *
 * Format: /me rolled Longsword Attack [d20: 7] +5 = 12 ⚡ CRITICAL!
 */
function buildRoll20Message(roll: RollResult): string {
  const diceStr = roll.dice.map((d) => `${d.count}${d.die}`).join('+')

  // Show dice breakdown with the actual result
  let rollDetail: string
  if (!diceStr) {
    // Flat value — no dice (e.g. unarmed strike base damage)
    const suffix2 = roll.isCriticalSuccess ? ' ⚡ CRITICAL HIT!' : roll.isCriticalFailure ? ' 💀 FUMBLE!' : ''
    return `/me rolled **${roll.rollName}** = **${roll.total}**${suffix2}`
  } else if (roll.advantageState !== 'normal' && roll.advantageRolls && roll.advantageRolls.length > 0) {
    const type = roll.advantageState === 'advantage' ? 'Adv' : 'Dis'
    rollDetail = `[${diceStr} ${type}: ${roll.advantageRolls.join(', ')} → kept ${roll.naturalRoll}]`
  } else {
    rollDetail = `[${diceStr}: ${roll.naturalRoll}]`
  }

  const modStr =
    roll.modifier > 0 ? ` +${roll.modifier}` : roll.modifier < 0 ? ` ${roll.modifier}` : ''

  let suffix = ''
  if (roll.isCriticalSuccess) suffix = ' ⚡ CRITICAL HIT!'
  else if (roll.isCriticalFailure) suffix = ' 💀 FUMBLE!'

  return `/me rolled **${roll.rollName}** ${rollDetail}${modStr} = **${roll.total}**${suffix}`
}

export function RollProvider({ children }: { children: React.ReactNode }) {
  const [rollHistory, setRollHistory] = useState<RollResult[]>([])
  const [currentRoll, setCurrentRoll] = useState<RollResult | null>(null)
  const [globalAdvantage, setGlobalAdvantage] = useState<AdvantageState>('normal')
  const [settings, setSettings] = useState<RollSettings>(defaultSettings)
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [roll20Connected, setRoll20Connected] = useState(false)

  const sendToRoll20 = useCallback((roll: RollResult) => {
    if (typeof window === 'undefined') return
    const message = buildRoll20Message(roll)
    window.postMessage(
      {
        source: 'REGENERIST_APP',
        type: 'SEND_ROLL',
        roll: { message },
      },
      '*'
    )
  }, [])

  const addRoll = useCallback(
    (roll: RollResult) => {
      setRollHistory((prev) => [roll, ...prev].slice(0, 50))
      setCurrentRoll(roll)
      if (settings.autoSendToRoll20 && roll20Connected) {
        sendToRoll20(roll)
      }
    },
    [sendToRoll20, settings.autoSendToRoll20, roll20Connected]
  )

  const clearHistory = useCallback(() => {
    setRollHistory([])
  }, [])

  const showRollResult = useCallback((roll: RollResult) => {
    setCurrentRoll(roll)
  }, [])

  const dismissRollResult = useCallback(() => {
    setCurrentRoll(null)
  }, [])

  const updateSettings = useCallback((newSettings: Partial<RollSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
  }, [])

  return (
    <RollContext.Provider
      value={{
        rollHistory,
        addRoll,
        clearHistory,
        currentRoll,
        showRollResult,
        dismissRollResult,
        globalAdvantage,
        setGlobalAdvantage,
        settings,
        updateSettings,
        sendToRoll20,
        roll20Connected,
        setRoll20Connected,
        campaignId,
        setCampaignId,
      }}
    >
      {children}
    </RollContext.Provider>
  )
}
