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

function formatAgent(agent: AgentName) {
  return agent[0].toUpperCase() + agent.slice(1)
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`
}

function formatTokens(value: number) {
  return `${Math.round(value).toLocaleString()} tok`
}

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`
}

function fitLine(value: string, width: number) {
  const contentWidth = Math.max(20, width - 2)

  if (value.length >= contentWidth) {
    return `${value.slice(0, Math.max(0, contentWidth - 3))}...`
  }

  return value.padEnd(contentWidth, ' ')
}

function buildBars(rows: DriverRow[], maxBarWidth: number) {
  const maxValue = Math.max(1, ...rows.map((row) => row.value))

  return rows.map((row) => {
    const barLength =
      row.value <= 0 ? 0 : Math.max(1, Math.round((row.value / maxValue) * maxBarWidth))

    return {
      ...row,
      bar: '#'.repeat(barLength),
    }
  })
}

export function OverviewDriversPane({ height, sessions, totals, width }: OverviewDriversPaneProps) {
  const maxLines = Math.max(1, height - 2)
  const bodyRows = Math.max(3, maxLines)
  const sectionHeaderRows = 3
  const remainingRows = Math.max(3, bodyRows - sectionHeaderRows)
  const rowBudgetPerSection = Math.max(1, Math.floor(remainingRows / 3))
  const maxBarWidth = Math.max(4, Math.min(14, width - 28))
  const modelLabelWidth = Math.max(12, Math.min(22, width - 22))
  const agentLabelWidth = 8
  const modelTokenMap = new Map<string, number>()
  const agentTokenMap = new Map<AgentName, number>()
  const agentCostMap = new Map<AgentName, number>()

  for (const session of sessions) {
    const agent = session.agent
    agentTokenMap.set(agent, (agentTokenMap.get(agent) ?? 0) + session.tokenTotals.total)

    if (session.estimatedCostUsd !== null) {
      agentCostMap.set(agent, (agentCostMap.get(agent) ?? 0) + session.estimatedCostUsd)
    }

    const models = session.modelsUsed.length > 0 ? session.modelsUsed : ['unknown']
    const perModelTokens = session.tokenTotals.total / models.length

    for (const model of models) {
      modelTokenMap.set(model, (modelTokenMap.get(model) ?? 0) + perModelTokens)
    }
  }

  const topModels = [...modelTokenMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, rowBudgetPerSection)

  const topAgentTokens = buildBars(
    [...agentTokenMap.entries()]
      .map(([agent, value]) => ({ label: formatAgent(agent), value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, rowBudgetPerSection),
    maxBarWidth,
  )

  const topAgentCosts = buildBars(
    [...agentCostMap.entries()]
      .map(([agent, value]) => ({ label: formatAgent(agent), value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, rowBudgetPerSection),
    maxBarWidth,
  )

  const lines: Array<{ key: string; text: string }> = [
    { key: 'models-title', text: fitLine('Top Models', width) },
    {
      key: 'snapshot-total',
      text: fitLine(`Snapshot tok: ${Math.max(0, totals.tokens.total).toLocaleString()}`, width),
    },
    ...(topModels.length === 0
      ? [{ key: 'models-empty', text: fitLine('No model activity', width) }]
      : topModels.map((row) => ({
          key: `model-${row.label}`,
          text: fitLine(
            `${truncate(row.label, modelLabelWidth).padEnd(modelLabelWidth, ' ')} ${formatTokens(row.value)}`,
            width,
          ),
        }))),
    { key: 'agent-token-title', text: fitLine('Agent Tokens', width) },
    ...(topAgentTokens.length === 0
      ? [{ key: 'agent-token-empty', text: fitLine('No sessions in current filter', width) }]
      : topAgentTokens.map((row) => ({
          key: `agent-token-${row.label}`,
          text: fitLine(
            `${truncate(row.label, agentLabelWidth).padEnd(agentLabelWidth, ' ')} ${row.bar.padEnd(maxBarWidth, ' ')} ${formatTokens(row.value)}`,
            width,
          ),
        }))),
    { key: 'agent-cost-title', text: fitLine('Agent Cost (est)', width) },
    ...(topAgentCosts.length === 0
      ? [{ key: 'agent-cost-empty', text: fitLine('No estimated cost data', width) }]
      : topAgentCosts.map((row) => ({
          key: `agent-cost-${row.label}`,
          text: fitLine(
            `${truncate(row.label, agentLabelWidth).padEnd(agentLabelWidth, ' ')} ${row.bar.padEnd(maxBarWidth, ' ')} ${formatUsd(row.value)}`,
            width,
          ),
        }))),
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
      {lines.slice(0, maxLines).map((line) => (
        <text key={line.key}>{line.text}</text>
      ))}
    </box>
  )
}
