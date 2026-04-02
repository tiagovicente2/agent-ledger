import type { UsageSession } from '@agent-ledger/service'

interface SessionListPaneProps {
  height: number
  sessions: UsageSession[]
}

function formatAgent(agent: UsageSession['agent']) {
  return agent[0].toUpperCase() + agent.slice(1)
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString()
}

function formatUsd(value: number | null) {
  if (value === null) {
    return 'unavailable'
  }

  return `$${value.toFixed(2)}`
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`
}

export function SessionListPane({ height, sessions }: SessionListPaneProps) {
  const recentSessions = sessions.slice(0, Math.max(1, Math.floor((height - 3) / 2)))

  return (
    <box
      style={{
        border: true,
        flexDirection: 'column',
        height,
        width: '50%',
        padding: 1,
      }}
    >
      <text>Recent Sessions</text>
      {recentSessions.length === 0 ? <text>No sessions found</text> : null}
      {recentSessions.map((session) => (
        <box key={session.id} style={{ flexDirection: 'column' }}>
          <text>
            {formatAgent(session.agent)} | {truncate(formatTimestamp(session.startedAt), 18)} |{' '}
            {session.messageCount} msgs
          </text>
          <text>
            {truncate(session.projectPath ?? 'unknown project', 20)} |{' '}
            {session.tokenTotals.total.toLocaleString()} tok | {formatUsd(session.estimatedCostUsd)}
          </text>
        </box>
      ))}
    </box>
  )
}
