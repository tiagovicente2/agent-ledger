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

function fitLine(value: string, width: number) {
  const contentWidth = Math.max(20, width - 2)

  if (value.length >= contentWidth) {
    return `${value.slice(0, Math.max(0, contentWidth - 3))}...`
  }

  return value.padEnd(contentWidth, ' ')
}

export function OverviewTrendPane({ height, points, width }: OverviewTrendPaneProps) {
  const chartRows = Math.max(0, height - 3)
  const labelWidth = 5
  const valueSampleWidth = Math.max(
    7,
    formatNumber(Math.max(...points.map((point) => point.tokens), 0)).length,
  )
  const maxBarWidth = Math.max(4, Math.min(24, width - labelWidth - valueSampleWidth - 8))
  const visiblePoints = points.slice(-chartRows)
  const maxTokens = Math.max(1, ...visiblePoints.map((point) => point.tokens))

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
      <text>{fitLine('Token Trend', width)}</text>
      {visiblePoints.length === 0 ? (
        <text>{fitLine('No token trend for current filters', width)}</text>
      ) : null}
      {visiblePoints.map((point) => {
        const barLength =
          point.tokens <= 0 ? 0 : Math.max(1, Math.round((point.tokens / maxTokens) * maxBarWidth))
        const bar = '#'.repeat(barLength)
        const row = `${formatDayLabel(point.label).padStart(labelWidth, ' ')} ${bar.padEnd(maxBarWidth, ' ')} ${formatNumber(point.tokens)}`

        return <text key={`${point.label}-${point.tokens}`}>{fitLine(row, width)}</text>
      })}
    </box>
  )
}
