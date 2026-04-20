import type { TokenTotals, UsageSession } from '@agent-ledger/service'

import { formatModelLabel } from '../model-label.ts'
import { formatPathLeaf } from '../path-truncation.ts'

interface SessionDetailsPaneProps {
  height: number
  session: UsageSession | null
  width: number
}

function formatAgent(agent: UsageSession['agent']) {
  return agent === 'pi' ? 'pi' : agent[0].toUpperCase() + agent.slice(1)
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

function truncateKeepEnd(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }

  if (maxLength <= 3) {
    return value.slice(Math.max(0, value.length - maxLength))
  }

  return `...${value.slice(Math.max(0, value.length - (maxLength - 3)))}`
}

function truncateRowForContext(value: string, maxLength: number) {
  const projectPrefix = 'Project: '

  if (value.startsWith(projectPrefix)) {
    if (maxLength <= projectPrefix.length) {
      return truncate(value, maxLength)
    }

    const projectLabel = formatPathLeaf(value.slice(projectPrefix.length))
    const suffix = truncateKeepEnd(projectLabel, maxLength - projectPrefix.length)
    return `${projectPrefix}${suffix}`
  }

  const modelPrefix = 'Model: '

  if (value.startsWith(modelPrefix)) {
    if (maxLength <= modelPrefix.length) {
      return truncate(value, maxLength)
    }

    const modelLabel = formatModelLabel(value.slice(modelPrefix.length))
    const suffix = truncateKeepEnd(modelLabel, maxLength - modelPrefix.length)
    return `${modelPrefix}${suffix}`
  }

  const prefixes: string[] = []

  for (const prefix of prefixes) {
    if (!value.startsWith(prefix)) {
      continue
    }

    if (maxLength <= prefix.length) {
      return truncate(value, maxLength)
    }

    const suffix = truncateKeepEnd(value.slice(prefix.length), maxLength - prefix.length)
    return `${prefix}${suffix}`
  }

  return truncate(value, maxLength)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function formatUsd(value: number | null, status: UsageSession['costStatus']) {
  if (value === null) {
    return 'n/a'
  }

  const prefix = status === 'exact' ? '' : '~'
  return `${prefix}$${value.toFixed(2)}`
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

function buildCenteredTopBorder(title: string, innerWidth: number): string {
  const safeTitle = truncate(title, Math.max(1, innerWidth))
  const decoratedTitle = safeTitle.length + 2 <= innerWidth ? ` ${safeTitle} ` : safeTitle
  const totalFill = Math.max(0, innerWidth - decoratedTitle.length)
  const leftFill = Math.floor(totalFill / 2)
  const rightFill = totalFill - leftFill
  return `┌${'─'.repeat(leftFill)}${decoratedTitle}${'─'.repeat(rightFill)}┐`
}

function buildTokenRows(tokens: TokenTotals, cardInnerWidth: number, columns: 1 | 2) {
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

  const maxValue = Math.max(1, ...rows.map((row) => row.value))
  const maxLabelLength = Math.max(5, ...rows.map((row) => row.label.length))

  function formatTokenRow(row: { label: string; value: number }, rowWidth: number): string {
    const percent = tokens.total > 0 ? Math.round((row.value / tokens.total) * 100) : 0
    const fullValue = `${row.value.toLocaleString()} (${percent}%)`
    const compactValue = `${formatCompactTokens(row.value)} ${percent}%`
    const labelWidth = clamp(maxLabelLength, 6, Math.max(6, Math.min(12, rowWidth - 8)))
    const minBarWidth = 4

    const fullBarWidth = rowWidth - labelWidth - fullValue.length - 2
    const useCompactValue = fullBarWidth < minBarWidth
    const value = useCompactValue ? compactValue : fullValue
    const valueWidth = value.length
    const barWidth = Math.max(2, rowWidth - labelWidth - valueWidth - 2)
    const label = truncate(row.label, labelWidth).padEnd(labelWidth, ' ')
    const bar = buildBar(row.value, maxValue, barWidth).padEnd(barWidth, ' ')

    return `${label} ${bar} ${value.padStart(valueWidth, ' ')}`
  }

  const formattedRows = rows.map((row) => formatTokenRow(row, Math.max(12, cardInnerWidth)))

  if (columns === 1 || formattedRows.length <= 1) {
    return formattedRows
  }

  const columnGap = '  '
  const columnWidth = Math.max(10, Math.floor((cardInnerWidth - columnGap.length) / 2))
  const pairedRows: string[] = []
  const perColumnRows = rows.map((row) => formatTokenRow(row, columnWidth))

  for (let index = 0; index < perColumnRows.length; index += 2) {
    const left = truncate(perColumnRows[index], columnWidth).padEnd(columnWidth, ' ')
    const right =
      index + 1 < perColumnRows.length ? truncate(perColumnRows[index + 1], columnWidth) : ''
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

function renderCard(
  key: string,
  title: string,
  rows: string[],
  cardWidth: number,
  cardHeight: number,
) {
  const innerWidth = Math.max(8, cardWidth - 2)
  const rowCapacity = Math.max(1, cardHeight - 2)
  const topMarginRows = 0
  const availableContentRows = Math.max(0, rowCapacity - topMarginRows)
  const visibleRows = (rows.length > 0 ? rows : ['No data']).slice(0, availableContentRows)
  const bottomPaddingRows = Math.max(0, rowCapacity - topMarginRows - visibleRows.length)
  const framedRows = [
    ...new Array<number>(topMarginRows).fill(0).map(() => ''),
    ...visibleRows,
    ...new Array<number>(bottomPaddingRows).fill(0).map(() => ''),
  ]
  const counts = new Map<string, number>()
  const topBorder = buildCenteredTopBorder(title, innerWidth)
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
        const content = truncateRowForContext(row, innerWidth).padEnd(innerWidth, ' ')
        return <text key={`${key}-${lineKey}-${count}`}>{`│${content}│`}</text>
      })}
      <text>{bottomBorder}</text>
    </box>
  )
}

