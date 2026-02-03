'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import type { RollResult, AdvantageState } from './types'

interface RollSettings {
  showAnimations: boolean
  autoSendToDiscord: boolean
  enableAINarration: boolean
  soundEnabled: boolean
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
  sendToDiscord: (roll: RollResult) => Promise<void>
  campaignId: string | null
  setCampaignId: (id: string | null) => void
}

const defaultSettings: RollSettings = {
  showAnimations: true,
  autoSendToDiscord: false,
  enableAINarration: false,
  soundEnabled: true,
}

const RollContext = createContext<RollContextType | null>(null)

export function useRoll() {
  const context = useContext(RollContext)
  if (!context) {
    throw new Error('useRoll must be used within RollProvider')
  }
  return context
}

export function RollProvider({ children }: { children: React.ReactNode }) {
  const [rollHistory, setRollHistory] = useState<RollResult[]>([])
  const [currentRoll, setCurrentRoll] = useState<RollResult | null>(null)
  const [globalAdvantage, setGlobalAdvantage] = useState<AdvantageState>('normal')
  const [settings, setSettings] = useState<RollSettings>(defaultSettings)
  const [campaignId, setCampaignId] = useState<string | null>(null)

  const sendToDiscord = useCallback(
    async (roll: RollResult) => {
      if (!campaignId) return
      await fetch('/api/rolls/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roll,
          campaignId,
          includeNarration: settings.enableAINarration,
        }),
      })
    },
    [campaignId, settings.enableAINarration]
  )

  const addRoll = useCallback(
    (roll: RollResult) => {
      setRollHistory((prev) => [roll, ...prev].slice(0, 50))
      setCurrentRoll(roll)
      if (settings.autoSendToDiscord && campaignId) {
        void sendToDiscord(roll)
      }
    },
    [campaignId, sendToDiscord, settings.autoSendToDiscord]
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
        sendToDiscord,
        campaignId,
        setCampaignId,
      }}
    >
      {children}
    </RollContext.Provider>
  )
}
