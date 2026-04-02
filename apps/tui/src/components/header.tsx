import type { SummarySnapshot } from '@agent-ledger/service'

interface HeaderProps {
  error: string | null
  isRefreshing: boolean
  snapshot: SummarySnapshot | null
}

function formatGeneratedAt(value: string | null) {
  if (!value) {
    return 'not loaded yet'
  }

  return new Date(value).toLocaleString()
}

export function Header({ error, isRefreshing, snapshot }: HeaderProps) {
  const status = error ? 'load failed' : isRefreshing ? 'refreshing' : 'ready'

  return (
    <box
      style={{
        border: true,
        flexDirection: 'column',
        height: 5,
        padding: 1,
      }}
    >
      <text>Agent Ledger</text>
      <text>Status: {status}</text>
      <text>Keys: r refresh | q quit</text>
      <text>Generated: {formatGeneratedAt(snapshot?.generatedAt ?? null)}</text>
      {error ? <text>Error: {error}</text> : null}
    </box>
  )
}
