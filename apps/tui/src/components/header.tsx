import type { SummarySnapshot } from '@agent-ledger/service'

interface HeaderProps {
  activeTab: string
  error: string | null
  isRefreshing: boolean
  snapshot: SummarySnapshot | null
  sortDirection: 'asc' | 'desc'
  sortKey: 'recent' | 'token_usage' | 'est_cost'
  tabs: readonly string[]
  timeWindow: string
  warningCount: number
  width: number
}

function formatGeneratedAt(value: string | null) {
  if (!value) {
    return 'not loaded yet'
  }

  return new Date(value).toLocaleString()
}

function formatLabel(value: string) {
  return value[0].toUpperCase() + value.slice(1)
}

function formatSortKey(value: 'recent' | 'token_usage' | 'est_cost') {
  if (value === 'token_usage') {
    return 'Token Usage'
  }

  if (value === 'est_cost') {
    return 'Est Cost'
  }

  return 'Recent'
}

function fitLine(value: string, width: number) {
  const maxWidth = Math.max(20, width - 2)

  if (value.length >= maxWidth) {
    return `${value.slice(0, Math.max(0, maxWidth - 3))}...`
  }

  return value.padEnd(maxWidth, ' ')
}

export function Header({
  activeTab,
  error,
  isRefreshing,
  snapshot,
  sortDirection,
  sortKey,
  tabs,
  timeWindow,
  warningCount,
  width,
}: HeaderProps) {
  const status = error ? `load failed (${error})` : isRefreshing ? 'refreshing' : 'ready'
  const tabStrip = tabs
    .map(
      (tab, index) =>
        `${activeTab === tab ? '[' : ''}${index + 1}:${tab}${activeTab === tab ? ']' : ''}`,
    )
    .join(' ')
  const lines = [
    'Agent Ledger',
    `Status: ${status}`,
    `Tabs: ${tabStrip}`,
    `Window: ${formatLabel(timeWindow)} | Sort: ${formatSortKey(sortKey)} ${sortDirection.toUpperCase()} | Warnings: ${warningCount}`,
    `Keys: 1-${tabs.length} [ ] t s a j/k enter w r q`,
    `Generated: ${formatGeneratedAt(snapshot?.generatedAt ?? null)}`,
  ]
  const visibleLines = lines.slice(0, 6)

  return (
    <box
      style={{
        border: true,
        flexDirection: 'column',
        height: 8,
        padding: 0,
      }}
    >
      {visibleLines.map((line) => (
        <text key={line}>{fitLine(line, width)}</text>
      ))}
    </box>
  )
}
