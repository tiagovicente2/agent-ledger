import type { TokenTotals, UsageSession } from '@agent-ledger/service'

interface SessionDetailsPaneProps {
  detailsExpanded: boolean
  height: number
  session: UsageSession | null
  warningsOpen: boolean
  warnings: string[]
  width: number
}

interface CardDef {
  key: string
  title: string
  rows: string[]
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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function formatUsd(value: number | null) {
  if (value === null) {
    return 'n/a'
  }
  return `$${value.toFixed(2)}`
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString()
}

function formatDuration(startedAt: string, endedAt: string) {
  const started = Date.parse(startedAt)
  const ended = Date.parse(endedAt)

  if (!Number.isFinite(started) || !Number.isFinite(ended)) {
    return 'n/a'
  }

  const diffMs = Math.max(0, ended - started)
  const minutes = Math.floor(diffMs / 60000)

  if (minutes < 1) {
    return '<1m'
  }

  const hours = Math.floor(minutes / 60)
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }

  return `${minutes}m`
}

function buildBar(value: number, maxValue: number, maxWidth: number): string {
  if (value <= 0) {
    return ''
  }
  const ratio = value / Math.max(1, maxValue)
  const length = Math.max(1, Math.round(ratio * maxWidth))
  return '█'.repeat(length)
}

function buildTokenRows(tokens: TokenTotals, labelWidth: number, barWidth: number) {
  const rows = [
    { label: 'Input', value: tokens.input },
    { label: 'Output', value: tokens.output },
    { label: 'Reasoning', value: tokens.reasoning },
    { label: 'Cache Read', value: tokens.cacheRead },
    { label: 'Cache Write', value: tokens.cacheWrite },
  ].filter((row) => row.value > 0)

  const maxValue = Math.max(1, ...rows.map((row) => row.value), tokens.total)

  return rows.map((row) => {
    const bar = buildBar(row.value, maxValue, barWidth).padEnd(barWidth, ' ')
    const percent = tokens.total > 0 ? Math.round((row.value / tokens.total) * 100) : 0
    const label = truncate(row.label, labelWidth).padEnd(labelWidth, ' ')
    return `${label} ${bar} ${row.value.toLocaleString()} (${percent}%)`
  })
}

function planCardHeights(
  totalHeight: number,
  desiredCount: number,
  gap: number,
  minHeight: number,
) {
  if (totalHeight <= 0) {
    return []
  }

  let count = Math.max(1, desiredCount)
  const clampedMin = Math.max(1, Math.min(minHeight, totalHeight))

  while (count > 1 && count * clampedMin + (count - 1) * gap > totalHeight) {
    count -= 1
  }

  const heights = new Array<number>(count).fill(clampedMin)
  let remaining = totalHeight - (count * clampedMin + (count - 1) * gap)
  let index = 0

  while (remaining > 0 && count > 0) {
    heights[index % count] += 1
    remaining -= 1
    index += 1
  }

  return heights
}

