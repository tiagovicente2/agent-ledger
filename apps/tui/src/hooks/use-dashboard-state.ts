import { loadSnapshot, type SummarySnapshot } from '@agent-ledger/service'
import { useCallback, useEffect, useState } from 'react'

export interface DashboardState {
  error: string | null
  isRefreshing: boolean
  refresh: () => Promise<void>
  snapshot: SummarySnapshot | null
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

export function useDashboardState(): DashboardState {
  const [snapshot, setSnapshot] = useState<SummarySnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(true)

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    setError(null)

    try {
      setSnapshot(await loadSnapshot())
    } catch (loadError) {
      setError(toErrorMessage(loadError))
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    error,
    isRefreshing,
    refresh,
    snapshot,
  }
}
