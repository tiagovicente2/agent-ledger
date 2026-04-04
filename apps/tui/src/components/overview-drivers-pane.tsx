import type { AgentName, SummaryTotals, UsageSession } from '@agent-ledger/service'

interface OverviewDriversPaneProps {
  height: number
  sessions: UsageSession[]
  totals: SummaryTotals
  width: number
}

interface DriverRow {
  label: string
  value: number
}

interface CardDef {
  key: string
  title: string
  rows: string[]
}

function formatAgent(agent: AgentName) {
  return agent[0].toUpperCase() + agent.slice(1)
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

function formatTokens(value: number) {
  return `${Math.round(value).toLocaleString()} tok`
}

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`
}

function buildBar(value: number, maxValue: number, maxWidth: number): string {
  if (value <= 0) {
    return ''
  }
  const ratio = value / Math.max(1, maxValue)
  const length = Math.max(1, Math.round(ratio * maxWidth))
  return '█'.repeat(length)
}

function buildCardRows(
  rows: DriverRow[],
  formatValue: (value: number) => string,
  options: { labelWidth: number; barWidth?: number; showBar: boolean },
) {
  const maxValue = Math.max(1, ...rows.map((row) => row.value), 1)

  return rows.map((row) => {
    const label = truncate(row.label, options.labelWidth).padEnd(options.labelWidth, ' ')
    const value = formatValue(row.value)

    if (!options.showBar || !options.barWidth) {
      return `${label} ${value}`
    }

    const bar = buildBar(row.value, maxValue, options.barWidth).padEnd(options.barWidth, ' ')
    return `${label} ${bar} ${value}`
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

export function OverviewDriversPane({ height, sessions, totals, width }: OverviewDriversPaneProps) {
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
        <text>{truncate('Overview', Math.max(8, contentWidth - 2))}</text>
        <text>
          {truncate(`Total: ${formatTokens(totals.tokens.total)}`, Math.max(8, contentWidth - 2))}
        </text>
      </box>
    )
  }

  const wideLayout = contentWidth >= 72 && contentHeight >= 7

  const modelTokenMap = new Map<string, number>()
  const agentTokenMap = new Map<AgentName, number>()
  const agentCostMap = new Map<AgentName, number>()

  for (const session of sessions) {
    agentTokenMap.set(
      session.agent,
      (agentTokenMap.get(session.agent) ?? 0) + session.tokenTotals.total,
    )

    if (session.estimatedCostUsd !== null) {
      agentCostMap.set(
        session.agent,
        (agentCostMap.get(session.agent) ?? 0) + session.estimatedCostUsd,
      )
    }

    const models = session.modelsUsed.length > 0 ? session.modelsUsed : ['unknown']
    const perModelTokens = session.tokenTotals.total / models.length

    for (const model of models) {
      modelTokenMap.set(model, (modelTokenMap.get(model) ?? 0) + perModelTokens)
    }
  }

  const columnGap = wideLayout ? 1 : 0
  const leftColumnWidth = wideLayout
    ? Math.max(24, Math.floor((contentWidth - columnGap) / 2))
    : contentWidth
  const rightColumnWidth = wideLayout ? contentWidth - columnGap - leftColumnWidth : contentWidth

  const minColumnWidth = Math.min(leftColumnWidth, rightColumnWidth)
  const labelWidth = clamp(Math.floor(minColumnWidth * 0.38), 9, 16)
  const barWidth = clamp(Math.floor(minColumnWidth * 0.26), 5, 14)

  const models = [...modelTokenMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value)

  const agentTokens = [...agentTokenMap.entries()]
    .map(([agent, value]) => ({ label: formatAgent(agent), value }))
    .sort((left, right) => right.value - left.value)

  const agentCosts = [...agentCostMap.entries()]
    .map(([agent, value]) => ({ label: formatAgent(agent), value }))
    .sort((left, right) => right.value - left.value)

  const tokenBreakdown: DriverRow[] = [
    { label: 'Input', value: totals.tokens.input },
    { label: 'Output', value: totals.tokens.output },
    { label: 'Reasoning', value: totals.tokens.reasoning },
    { label: 'Cache', value: totals.tokens.cacheRead + totals.tokens.cacheWrite },
  ].filter((row) => row.value > 0)

  const topModelsRows = buildCardRows(models.slice(0, 12), formatTokens, {
    labelWidth,
    showBar: false,
  })
  const agentTokenRows = buildCardRows(agentTokens.slice(0, 10), formatTokens, {
    labelWidth,
    barWidth,
    showBar: true,
  })
  const agentCostRows = buildCardRows(agentCosts.slice(0, 10), formatUsd, {
    labelWidth,
    barWidth,
    showBar: true,
  })
  const tokenBreakdownRows = buildCardRows(tokenBreakdown, formatTokens, {
    labelWidth,
    barWidth,
    showBar: true,
  })

  const fallbackRows = [`Snapshot total: ${formatTokens(totals.tokens.total)}`]

  if (wideLayout) {
    const rowGap = 1
    const columnHeights = planCardHeights(contentHeight, 2, rowGap, 3)

    const leftCards: CardDef[] = [
      { key: 'models', title: 'Top Models', rows: topModelsRows },
      {
        key: 'breakdown',
        title: 'Token Breakdown',
        rows: tokenBreakdownRows.length > 0 ? tokenBreakdownRows : fallbackRows,
      },
    ]
    const rightCards: CardDef[] = [
      { key: 'tokens', title: 'Agent Tokens', rows: agentTokenRows },
      {
        key: 'cost',
        title: 'Agent Cost (est)',
        rows: agentCostRows.length > 0 ? agentCostRows : ['No cost data'],
      },
    ]

    return (
      <box
        style={{
          border: true,
          flexDirection: 'row',
          gap: columnGap,
          height,
          width,
          padding: 0,
        }}
      >
        <box
          style={{
            flexDirection: 'column',
            gap: columnHeights.length > 1 ? rowGap : 0,
            height: contentHeight,
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
            height: contentHeight,
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
    )
  }

  const stackGap = 1
  const cards: CardDef[] = [
    { key: 'models', title: 'Top Models', rows: topModelsRows },
    { key: 'tokens', title: 'Agent Tokens', rows: agentTokenRows },
    {
      key: 'cost',
      title: 'Agent Cost (est)',
      rows: agentCostRows.length > 0 ? agentCostRows : ['No cost data'],
    },
  ]
  const stackHeights = planCardHeights(contentHeight, cards.length, stackGap, 3)

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