function renderCard(
  key: string,
  title: string,
  rows: string[],
  cardWidth: number,
  cardHeight: number,
) {
  const innerWidth = Math.max(8, cardWidth - 2)
  const rowCapacity = Math.max(1, cardHeight - 3)
  const visibleRows = (rows.length > 0 ? rows : ['No data']).slice(0, rowCapacity)
  const counts = new Map<string, number>()

  return (
    <box
      key={key}
      style={{
        border: true,
        borderStyle: 'single',
        flexDirection: 'column',
        height: cardHeight,
        width: cardWidth,
        padding: 0,
      }}
    >
      <text>{truncate(title, innerWidth)}</text>
      {visibleRows.map((row) => {
        const count = (counts.get(row) ?? 0) + 1
        counts.set(row, count)
        return <text key={`${key}-${row}-${count}`}>{truncate(row, innerWidth)}</text>
      })}
    </box>
  )
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
  const contentHeight = Math.max(1, height - 2)
  const controlsLine = `[Enter] Details: ${detailsExpanded ? 'ON' : 'off'} | [w] Warnings: ${warningsOpen ? 'ON' : 'off'}`

  if (contentWidth < 24 || contentHeight < 3) {
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
        <text>
          {truncate(
            session ? `Agent: ${session.agent}` : 'No session selected',
            Math.max(8, contentWidth - 2),
          )}
        </text>
      </box>
    )
  }

  const cardsHeight = Math.max(1, contentHeight - 1)

  if (!session) {
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
        {renderCard('empty', 'Session Summary', ['No session selected'], contentWidth, cardsHeight)}
        <text>{fitLine(controlsLine, contentWidth)}</text>
      </box>
    )
  }

  const wideLayout = contentWidth >= 72 && cardsHeight >= 7
  const localWidth = wideLayout ? Math.floor((contentWidth - 1) / 2) : contentWidth
  const labelWidth = clamp(Math.floor(localWidth * 0.3), 9, 14)
  const barWidth = clamp(Math.floor(localWidth * 0.24), 6, 12)

  const summaryRows = [
    `Agent: ${session.agent}`,
    `Tokens: ${session.tokenTotals.total.toLocaleString()}   Cost: ${formatUsd(session.estimatedCostUsd)}`,
    `Messages: ${session.messageCount}`,
    `Started: ${formatTimestamp(session.startedAt)}`,
    `Ended: ${formatTimestamp(session.endedAt)}`,
    `Duration: ${formatDuration(session.startedAt, session.endedAt)}`,
  ]

  const models = session.modelsUsed.length > 0 ? session.modelsUsed : ['unknown']
  const contextRows = [
    `Project: ${session.projectPath ?? 'unknown'}`,
    `Model: ${models[0]}`,
    ...(models.length > 1 ? [`More models: +${models.length - 1}`] : []),
    `Confidence: ${session.confidence}`,
    `Session: ${session.nativeSessionId ?? 'derived'}`,
    ...(session.inferenceReason ? [`Reason: ${session.inferenceReason}`] : []),
  ]

  const tokenRows = buildTokenRows(session.tokenTotals, labelWidth, barWidth)
  const statusRows = [
    `Details: ${detailsExpanded ? 'ON' : 'off'}`,
    `Warnings: ${warningsOpen ? 'ON' : 'off'}`,
    ...(warningsOpen ? warnings.slice(0, 8).map((warning) => `WARN: ${warning}`) : []),
  ]

  if (wideLayout) {
    const columnGap = 1
    const leftColumnWidth = Math.max(24, Math.floor((contentWidth - columnGap) / 2))
    const rightColumnWidth = contentWidth - columnGap - leftColumnWidth
    const rowGap = 1
    const columnHeights = planCardHeights(cardsHeight, 2, rowGap, 3)

    const leftCards: CardDef[] = [
      { key: 'summary', title: 'Session Summary', rows: summaryRows },
      { key: 'status', title: 'Status', rows: statusRows },
    ]
    const rightCards: CardDef[] = [
      {
        key: 'context',
        title: detailsExpanded ? 'Context' : 'Quick Context',
        rows: detailsExpanded ? contextRows : contextRows.slice(0, 3),
      },
      { key: 'tokens', title: 'Token Mix', rows: tokenRows },
    ]

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
        <box
          style={{
            flexDirection: 'row',
            gap: columnGap,
            height: cardsHeight,
            width: contentWidth,
          }}
        >
          <box
            style={{
              flexDirection: 'column',
              gap: columnHeights.length > 1 ? rowGap : 0,
              height: cardsHeight,
              width: leftColumnWidth,
            }}
          >
            {columnHeights.map((cardHeight, index) =>
              renderCard(
                leftCards[index].key,
                leftCards[index].title,
                leftCards[index].rows,
                leftColumnWidth,
                cardHeight,
              ),
            )}
          </box>
          <box
            style={{
              flexDirection: 'column',
              gap: columnHeights.length > 1 ? rowGap : 0,
              height: cardsHeight,
              width: rightColumnWidth,
            }}
          >
            {columnHeights.map((cardHeight, index) =>
              renderCard(
                rightCards[index].key,
                rightCards[index].title,
                rightCards[index].rows,
                rightColumnWidth,
                cardHeight,
              ),
            )}
          </box>
        </box>
        <text>{fitLine(controlsLine, contentWidth)}</text>
      </box>
    )
  }

  const stackGap = 1
  const cards: CardDef[] = [
    { key: 'summary', title: 'Session Summary', rows: summaryRows },
    {
      key: 'context',
      title: detailsExpanded ? 'Context' : 'Quick Context',
      rows: detailsExpanded ? contextRows : contextRows.slice(0, 3),
    },
    { key: 'tokens', title: 'Token Mix', rows: tokenRows },
  ]
  const stackHeights = planCardHeights(cardsHeight, cards.length, stackGap, 3)

  return (
    <box
      style={{
        border: true,
        flexDirection: 'column',
        gap: stackHeights.length > 1 ? stackGap : 0,
        height,
        width,
        padding: 0,
      }}
    >
      {stackHeights.map((cardHeight, index) =>
        renderCard(
          cards[index].key,
          cards[index].title,
          cards[index].rows,
          contentWidth,
          cardHeight,
        ),
      )}
      <text>{fitLine(controlsLine, contentWidth)}</text>
    </box>
  )
}
