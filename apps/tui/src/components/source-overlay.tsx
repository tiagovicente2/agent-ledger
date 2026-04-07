import type { SummarySnapshot } from '@agent-ledger/service'

import { formatPathLeaf } from '../path-truncation.ts'

interface SourceOverlayProps {
  error: string | null
  height: number
  snapshot: SummarySnapshot
  width: number
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`
}

export function SourceOverlay({ error, height, snapshot, width }: SourceOverlayProps) {
  const overlayWidth = Math.max(42, Math.min(width - 4, 86))
  const left = Math.max(0, Math.floor((width - overlayWidth) / 2))
  const top = Math.max(1, Math.floor((height - 18) / 2))
  const rowWidth = overlayWidth - 4
  const sourceRows = snapshot.sources.map((source) => {
    const pathCount = source.discoveredPaths.length
    const pathSummary = pathCount > 0 ? formatPathLeaf(source.discoveredPaths[0]) : 'no paths'

    return truncate(
      `${source.agent.padEnd(8, ' ')} ${source.status.padEnd(12, ' ')} ${source.supportLevel.padEnd(10, ' ')} ${pathCount} path${pathCount === 1 ? '' : 's'} ${pathSummary}`,
      rowWidth,
    )
  })
  const warningRows = [
    ...(error ? [`Load error: ${error}`] : []),
    ...snapshot.warnings,
    ...snapshot.sources.flatMap((source) =>
      source.warnings.map((warning) => `${source.agent}: ${warning}`),
    ),
  ]
  const visibleWarnings = warningRows.length > 0 ? warningRows : ['No source warnings']

  return (
    <box
      backgroundColor="black"
      border
      flexDirection="column"
      left={left}
      padding={1}
      position="absolute"
      top={top}
      width={overlayWidth}
      zIndex={20}
    >
      <text>
        <strong>Source Health</strong>
      </text>
      <text>Press Esc, q, or w to close.</text>
      <text marginTop={1}>
        <strong>Discovery</strong>
      </text>
      {sourceRows.length > 0 ? (
        sourceRows.map((row) => <text key={row}>{row}</text>)
      ) : (
        <text>No source state loaded yet.</text>
      )}
      <text marginTop={1}>
        <strong>Warnings</strong>
      </text>
      {visibleWarnings.slice(0, Math.max(3, height - 12)).map((warning) => (
        <text key={warning}>{truncate(warning, rowWidth)}</text>
      ))}
    </box>
  )
}
