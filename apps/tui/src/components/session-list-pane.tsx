import type { UsageSession } from '@agent-ledger/service'

import { truncatePathSuffix } from '../path-truncation.ts'

interface SessionListPaneProps {
  activeFilter: string
  height: number
  selectedSessionIndex: number
  sessions: UsageSession[]
  sortDirection: 'asc' | 'desc'
  sortKey: 'recent' | 'token_usage' | 'est_cost'
  width: number
}

function formatAgent(agent: UsageSession['agent']) {
  return agent === 'pi' ? 'pi' : agent[0].toUpperCase() + agent.slice(1)
}

function formatTimestamp(value: string) {
  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return parsedDate.toISOString().slice(5, 16).replace('T', ' ')
}

function formatUsd(value: number | null) {
  if (value === null) {
    return 'n/a'
  }

  return `$${value.toFixed(2)}`
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`
}

function fitLine(value: string, width: number) {
  return truncate(value, width).padEnd(width, ' ')
}

function formatTokens(value: number, columnWidth: number) {
  const integerValue = Math.round(value)
  const formatted = integerValue.toLocaleString()

  if (formatted.length <= columnWidth) {
    return formatted
  }

  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(integerValue)
}

function pad(value: string, width: number, mode: 'start' | 'end-path' = 'start') {
  const formatted = mode === 'end-path' ? truncatePathSuffix(value, width) : truncate(value, width)
  return formatted.padEnd(width, ' ')
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

function buildCenteredTopBorder(title: string, innerWidth: number): string {
  const safeTitle = truncate(title, Math.max(1, innerWidth))
  const decoratedTitle = safeTitle.length + 2 <= innerWidth ? ` ${safeTitle} ` : safeTitle
  const totalFill = Math.max(0, innerWidth - decoratedTitle.length)
  const leftFill = Math.floor(totalFill / 2)
  const rightFill = totalFill - leftFill
  return `┌${'─'.repeat(leftFill)}${decoratedTitle}${'─'.repeat(rightFill)}┐`
}

export function SessionListPane({
  activeFilter,
  height,
  selectedSessionIndex,
  sessions,
  sortDirection,
  sortKey,
  width,
}: SessionListPaneProps) {
  const contentWidth = Math.max(8, width - 2)
  const rowCapacity = Math.max(1, height - 2)
  const compactMode = contentWidth < 58

  const agentWidth = 11
  const tokensWidth = 9
  const costWidth = 9
  const messagesWidth = 5
  const startedWidth = 12

  const compactProjectWidth = Math.max(
    8,
    contentWidth - (2 + agentWidth + 1 + tokensWidth + 1 + costWidth + 3),
  )
  const fullProjectWidth = Math.max(
    8,
    contentWidth -
      (2 + agentWidth + 1 + tokensWidth + 1 + costWidth + 1 + messagesWidth + 1 + startedWidth + 4),
  )

  const headerLine = compactMode
    ? `${' '.repeat(2)}${pad('Agent', agentWidth)} ${pad('Project', compactProjectWidth)} ${pad('Tokens', tokensWidth)} ${pad('Est Cost', costWidth)}`
    : `${' '.repeat(2)}${pad('Agent', agentWidth)} ${pad('Project', fullProjectWidth)} ${pad('Tokens', tokensWidth)} ${pad('Est Cost', costWidth)} ${pad('Msgs', messagesWidth)} ${pad('Started', startedWidth)}`
  const headerDivider = compactMode
    ? `${' '.repeat(2)}${'─'.repeat(agentWidth)} ${'─'.repeat(compactProjectWidth)} ${'─'.repeat(tokensWidth)} ${'─'.repeat(costWidth)}`
    : `${' '.repeat(2)}${'─'.repeat(agentWidth)} ${'─'.repeat(fullProjectWidth)} ${'─'.repeat(tokensWidth)} ${'─'.repeat(costWidth)} ${'─'.repeat(messagesWidth)} ${'─'.repeat(startedWidth)}`

  const staticRows = 3
  const visibleSessionCount = Math.max(1, rowCapacity - staticRows)
  const startIndex = Math.min(
    Math.max(0, selectedSessionIndex - Math.floor(visibleSessionCount / 2)),
    Math.max(0, sessions.length - visibleSessionCount),
  )
  const visibleSessions = sessions.slice(startIndex, startIndex + visibleSessionCount)
  const topBorder = buildCenteredTopBorder(`Sessions | Agent: ${activeFilter}`, contentWidth)
  const bottomBorder = `└${'─'.repeat(contentWidth)}┘`
  const rows = [
    fitLine(
      `Sort: ${formatSortKey(sortKey)} ${sortDirection.toUpperCase()} | keys: s/a`,
      contentWidth,
    ),
    fitLine(headerLine, contentWidth),
    fitLine(headerDivider, contentWidth),
    ...(visibleSessions.length === 0
      ? [fitLine('No sessions found', contentWidth)]
      : visibleSessions.map((session, visibleIndex) => {
          const isSelected = startIndex + visibleIndex === selectedSessionIndex

          if (compactMode) {
            const compactRow =
              `${isSelected ? '>' : ' '} ` +
              `${pad(formatAgent(session.agent), agentWidth)} ` +
              `${pad(session.projectPath ?? 'unknown', compactProjectWidth, 'end-path')} ` +
              `${pad(formatTokens(session.tokenTotals.total, tokensWidth), tokensWidth)} ` +
              `${pad(formatUsd(session.estimatedCostUsd), costWidth)}`

            return fitLine(compactRow, contentWidth)
          }

          const fullRow =
            `${isSelected ? '>' : ' '} ` +
            `${pad(formatAgent(session.agent), agentWidth)} ` +
            `${pad(session.projectPath ?? 'unknown', fullProjectWidth, 'end-path')} ` +
            `${pad(formatTokens(session.tokenTotals.total, tokensWidth), tokensWidth)} ` +
            `${pad(formatUsd(session.estimatedCostUsd), costWidth)} ` +
            `${pad(String(session.messageCount), messagesWidth)} ` +
            `${pad(formatTimestamp(session.startedAt), startedWidth)}`

          return fitLine(fullRow, contentWidth)
        })),
  ].slice(0, rowCapacity)
  const framedRows = [
    ...rows,
    ...new Array<number>(Math.max(0, rowCapacity - rows.length)).fill(0).map(() => ''),
  ]
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
      {framedRows.map((row) => {
        const rowKey = row.length > 0 ? row : '__blank__'
        const count = (counts.get(rowKey) ?? 0) + 1
        counts.set(rowKey, count)
        const content = row.padEnd(contentWidth, ' ')
        return <text key={`${rowKey}-${count}`}>{`│${content}│`}</text>
      })}
      <text>{bottomBorder}</text>
    </box>
  )
}
