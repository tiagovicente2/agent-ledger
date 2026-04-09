import {
  type AgentName,
  loadSnapshot,
  type SummarySnapshot,
  type UsageSession,
} from '@agent-ledger/service'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  buildTokenTrend,
  filterSessions,
  type SortDirection,
  type SortKey,
  sortSessions,
  type TimeWindow,
  type TrendPoint,
} from '../view-models/overview.ts'

export type ActiveAgent = AgentName | 'all'

export const AGENT_TABS: readonly ActiveAgent[] = ['all', 'claude', 'gemini', 'opencode', 'codex', 'pi']

export const TIME_WINDOW_OPTIONS: readonly TimeWindow[] = ['24h', '7d', '30d', 'all']
export const SORT_KEY_OPTIONS: readonly SortKey[] = ['recent', 'token_usage', 'est_cost']
export const SORT_DIRECTION_OPTIONS: readonly SortDirection[] = ['desc', 'asc']

export interface DashboardState {
  activeAgent: ActiveAgent
  filteredSessions: UsageSession[]
  error: string | null
  isRefreshing: boolean
  refresh: () => Promise<void>
  setActiveAgent: (agent: ActiveAgent) => void
  setSortDirection: (direction: SortDirection) => void
  setSortKey: (key: SortKey) => void
  setTimeWindow: (window: TimeWindow) => void
  snapshot: SummarySnapshot | null
  sortDirection: SortDirection
  sortKey: SortKey
  timeWindow: TimeWindow
  trend: TrendPoint[]
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
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('7d')
  const [sortKey, setSortKey] = useState<SortKey>('recent')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [activeAgent, setActiveAgent] = useState<ActiveAgent>('all')
  const latestRequestIdRef = useRef(0)
  const activeRefreshCountRef = useRef(0)

  const filteredSessions = useMemo(() => {
    if (!snapshot) {
      return []
    }

    return sortSessions(filterSessions(snapshot, activeAgent, timeWindow), sortKey, sortDirection)
  }, [snapshot, activeAgent, timeWindow, sortKey, sortDirection])

  const trend = useMemo(() => buildTokenTrend(filteredSessions), [filteredSessions])

  const refresh = useCallback(async () => {
    const requestId = latestRequestIdRef.current + 1
    latestRequestIdRef.current = requestId
    activeRefreshCountRef.current += 1

    setIsRefreshing(true)

    try {
      const nextSnapshot = await loadSnapshot()

      if (requestId === latestRequestIdRef.current) {
        setSnapshot(nextSnapshot)
        setError(null)
      }
    } catch (loadError) {
      if (requestId === latestRequestIdRef.current) {
        setError(toErrorMessage(loadError))
      }
    } finally {
      activeRefreshCountRef.current = Math.max(0, activeRefreshCountRef.current - 1)

      if (activeRefreshCountRef.current === 0) {
        setIsRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    activeAgent,
    filteredSessions,
    error,
    isRefreshing,
    refresh,
    setActiveAgent,
    setSortDirection,
    setSortKey,
    setTimeWindow,
    snapshot,
    sortDirection,
    sortKey,
    timeWindow,
    trend,
  }
}
