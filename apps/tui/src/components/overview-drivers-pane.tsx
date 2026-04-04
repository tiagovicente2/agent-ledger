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
  return Math.round(value).toLocaleString()
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
  options: {
    rowWidth: number
    showBar: boolean
    maxLabelWidth: number
    compactValue?: (value: number) => string
  },
) {
  if (rows.length === 0) {
    return []
  }

  const maxValue = Math.max(1, ...rows.map((row) => row.value), 1)
  const minLabelWidth = 5
  let valueRows = rows.map((row) => formatValue(row.value))
  let valueWidth = Math.max(1, ...valueRows.map((value) => value.length))
  let labelWidth = clamp(
    Math.max(...rows.map((row) => row.label.length)),
    minLabelWidth,
    options.maxLabelWidth,
  )

  if (options.showBar && options.compactValue) {
    const minBarWidth = 4
    const availableBarWidth = options.rowWidth - labelWidth - valueWidth - 2

    if (availableBarWidth < minBarWidth) {
      valueRows = rows.map((row) => options.compactValue?.(row.value) ?? formatValue(row.value))
      valueWidth = Math.max(1, ...valueRows.map((value) => value.length))
    }
  }

  const maxLabelForRow = Math.max(minLabelWidth, options.rowWidth - valueWidth - 3)
  labelWidth = Math.min(labelWidth, maxLabelForRow)
  const barWidth = options.showBar ? Math.max(2, options.rowWidth - labelWidth - valueWidth - 2) : 0

  return rows.map((row, index) => {
    const label = truncate(row.label, labelWidth).padEnd(labelWidth, ' ')
    const value = valueRows[index].padStart(valueWidth, ' ')

    if (!options.showBar) {
      const spacerWidth = Math.max(1, options.rowWidth - labelWidth - valueWidth)
      return `${label}${' '.repeat(spacerWidth)}${value}`
    }

    const bar = buildBar(row.value, maxValue, barWidth).padEnd(barWidth, ' ')
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
  const rowCapacity = Math.max(1, cardHeight - 2)
  const visibleRows = (rows.length > 0 ? rows : ['No data']).slice(0, rowCapacity)
  const counts = new Map<string, number>()
  const lineCounts = new Map<string, number>()
  const titleText = truncate(title, Math.max(1, innerWidth - 1))
  const topBorder = `┌${titleText}${'─'.repeat(Math.max(0, innerWidth - titleText.length))}┐`
  const bottomBorder = `└${'─'.repeat(innerWidth)}┘`
  const framedRows = [
    ...visibleRows,
    ...new Array<number>(Math.max(0, rowCapacity - visibleRows.length)).fill(0).map(() => ''),
  ]

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
        const count = (counts.get(row) ?? 0) + 1
        counts.set(row, count)
        const lineKey = row.length > 0 ? row : '__blank__'
        const lineCount = (lineCounts.get(lineKey) ?? 0) + 1
        lineCounts.set(lineKey, lineCount)
        const content = truncate(row, innerWidth).padEnd(innerWidth, ' ')
        return <text key={`${key}-${lineKey}-${count}-${lineCount}`}>{`│${content}│`}</text>
      })}
      <text>{bottomBorder}</text>
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
  const projectTokenMap = new Map<string, number>()
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

    const project = session.projectPath ?? 'unknown'
    projectTokenMap.set(project, (projectTokenMap.get(project) ?? 0) + session.tokenTotals.total)

    for (const model of models) {
      modelTokenMap.set(model, (modelTokenMap.get(model) ?? 0) + perModelTokens)
    }
  }

  const columnGap = wideLayout ? 1 : 0
  const leftColumnWidth = wideLayout
    ? Math.max(24, Math.floor((contentWidth - columnGap) / 2))
    : contentWidth
  const rightColumnWidth = wideLayout ? contentWidth - columnGap - leftColumnWidth : contentWidth

  const models = [...modelTokenMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value)

  const projects = [...projectTokenMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value)

  const agentTokens = [...agentTokenMap.entries()]
    .map(([agent, value]) => ({ label: formatAgent(agent), value }))
    .sort((left, right) => right.value - left.value)

  const agentCosts = [...agentCostMap.entries()]
    .map(([agent, value]) => ({ label: formatAgent(agent), value }))
    .sort((left, right) => right.value - left.value)

  const fallbackRows = [`Snapshot total: ${formatTokens(totals.tokens.total)}`]

  if (wideLayout) {
    const rowGap = 0
    const columnHeights = planCardHeights(contentHeight, 2, rowGap, 3)
    const leftRowWidth = Math.max(8, leftColumnWidth - 2)
    const rightRowWidth = Math.max(8, rightColumnWidth - 2)

    const topModelsRows = buildCardRows(models.slice(0, 12), formatTokens, {
      rowWidth: leftRowWidth,
      showBar: false,
      maxLabelWidth: clamp(Math.floor(leftRowWidth * 0.62), 12, 32),
      compactValue: formatCompactTokens,
    })
    const topProjectRows = buildCardRows(projects.slice(0, 10), formatTokens, {
      rowWidth: leftRowWidth,
      showBar: false,
      maxLabelWidth: clamp(Math.floor(leftRowWidth * 0.62), 12, 32),
      compactValue: formatCompactTokens,
    })
    const agentTokenRows = buildCardRows(agentTokens.slice(0, 10), formatTokens, {
      rowWidth: rightRowWidth,
      showBar: true,
      maxLabelWidth: clamp(Math.floor(rightRowWidth * 0.26), 7, 14),
      compactValue: formatCompactTokens,
    })
    const agentCostRows = buildCardRows(agentCosts.slice(0, 10), formatUsd, {
      rowWidth: rightRowWidth,
      showBar: true,
      maxLabelWidth: clamp(Math.floor(rightRowWidth * 0.26), 7, 14),
    })

    const leftCards: CardDef[] = [
      { key: 'models', title: 'Top Models', rows: topModelsRows },
      {
        key: 'projects',
        title: 'Top Projects',
        rows: topProjectRows.length > 0 ? topProjectRows : fallbackRows,
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

  const stackGap = 0
  const stackRowWidth = Math.max(8, contentWidth - 2)
  const topModelsRows = buildCardRows(models.slice(0, 12), formatTokens, {
    rowWidth: stackRowWidth,
    showBar: false,
    maxLabelWidth: clamp(Math.floor(stackRowWidth * 0.62), 12, 32),
    compactValue: formatCompactTokens,
  })
  const agentTokenRows = buildCardRows(agentTokens.slice(0, 10), formatTokens, {
    rowWidth: stackRowWidth,
    showBar: true,
    maxLabelWidth: clamp(Math.floor(stackRowWidth * 0.26), 7, 14),
    compactValue: formatCompactTokens,
  })
  const agentCostRows = buildCardRows(agentCosts.slice(0, 10), formatUsd, {
    rowWidth: stackRowWidth,
    showBar: true,
    maxLabelWidth: clamp(Math.floor(stackRowWidth * 0.26), 7, 14),
  })

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
