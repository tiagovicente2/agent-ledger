export const STATUS_BAR_HEIGHT = 1

interface StatusBarProps {
  activeTab: string
  error: string | null
  generatedAt: string | null
  isRefreshing: boolean
  selectedSessionCount: number
  selectedSessionIndex: number
  sortDirection: 'asc' | 'desc'
  sortKey: 'recent' | 'token_usage' | 'est_cost'
  tabs: readonly string[]
  timeWindow: string
  warningCount: number
  width: number
}

function formatSortKey(value: 'recent' | 'token_usage' | 'est_cost') {
  if (value === 'token_usage') {
    return 'tokens'
  }

  if (value === 'est_cost') {
    return 'cost'
  }

  return 'recent'
}

function fitLine(value: string, width: number) {
  const safeWidth = Math.max(8, width)

  if (value.length >= safeWidth) {
    return `${value.slice(0, Math.max(0, safeWidth - 3))}...`
  }

  const totalPadding = safeWidth - value.length
  const leftPadding = Math.floor(totalPadding / 2)
  const rightPadding = totalPadding - leftPadding

  return `${' '.repeat(leftPadding)}${value}${' '.repeat(rightPadding)}`
}

function formatGeneratedAt(value: string | null) {
  if (!value) {
    return 'not loaded'
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString([], {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'numeric',
  })
}

export function StatusBar({
  activeTab,
  error,
  generatedAt,
  isRefreshing,
  selectedSessionCount,
  selectedSessionIndex,
  sortDirection,
  sortKey,
  tabs,
  timeWindow,
  warningCount,
  width,
}: StatusBarProps) {
  const selectionLabel =
    selectedSessionCount > 0 ? `${selectedSessionIndex + 1}/${selectedSessionCount}` : '0/0'
  const stateLabel = error ? 'error' : isRefreshing ? 'refresh' : 'ready'
  const tabStrip = tabs
    .map(
      (tab, index) =>
        `${activeTab === tab ? '[' : ''}${index + 1}:${tab}${activeTab === tab ? ']' : ''}`,
    )
    .join(' ')
  const tabSummary = width >= 128 ? tabStrip : `tab ${activeTab}`
  const standardMessage = [
    stateLabel,
    tabSummary,
    `win ${timeWindow}`,
    `${formatSortKey(sortKey)} ${sortDirection}`,
    `warn ${warningCount}`,
    `sel ${selectionLabel}`,
    `gen ${formatGeneratedAt(generatedAt)}`,
    'w details',
    '? help',
  ].join(' | ')
  const message = fitLine(
    width < 72
      ? `${activeTab} | ${timeWindow} | ${selectionLabel} | w${warningCount} | ?`
      : standardMessage,
    width,
  )

  return (
    <box backgroundColor="black" width={width}>
      <text>{message}</text>
    </box>
  )
}
