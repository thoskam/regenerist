'use client'

import { useState, useEffect, useCallback } from 'react'

export interface RollPayload {
  formula: string   // e.g. "1d20+5"
  label: string     // e.g. "STR Check" or "Longsword Attack"
}

export interface Roll20Status {
  available: boolean   // extension is installed
  connected: boolean   // Roll20 tab is open and ready
  tabCount: number
}

export function useRoll20() {
  const [status, setStatus] = useState<Roll20Status>({
    available: false,
    connected: false,
    tabCount: 0,
  })

  useEffect(() => {
    // Listen for messages from the extension content script
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return
      if (!event.data || event.data.source !== 'REGENERIST_BRIDGE') return

      if (event.data.type === 'EXTENSION_READY') {
        setStatus((prev) => ({ ...prev, available: true }))
        // Ask for current status
        window.postMessage({ source: 'REGENERIST_APP', type: 'GET_STATUS' }, '*')
      }

      if (event.data.type === 'STATUS_UPDATE') {
        setStatus({
          available: true,
          connected: event.data.connected ?? false,
          tabCount: event.data.tabCount ?? 0,
        })
      }
    }

    window.addEventListener('message', handler)

    // Probe for extension on mount (may already be loaded)
    window.postMessage({ source: 'REGENERIST_APP', type: 'GET_STATUS' }, '*')

    return () => window.removeEventListener('message', handler)
  }, [])

  const sendRoll = useCallback(
    (roll: RollPayload): boolean => {
      if (!status.available || !status.connected) return false
      window.postMessage({ source: 'REGENERIST_APP', type: 'SEND_ROLL', roll }, '*')
      return true
    },
    [status.available, status.connected]
  )

  return { status, sendRoll }
}
