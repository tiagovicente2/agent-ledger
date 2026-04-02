import type { SummaryTotals } from '@agent-ledger/service'

interface SummaryPaneProps {
  height: number
  totals: SummaryTotals
}

function formatCount(value: number) {
  return value.toLocaleString()
}

function formatUsd(value: number | null) {
  if (value === null) {
    return 'unavailable'
  }

  return `$${value.toFixed(2)}`
}

export function SummaryPane({ height, totals }: SummaryPaneProps) {
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
      <text>Totals</text>
      <text>Sessions: {formatCount(totals.sessionsCount)}</text>
      <text>Tokens: {formatCount(totals.tokens.total)}</text>
      <text>Input: {formatCount(totals.tokens.input)}</text>
      <text>Output: {formatCount(totals.tokens.output)}</text>
      <text>Reasoning: {formatCount(totals.tokens.reasoning)}</text>
      <text>Cache read: {formatCount(totals.tokens.cacheRead)}</text>
      <text>Cache write: {formatCount(totals.tokens.cacheWrite)}</text>
      <text>Estimated cost: {formatUsd(totals.totalEstimatedCostUsd)}</text>
    </box>
  )
}
