import type { UsageSession } from '@agent-ledger/service'

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
  return agent[0].toUpperCase() + agent.slice(1)
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

function pad(value: string, width: number) {
  return truncate(value, width).padEnd(width, ' ')
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

export function SessionListPane({
  activeFilter,
  height,
  selectedSessionIndex,
  sessions,
  sortDirection,
  sortKey,
  width,
}: SessionListPaneProps) {
  const contentWidth = Math.max(20, width - 2)
  const visibleSessionCount = Math.max(1, height - 5)
  const startIndex = Math.min(
    Math.max(0, selectedSessionIndex - Math.floor(visibleSessionCount / 2)),
    Math.max(0, sessions.length - visibleSessionCount),
  )
  const visibleSessions = sessions.slice(startIndex, startIndex + visibleSessionCount)
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

  return (
    <box
      style={{
        border: true,
        flexDirection: 'column',
        height,
        width,
        padding: 0,
      }}
    >
      <text>{fitLine(`Sessions | Agent: ${activeFilter}`, contentWidth)}</text>
      <text>
        {fitLine(
          `Sort: ${formatSortKey(sortKey)} ${sortDirection.toUpperCase()} | keys: s/a`,
          contentWidth,
        )}
      </text>
      <text>{fitLine(headerLine, contentWidth)}</text>
      {visibleSessions.length === 0 ? (
        <text>{fitLine('No sessions found', contentWidth)}</text>
      ) : null}
      {visibleSessions.map((session, visibleIndex) => {
        const isSelected = startIndex + visibleIndex === selectedSessionIndex

        if (compactMode) {
          const compactRow =
            `${isSelected ? '>' : ' '} ` +
            `${pad(formatAgent(session.agent), agentWidth)} ` +
            `${pad(session.projectPath ?? 'unknown', compactProjectWidth)} ` +
            `${pad(formatTokens(session.tokenTotals.total, tokensWidth), tokensWidth)} ` +
            `${pad(formatUsd(session.estimatedCostUsd), costWidth)}`

          return <text key={session.id}>{fitLine(compactRow, contentWidth)}</text>
        }

        const fullRow =
          `${isSelected ? '>' : ' '} ` +
          `${pad(formatAgent(session.agent), agentWidth)} ` +
          `${pad(session.projectPath ?? 'unknown', fullProjectWidth)} ` +
          `${pad(formatTokens(session.tokenTotals.total, tokensWidth), tokensWidth)} ` +
          `${pad(formatUsd(session.estimatedCostUsd), costWidth)} ` +
          `${pad(String(session.messageCount), messagesWidth)} ` +
          `${pad(formatTimestamp(session.startedAt), startedWidth)}`

        return <text key={session.id}>{fitLine(fullRow, contentWidth)}</text>
      })}
    </box>
  )
}
