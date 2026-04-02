import type { UsageSession } from '@agent-ledger/service'

interface SessionDetailsPaneProps {
  detailsExpanded: boolean
  height: number
  session: UsageSession | null
  warningsOpen: boolean
  warnings: string[]
  width: number
}

function formatUsd(value: number | null) {
  if (value === null) {
    return 'unavailable'
  }

  return `$${value.toFixed(2)}`
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString()
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

export function SessionDetailsPane({
  detailsExpanded,
  height,
  session,
  warningsOpen,
  warnings,
  width,
}: SessionDetailsPaneProps) {
  const contentWidth = Math.max(20, width - 2)
  const compactLines = session
    ? [
        { key: 'agent', text: `Agent: ${session.agent}` },
        { key: 'tokens', text: `Tokens: ${session.tokenTotals.total.toLocaleString()}` },
        { key: 'cost', text: `Est Cost: ${formatUsd(session.estimatedCostUsd)}` },
        { key: 'messages', text: `Messages: ${session.messageCount}` },
        { key: 'started', text: `Started: ${formatTimestamp(session.startedAt)}` },
      ]
    : [{ key: 'empty', text: 'No session selected' }]

  const extendedLines = session
    ? [
        ...compactLines,
        { key: 'ended', text: `Ended: ${formatTimestamp(session.endedAt)}` },
        { key: 'project', text: `Project: ${session.projectPath ?? 'unknown'}` },
        {
          key: 'models',
          text: `Models: ${session.modelsUsed.join(', ') || 'unknown'}`,
        },
        { key: 'confidence', text: `Confidence: ${session.confidence}` },
        {
          key: 'native-id',
          text: `Native ID: ${session.nativeSessionId ?? 'derived'}`,
        },
        ...(session.inferenceReason
          ? [{ key: 'reason', text: `Reason: ${session.inferenceReason}` }]
          : []),
      ]
    : compactLines

  const warningLines = warningsOpen
    ? warnings.slice(0, 4).map((warning, index) => ({
        key: `warning-${index}`,
        text: `Warn: ${warning}`,
      }))
    : []

  const lines = [
    ...(detailsExpanded ? extendedLines : compactLines),
    {
      key: 'controls',
      text: `Expand: ${detailsExpanded ? 'on' : 'off'} | Warnings: ${warningsOpen ? 'on' : 'off'}`,
    },
    ...warningLines,
  ]
  const visibleLines = lines.slice(0, Math.max(1, height - 3))

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
      <text>Session Details</text>
      {visibleLines.map((line) => (
        <text key={line.key}>{fitLine(line.text, contentWidth)}</text>
      ))}
    </box>
  )
}
