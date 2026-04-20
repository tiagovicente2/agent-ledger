import type { AgentName, SummarySnapshot, UsageSession } from '@agent-ledger/service'

export type TimeWindow = '24h' | '7d' | '30d' | 'all'
export type SortKey = 'recent' | 'token_usage' | 'est_cost'
export type SortDirection = 'asc' | 'desc'

export interface TrendPoint {
  label: string
  tokens: number
}

export function filterSessions(
  snapshot: SummarySnapshot,
  agent: AgentName | 'all',
  window: TimeWindow,
): UsageSession[] {
  const now = Date.now()
  const cutoffMs =
    window === '24h'
      ? 24 * 60 * 60 * 1000
      : window === '7d'
        ? 7 * 24 * 60 * 60 * 1000
        : window === '30d'
          ? 30 * 24 * 60 * 60 * 1000
          : Number.POSITIVE_INFINITY

  return snapshot.sessions.filter((session) => {
    if (agent !== 'all' && session.agent !== agent) {
      return false
    }

    if (!Number.isFinite(cutoffMs)) {
      return true
    }

    return now - Date.parse(session.startedAt) <= cutoffMs
  })
}

function compareByStartedAt(left: UsageSession, right: UsageSession) {
  const leftStartedAt = Date.parse(left.startedAt)
  const rightStartedAt = Date.parse(right.startedAt)
  const hasComparableTimestamps = Number.isFinite(leftStartedAt) && Number.isFinite(rightStartedAt)

  if (hasComparableTimestamps) {
    return rightStartedAt - leftStartedAt
  }

  return right.startedAt.localeCompare(left.startedAt)
}

function getCostStatusRank(session: UsageSession) {
  switch (session.costStatus) {
    case 'exact':
      return 3
    case 'estimated':
      return 2
    case 'partial':
      return 1
    case 'missing':
      return 0
  }
}

function compareByKey(left: UsageSession, right: UsageSession, key: SortKey) {
  if (key === 'token_usage' && right.tokenTotals.total !== left.tokenTotals.total) {
    return right.tokenTotals.total - left.tokenTotals.total
  }

  if (key === 'est_cost') {
    const leftCost = left.costUsd ?? Number.NEGATIVE_INFINITY
    const rightCost = right.costUsd ?? Number.NEGATIVE_INFINITY

    if (rightCost !== leftCost) {
      return rightCost - leftCost
    }

    const statusOrder = getCostStatusRank(right) - getCostStatusRank(left)

    if (statusOrder !== 0) {
      return statusOrder
    }
  }

  return compareByStartedAt(left, right)
}

export function sortSessions(
  sessions: UsageSession[],
  key: SortKey,
  direction: SortDirection,
): UsageSession[] {
  const copy = [...sessions]

  copy.sort((left, right) => {
    const keyOrder = compareByKey(left, right, key)

    if (keyOrder !== 0) {
      return direction === 'desc' ? keyOrder : -keyOrder
    }

    return left.id.localeCompare(right.id)
  })

  return copy
}

export function buildTokenTrend(sessions: UsageSession[]): TrendPoint[] {
  const byDay = new Map<string, number>()

  for (const session of sessions) {
    const day = session.startedAt.slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + session.tokenTotals.total)
  }

  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, tokens]) => ({ label, tokens }))
}
