import type { TrendPoint } from '../view-models/overview.ts'

interface OverviewTrendPaneProps {
  height: number
  points: TrendPoint[]
  width: number
}

function formatDayLabel(value: string) {
  if (value.length >= 10) {
    return value.slice(5, 10)
  }

  return value
}

function formatNumber(value: number) {
  return value.toLocaleString()
}

function formatCompactNumber(value: number) {
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

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`
}

function fitLine(value: string, width: number) {
  const contentWidth = Math.max(8, width)

  if (value.length >= contentWidth) {
    return `${value.slice(0, Math.max(0, contentWidth - 3))}...`
  }

  return value.padEnd(contentWidth, ' ')
}

function fitCell(value: string, width: number) {
  if (value.length <= width) {
    return value.padEnd(width, ' ')
  }

  return value.slice(0, width)
}

// Use partial blocks for smoother bar appearance
const FULL_BLOCK = '█'
const SEVEN_EIGHTHS = '▉'
const THREE_QUARTERS = '▊'
const FIVE_EIGHTHS = '▋'
const HALF_BLOCK = '▌'
const THREE_EIGHTHS = '▍'
const QUARTER_BLOCK = '▎'
const ONE_EIGHTH = '▏'

function buildBar(value: number, maxValue: number, maxWidth: number): string {
  if (value <= 0) return ''
  const ratio = value / maxValue
  const fullLength = Math.floor(ratio * maxWidth)
  const remainder = ratio * maxWidth - fullLength

  // Add partial block based on remainder
  let partial = ''
  if (remainder >= 0.875) partial = SEVEN_EIGHTHS
  else if (remainder >= 0.75) partial = THREE_QUARTERS
  else if (remainder >= 0.625) partial = FIVE_EIGHTHS
  else if (remainder >= 0.5) partial = HALF_BLOCK
  else if (remainder >= 0.375) partial = THREE_EIGHTHS
  else if (remainder >= 0.25) partial = QUARTER_BLOCK
  else if (remainder >= 0.125) partial = ONE_EIGHTH

  return FULL_BLOCK.repeat(fullLength) + partial
}

export function OverviewTrendPane({ height, points, width }: OverviewTrendPaneProps) {
  const contentWidth = Math.max(8, width - 2)
  const chartRows = Math.max(1, height - 2)
  const visiblePoints = points.slice(-chartRows)
  const maxTokens = Math.max(1, ...visiblePoints.map((point) => point.tokens))
  const labelWidth = Math.min(5, Math.max(3, Math.floor(contentWidth * 0.25)))

  let valueRows = visiblePoints.map((point) => formatNumber(point.tokens))
  let valueWidth = Math.max(1, ...valueRows.map((value) => value.length), 1)
  let barWidth = contentWidth - labelWidth - valueWidth - 2

  if (barWidth < 4) {
    valueRows = visiblePoints.map((point) => formatCompactNumber(point.tokens))
    valueWidth = Math.max(1, ...valueRows.map((value) => value.length), 1)
    barWidth = contentWidth - labelWidth - valueWidth - 2
  }

  barWidth = Math.max(2, barWidth)

  const topBorderTitle = truncate('Token Trend', Math.max(1, contentWidth - 1))
  const topBorder = `┌${topBorderTitle}${'─'.repeat(Math.max(0, contentWidth - topBorderTitle.length))}┐`
  const bottomBorder = `└${'─'.repeat(contentWidth)}┘`

  const contentRows =
    visiblePoints.length === 0
      ? [fitCell('No data for current filters', contentWidth)]
      : visiblePoints.map((point, index) => {
          const bar = buildBar(point.tokens, maxTokens, barWidth).padEnd(barWidth, ' ')
          const label = fitCell(formatDayLabel(point.label), labelWidth)
          const value = valueRows[index].padStart(valueWidth, ' ')
          return `${label} ${bar} ${value}`
        })

  const framedRows = [
    ...contentRows.slice(0, chartRows),
    ...new Array<number>(Math.max(0, chartRows - contentRows.length)).fill(0).map(() => ''),
  ]
  const counts = new Map<string, number>()

  return (
    <box
      style={{
        flexDirection: 'column',
        height,
        width,
        padding: 0,
      }}
    >
      <text>{topBorder}</text>
      {framedRows.map((row) => {
        const rowKey = row.length > 0 ? row : '__blank__'
        const count = (counts.get(rowKey) ?? 0) + 1
        counts.set(rowKey, count)
        const content = row.padEnd(contentWidth, ' ')
        return <text key={`${rowKey}-${count}`}>{`│${content}│`}</text>
      })}
      <text>{bottomBorder}</text>
    </box>
  )
}
