import type {
  CostMode,
  CostProvenance,
  CostStatus,
  SummaryTotals,
  UsageMessage,
  UsageSession,
} from './types'

interface ResolvedMessageCost {
  provenance: Exclude<CostProvenance, 'mixed' | 'none'> | 'none'
  usd: number | null
}

export interface AggregatedCost {
  costProvenance: CostProvenance
  costStatus: CostStatus
  costUsd: number | null
  missingCostMessageCount: number
  missingCostTokenTotal: number
}

function isZeroTokenMessage(message: UsageMessage) {
  return message.tokens.total <= 0
}

export function resolveMessageCost(
  message: UsageMessage,
  mode: CostMode = 'auto',
): ResolvedMessageCost {
  if (mode === 'display') {
    return {
      usd: message.sourceCostUsd,
      provenance: message.sourceCostUsd === null ? 'none' : 'source',
    }
  }

  if (mode === 'calculate') {
    return {
      usd: message.catalogCostUsd,
      provenance: message.catalogCostUsd === null ? 'none' : 'catalog',
    }
  }

  if (message.sourceCostUsd !== null) {
    return {
      usd: message.sourceCostUsd,
      provenance: 'source',
    }
  }

  if (message.catalogCostUsd !== null) {
    return {
      usd: message.catalogCostUsd,
      provenance: 'catalog',
    }
  }

  return {
    usd: null,
    provenance: 'none',
  }
}

export function aggregateMessageCosts(
  messages: UsageMessage[],
  mode: CostMode = 'auto',
): AggregatedCost {
  let total = 0
  let sourceCount = 0
  let catalogCount = 0
  let resolvedCount = 0
  let missingCostMessageCount = 0
  let missingCostTokenTotal = 0

  for (const message of messages) {
    const resolved = resolveMessageCost(message, mode)

    if (resolved.usd !== null) {
      total += resolved.usd
      resolvedCount += 1

      if (resolved.provenance === 'source') {
        sourceCount += 1
      }

      if (resolved.provenance === 'catalog') {
        catalogCount += 1
      }

      continue
    }

    if (isZeroTokenMessage(message)) {
      continue
    }

    missingCostMessageCount += 1
    missingCostTokenTotal += message.tokens.total
  }

  const costUsd = resolvedCount > 0 ? total : null
  const costProvenance: CostProvenance =
    resolvedCount === 0
      ? 'none'
      : sourceCount > 0 && catalogCount > 0
        ? 'mixed'
        : sourceCount > 0
          ? 'source'
          : 'catalog'

  const costStatus: CostStatus =
    resolvedCount === 0
      ? 'missing'
      : missingCostMessageCount > 0
        ? 'partial'
        : sourceCount > 0 && catalogCount === 0
          ? 'exact'
          : 'estimated'

  return {
    costUsd: costUsd === null ? null : Number(total.toFixed(6)),
    costStatus,
    costProvenance,
    missingCostMessageCount,
    missingCostTokenTotal,
  }
}

export function aggregateSummaryCosts(sessions: UsageSession[]): Pick<
  SummaryTotals,
  'costStatus' | 'costProvenance' | 'totalCostUsd'
> {
  const costSessions = sessions.filter((session) => session.costUsd !== null)

  if (costSessions.length === 0) {
    return {
      totalCostUsd: null,
      costStatus: 'missing',
      costProvenance: 'none',
    }
  }

  const totalCostUsd = Number(
    costSessions.reduce((total, session) => total + (session.costUsd ?? 0), 0).toFixed(6),
  )
  const hasMissingSession = sessions.some((session) => session.costUsd === null)
  const hasPartialSession = sessions.some((session) => session.costStatus === 'partial')
  const provenances = new Set(
    costSessions
      .map((session) => session.costProvenance)
      .filter((provenance): provenance is Exclude<CostProvenance, 'none'> => provenance !== 'none'),
  )

  const costProvenance: CostProvenance =
    provenances.size === 0
      ? 'none'
      : provenances.size === 1
        ? [...provenances][0]
        : 'mixed'

  const costStatus: CostStatus =
    hasMissingSession || hasPartialSession
      ? 'partial'
      : sessions.every((session) => session.costStatus === 'exact')
        ? 'exact'
        : 'estimated'

  return {
    totalCostUsd,
    costStatus,
    costProvenance,
  }
}