export function SessionDetailsPane({ height, session, width }: SessionDetailsPaneProps) {
  const contentWidth = Math.max(20, width)
  const contentHeight = Math.max(1, height)

  if (contentWidth < 24 || contentHeight < 3) {
    return (
      <box
        style={{
          flexDirection: 'column',
          height,
          width,
          padding: 0,
        }}
      >
        <text>
          {truncate(
            session ? `Agent: ${formatAgent(session.agent)}` : 'No session selected',
            Math.max(8, contentWidth),
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

  const summaryRows = [
    `Agent: ${formatAgent(session.agent)}`,
    `Tokens: ${session.tokenTotals.total.toLocaleString()}   Cost: ${formatUsd(session.costUsd, session.costStatus)}`,
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
    `Cost status: ${session.costStatus}`,
    `Cost source: ${session.costProvenance}`,
    ...(session.missingCostMessageCount > 0
      ? [
          `Missing cost msgs: ${session.missingCostMessageCount}`,
          `Missing cost tokens: ${session.missingCostTokenTotal.toLocaleString()}`,
        ]
      : []),
    `Session: ${session.nativeSessionId ?? 'derived'}`,
    ...(session.inferenceReason ? [`Reason: ${session.inferenceReason}`] : []),
  ]

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
    const leftColumnWidth = Math.floor((contentWidth - columnGap) / 2)
    const rightColumnWidth = contentWidth - columnGap - leftColumnWidth
    const rowGap = 0
    const topRowHeight = Math.floor((cardsHeight - rowGap) / 2)
    const bottomRowHeight = cardsHeight - rowGap - topRowHeight
    const rowHeights = [topRowHeight, bottomRowHeight]
    const tokenRows = buildTokenRows(session.tokenTotals, Math.max(8, rightColumnWidth - 2), 1)

    const leftCards: CardDef[] = [
      { key: 'summary', title: 'Session Summary', rows: summaryRows },
      { key: 'context', title: 'Context', rows: contextRows },
    ]
    const rightCards: CardDef[] = [
      { key: 'tokens', title: 'Token Mix', rows: tokenRows },
      { key: 'metrics', title: 'Session Metrics', rows: metricsRows },
    ]
    return (
      <box
        style={{
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
              gap: rowGap,
              height: cardsHeight,
              width: leftColumnWidth,
            }}
          >
            {rowHeights.map((cardHeight, index) =>
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
              gap: rowGap,
              height: cardsHeight,
              width: rightColumnWidth,
            }}
          >
            {rowHeights.map((cardHeight, index) =>
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
  const tokenColumns: 1 | 2 = contentWidth >= 56 ? 2 : 1
  const tokenRows = buildTokenRows(session.tokenTotals, Math.max(8, contentWidth - 2), tokenColumns)
  const cards: CardDef[] = [
    { key: 'summary', title: 'Session Summary', rows: summaryRows },
    { key: 'context', title: 'Context', rows: contextRows },
    { key: 'tokens', title: 'Token Mix', rows: tokenRows },
  ]
  const stackHeights = planCardHeights(cardsHeight, cards.length, stackGap, 3)

  return (
    <box
      style={{
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
