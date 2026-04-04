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

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`
}

function fitLine(value: string, maxWidth: number) {
  const safeWidth = Math.max(8, maxWidth)

  if (value.length >= safeWidth) {
    return `${value.slice(0, Math.max(0, safeWidth - 3))}...`
  }

  return value.padEnd(safeWidth, ' ')
}

function formatCompactTokens(value: number) {
  if (value >= 1_000_000_000) {
    const amount = value / 1_000_000_000
    return `${amount >= 10 ? Math.round(amount) : amount.toFixed(1).replace(/\.0$/, '')}B`
  }

  if (value >= 1_000_000) {
    const amount = value / 1_000_000
    return `${amount >= 10 ? Math.round(amount) : amount.toFixed(1).replace(/\.0$/, '')}M`
  }

  if (value >= 1_000) {
    const amount = value / 1_000
    return `${amount >= 10 ? Math.round(amount) : amount.toFixed(1).replace(/\.0$/, '')}K`
  }

  return String(Math.round(value))
}

function formatUsd(value: number | null) {
  if (value === null) {
    return 'n/a'
  }

  return `$${value.toFixed(2)}`
}

function buildBar(value: number, maxValue: number, maxWidth: number): string {
  if (value <= 0) {
    return ''
  }

  const ratio = value / Math.max(1, maxValue)
  const length = Math.max(1, Math.round(ratio * maxWidth))
  return '█'.repeat(length)
}

function buildCenteredTopBorder(title: string, innerWidth: number): string {
  const safeTitle = truncate(title, Math.max(1, innerWidth))
  const decoratedTitle = safeTitle.length + 2 <= innerWidth ? ` ${safeTitle} ` : safeTitle
  const totalFill = Math.max(0, innerWidth - decoratedTitle.length)
  const leftFill = Math.floor(totalFill / 2)
  const rightFill = totalFill - leftFill
  return `┌${'─'.repeat(leftFill)}${decoratedTitle}${'─'.repeat(rightFill)}┐`
}

function renderSection(title: string, lines: string[], width: number, height: number) {
  const innerWidth = Math.max(8, width - 2)
  const rowCapacity = Math.max(1, height - 2)
  const topMarginRows = 0
  const availableContentRows = Math.max(0, rowCapacity - topMarginRows)
  const visibleLines = (lines.length > 0 ? lines : ['No data']).slice(0, availableContentRows)
  const framedRows = [
    ...new Array<number>(topMarginRows).fill(0).map(() => ''),
    ...visibleLines,
    ...new Array<number>(Math.max(0, rowCapacity - topMarginRows - visibleLines.length))
      .fill(0)
      .map(() => ''),
  ]
  const topBorder = buildCenteredTopBorder(title, innerWidth)
  const bottomBorder = `└${'─'.repeat(innerWidth)}┘`
  const counts = new Map<string, number>()

  return (
    <box
      style={{
        flexDirection: 'column',
        height,
        width,
        padding: 0,
      }}
    >
      <text>{topBorder}</text>
      {framedRows.map((line) => {
        const lineKey = line.length > 0 ? line : '__blank__'
        const count = (counts.get(lineKey) ?? 0) + 1
        counts.set(lineKey, count)
        const content = truncate(line, innerWidth).padEnd(innerWidth, ' ')
        return <text key={`${title}-${lineKey}-${count}`}>{`│${content}│`}</text>
      })}
      <text>{bottomBorder}</text>
    </box>
  )
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
  const headerHeight = 8
  const contentWidth = Math.max(20, width - 2)
  const wideLayout = contentWidth >= 108
  const status = error ? `load failed (${error})` : isRefreshing ? 'refreshing' : 'ready'
  const tabStrip = tabs
    .map(
      (tab, index) =>
        `${activeTab === tab ? '[' : ''}${index + 1}:${tab}${activeTab === tab ? ']' : ''}`,
    )
    .join(' ')
  const lines = [
    `Status: ${status}`,
    `Tabs: ${tabStrip}`,
    `Window: ${formatLabel(timeWindow)} | Sort: ${formatSortKey(sortKey)} ${sortDirection.toUpperCase()} | Warnings: ${warningCount}`,
    `Keys: 1-${tabs.length} [ ] t s a j/k r q`,
    `Generated: ${formatGeneratedAt(snapshot?.generatedAt ?? null)}`,
  ]
  const visibleLines = lines.slice(0, 5)

  const tokenTotal = snapshot?.totals.tokens.total ?? 0
  const tokenRows = [
    { label: 'Input', value: snapshot?.totals.tokens.input ?? 0 },
    { label: 'Output', value: snapshot?.totals.tokens.output ?? 0 },
    { label: 'Reasoning', value: snapshot?.totals.tokens.reasoning ?? 0 },
    { label: 'Cache Read', value: snapshot?.totals.tokens.cacheRead ?? 0 },
    { label: 'Cache Write', value: snapshot?.totals.tokens.cacheWrite ?? 0 },
  ]
    .filter((row) => row.value > 0)
    .sort((left, right) => right.value - left.value)
  const breakdownLines = [
    `Total: ${formatCompactTokens(tokenTotal)}   Cost: ${formatUsd(snapshot?.totals.totalEstimatedCostUsd ?? null)}`,
    ...(tokenRows.length > 0
      ? tokenRows.slice(0, 5).map((row) => {
          const percent = tokenTotal > 0 ? Math.round((row.value / tokenTotal) * 100) : 0
          return `${row.label.padEnd(11, ' ')} ${String(percent).padStart(3, ' ')}% ${formatCompactTokens(row.value).padStart(6, ' ')}`
        })
      : ['No token data']),
  ]

  if (wideLayout) {
    const columnGap = 0
    const leftWidth = Math.floor((width - columnGap) / 2)
    const rightWidth = width - columnGap - leftWidth
    const rightInnerWidth = Math.max(8, rightWidth - 2)
    const labelWidth = Math.min(11, Math.max(8, Math.floor(rightInnerWidth * 0.24)))
    const valueWidth = Math.min(7, Math.max(5, Math.floor(rightInnerWidth * 0.14)))
    const barWidth = Math.max(4, rightInnerWidth - labelWidth - 1 - 4 - 1 - valueWidth - 1)
    const maxBreakdownValue = Math.max(1, ...tokenRows.map((row) => row.value), 1)
    const breakdownRowsWithBars = [
      `Total: ${formatCompactTokens(tokenTotal)}   Cost: ${formatUsd(snapshot?.totals.totalEstimatedCostUsd ?? null)}`,
      ...(tokenRows.length > 0
        ? tokenRows.slice(0, 5).map((row) => {
            const percent = tokenTotal > 0 ? Math.round((row.value / tokenTotal) * 100) : 0
            const label = truncate(row.label, labelWidth).padEnd(labelWidth, ' ')
            const percentLabel = `${percent}%`.padStart(4, ' ')
            const bar = buildBar(row.value, maxBreakdownValue, barWidth).padEnd(barWidth, ' ')
            const value = truncate(formatCompactTokens(row.value), valueWidth).padStart(
              valueWidth,
              ' ',
            )
            return `${label} ${percentLabel} ${bar} ${value}`
          })
        : ['No token data']),
    ]

    return (
      <box
        style={{
          flexDirection: 'row',
          gap: columnGap,
          height: headerHeight,
          width,
          padding: 0,
        }}
      >
        {renderSection('Agent Ledger', visibleLines, leftWidth, headerHeight)}
        {renderSection('Token Breakdown', breakdownRowsWithBars, rightWidth, headerHeight)}
      </box>
    )
  }

  return renderSection('Agent Ledger', visibleLines, width, headerHeight)
}
