'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CalculatedStats } from './types'

interface UseCharacterStatsOptions {
  characterSlug: string
  refreshTrigger?: number
  enabled?: boolean
}

export function useCharacterStats({ characterSlug, refreshTrigger, enabled = true }: UseCharacterStatsOptions) {
  const [stats, setStats] = useState<CalculatedStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/characters/${characterSlug}/stats`)

      if (!res.ok) {
        throw new Error('Failed to fetch stats')
      }

      const data = await res.json()
      setStats(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [characterSlug])

  useEffect(() => {
    if (enabled) {
      fetchStats()
    }
  }, [fetchStats, refreshTrigger, enabled])

  return {
    stats,
    isLoading,
    error,
    refresh: fetchStats,
  }
}
