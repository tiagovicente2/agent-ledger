import type { TokenTotals, UsageSession } from '@agent-ledger/service'

interface SessionDetailsPaneProps {
  height: number
  session: UsageSession | null
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

function buildBar(value: number, maxValue: number, maxWidth: number): string {
  if (value <= 0) {
    return ''
  }
  const ratio = value / Math.max(1, maxValue)
  const length = Math.max(1, Math.round(ratio * maxWidth))
  return '█'.repeat(length)
}

function buildTokenRows(
  tokens: TokenTotals,
  labelWidth: number,
  barWidth: number,
  cardInnerWidth: number,
  columns: 1 | 2,
) {
  const rows = [
    { label: 'Input', value: tokens.input },
    { label: 'Output', value: tokens.output },
    { label: 'Reasoning', value: tokens.reasoning },
    { label: 'Cache Read', value: tokens.cacheRead },
    { label: 'Cache Write', value: tokens.cacheWrite },
  ]
    .filter((row) => row.value > 0)
    .sort((left, right) => {
      if (right.value !== left.value) {
        return right.value - left.value
      }

      return left.label.localeCompare(right.label)
    })

  const maxValue = Math.max(1, ...rows.map((row) => row.value), tokens.total)

  const compactMode = columns === 2
  const effectiveLabelWidth = compactMode ? clamp(Math.floor(labelWidth * 0.72), 5, 9) : labelWidth
  const effectiveBarWidth = compactMode ? clamp(Math.floor(barWidth * 0.45), 2, 5) : barWidth

  const formattedRows = rows.map((row) => {
    const bar = buildBar(row.value, maxValue, effectiveBarWidth).padEnd(effectiveBarWidth, ' ')
    const percent = tokens.total > 0 ? Math.round((row.value / tokens.total) * 100) : 0
    const label = truncate(row.label, effectiveLabelWidth).padEnd(effectiveLabelWidth, ' ')

    if (compactMode) {
      return `${label} ${bar} ${formatCompactTokens(row.value)} ${percent}%`
    }

    return `${label} ${bar} ${row.value.toLocaleString()} (${percent}%)`
  })

  if (columns === 1 || formattedRows.length <= 1) {
    return formattedRows
  }

  const columnGap = '  '
  const columnWidth = Math.max(10, Math.floor((cardInnerWidth - columnGap.length) / 2))
  const pairedRows: string[] = []

  for (let index = 0; index < formattedRows.length; index += 2) {
    const left = truncate(formattedRows[index], columnWidth).padEnd(columnWidth, ' ')
    const right =
      index + 1 < formattedRows.length ? truncate(formattedRows[index + 1], columnWidth) : ''
    pairedRows.push(`${left}${columnGap}${right}`.trimEnd())
  }

  return pairedRows
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

function planCardHeightsByRows(totalHeight: number, gap: number, rowsPerCard: number[]) {
  if (rowsPerCard.length === 0 || totalHeight <= 0) {
    return []
  }

  const minHeight = 3
  const count = rowsPerCard.length
  const heights = new Array<number>(count).fill(minHeight)
  let remaining = totalHeight - (count * minHeight + (count - 1) * gap)

  if (remaining <= 0) {
    return heights
  }

  const desiredHeights = rowsPerCard.map((rowCount) => Math.max(minHeight, rowCount + 2))
  const order = [...rowsPerCard.keys()].sort((left, right) => {
    if (rowsPerCard[right] !== rowsPerCard[left]) {
      return rowsPerCard[right] - rowsPerCard[left]
    }

    return left - right
  })

  for (const index of order) {
    if (remaining <= 0) {
      break
    }

    const growBy = Math.min(remaining, Math.max(0, desiredHeights[index] - heights[index]))
    heights[index] += growBy
    remaining -= growBy
  }

  let cursor = 0
  while (remaining > 0) {
    heights[order[cursor % order.length]] += 1
    remaining -= 1
    cursor += 1
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
  const rowCapacity = Math.max(1, cardHeight - 2)
  const visibleRows = (rows.length > 0 ? rows : ['No data']).slice(0, rowCapacity)
  const paddingRows = Math.max(0, rowCapacity - visibleRows.length)
  const topPaddingRows = Math.floor(paddingRows / 2)
  const bottomPaddingRows = paddingRows - topPaddingRows
  const framedRows = [
    ...new Array<number>(topPaddingRows).fill(0).map(() => ''),
    ...visibleRows,
    ...new Array<number>(bottomPaddingRows).fill(0).map(() => ''),
  ]
  const counts = new Map<string, number>()
  const titleText = truncate(title, Math.max(1, innerWidth - 1))
  const topBorder = `┌${titleText}${'─'.repeat(Math.max(0, innerWidth - titleText.length))}┐`
  const bottomBorder = `└${'─'.repeat(innerWidth)}┘`

  return (
    <box
      key={key}
      style={{
        flexDirection: 'column',
        height: cardHeight,
        width: cardWidth,
        padding: 0,
      }}
    >
      <text>{topBorder}</text>
      {framedRows.map((row) => {
        const lineKey = row.length > 0 ? row : '__blank__'
        const count = (counts.get(lineKey) ?? 0) + 1
        counts.set(lineKey, count)
        const content = truncate(row, innerWidth).padEnd(innerWidth, ' ')
        return <text key={`${key}-${lineKey}-${count}`}>{`│${content}│`}</text>
      })}
      <text>{bottomBorder}</text>
    </box>
  )
}

export function SessionDetailsPane({ height, session, width }: SessionDetailsPaneProps) {
  const contentWidth = Math.max(20, width - 2)
  const contentHeight = Math.max(1, height - 2)

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

  const cardsHeight = Math.max(1, contentHeight)

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
    `Model count: ${models.length}`,
    `Confidence: ${session.confidence}`,
    `Session: ${session.nativeSessionId ?? 'derived'}`,
    ...(session.inferenceReason ? [`Reason: ${session.inferenceReason}`] : []),
  ]

  const tokenColumns: 1 | 2 = localWidth <= 44 ? 2 : 1
  const tokenRows = buildTokenRows(
    session.tokenTotals,
    labelWidth,
    barWidth,
    Math.max(8, localWidth - 2),
    tokenColumns,
  )

  const tokenTotal = Math.max(1, session.tokenTotals.total)
  const durationMinutes = Math.max(
    1,
    Math.floor((Date.parse(session.endedAt) - Date.parse(session.startedAt)) / 60000),
  )
  const cacheTotal = session.tokenTotals.cacheRead + session.tokenTotals.cacheWrite
  const metricsRows = [
    `Tokens/msg: ${Math.round(session.tokenTotals.total / Math.max(1, session.messageCount)).toLocaleString()}`,
    `Tokens/min: ${Math.round(session.tokenTotals.total / durationMinutes).toLocaleString()}`,
    `Input share: ${Math.round((session.tokenTotals.input / tokenTotal) * 100)}%`,
    `Output share: ${Math.round((session.tokenTotals.output / tokenTotal) * 100)}%`,
    `Cache share: ${Math.round((cacheTotal / tokenTotal) * 100)}%`,
    `Models used: ${session.modelsUsed.length}`,
  ]

  if (wideLayout) {
    const columnGap = 1
    const desiredLeftWidth = Math.floor((contentWidth - columnGap) * 0.45)
    const leftColumnWidth = Math.max(24, desiredLeftWidth)
    const rightColumnWidth = Math.max(28, contentWidth - columnGap - leftColumnWidth)
    const rowGap = 0

    const leftCards: CardDef[] = [
      { key: 'summary', title: 'Session Summary', rows: summaryRows },
      { key: 'context', title: 'Context', rows: contextRows },
    ]
    const rightCards: CardDef[] = [
      { key: 'tokens', title: 'Token Mix', rows: tokenRows },
      { key: 'metrics', title: 'Session Metrics', rows: metricsRows },
    ]
    const leftHeights = planCardHeightsByRows(
      cardsHeight,
      rowGap,
      leftCards.map((card) => card.rows.length),
    )
    const rightHeights = planCardHeightsByRows(
      cardsHeight,
      rowGap,
      rightCards.map((card) => card.rows.length),
    )

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
              gap: leftHeights.length > 1 ? rowGap : 0,
              height: cardsHeight,
              width: leftColumnWidth,
            }}
          >
            {leftHeights.map((cardHeight, index) =>
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
              gap: rightHeights.length > 1 ? rowGap : 0,
              height: cardsHeight,
              width: rightColumnWidth,
            }}
          >
            {rightHeights.map((cardHeight, index) =>
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
      </box>
    )
  }

  const stackGap = 0
  const cards: CardDef[] = [
    { key: 'summary', title: 'Session Summary', rows: summaryRows },
    { key: 'context', title: 'Context', rows: contextRows },
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
    </box>
  )
}
