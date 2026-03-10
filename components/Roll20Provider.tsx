'use client'

import { useEffect } from 'react'
import { useRoll } from '@/lib/dice/RollContext'

/**
 * Mounts near the app root. Listens for the Regenerist Bridge extension
 * and polls every 10s to keep roll20Connected in sync even after
 * the MV3 service worker restarts.
 */
export default function Roll20Provider() {
  const { setRoll20Connected } = useRoll()

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return
      if (!event.data || event.data.source !== 'REGENERIST_BRIDGE') return

      if (event.data.type === 'EXTENSION_READY' || event.data.type === 'STATUS_UPDATE') {
        setRoll20Connected(event.data.connected ?? false)
      }
    }

    window.addEventListener('message', handler)

    // Ask for status immediately and then every 10s
    // This matches the content script poll interval and handles SW restarts
    const poll = () => window.postMessage({ source: 'REGENERIST_APP', type: 'GET_STATUS' }, '*')
    poll()
    const interval = setInterval(poll, 10000)

    return () => {
      window.removeEventListener('message', handler)
      clearInterval(interval)
    }
  }, [setRoll20Connected])

  return null
}
