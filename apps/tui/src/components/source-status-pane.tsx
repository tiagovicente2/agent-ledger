import type { SourceState } from '@agent-ledger/service'

interface SourceStatusPaneProps {
  height: number
  sources: SourceState[]
}

function formatAgent(agent: SourceState['agent']) {
  return agent[0].toUpperCase() + agent.slice(1)
}

export function SourceStatusPane({ height, sources }: SourceStatusPaneProps) {
  const visibleSources = sources.slice(0, Math.max(1, Math.floor((height - 3) / 2)))

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
      <text>Sources</text>
      {visibleSources.map((source) => (
        <box key={source.agent} style={{ flexDirection: 'column' }}>
          <text>
            {formatAgent(source.agent)} | {source.status} | {source.supportLevel}
          </text>
          <text>
            {source.discoveredPaths.length} paths | {source.warnings.length} warnings
          </text>
        </box>
      ))}
    </box>
  )
}
