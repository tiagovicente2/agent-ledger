import type { SummarySnapshot } from '@agent-ledger/service'
import { useKeyboard, useTerminalDimensions } from '@opentui/react'

import { Header } from './components/header.tsx'
import { SessionListPane } from './components/session-list-pane.tsx'
import { SourceStatusPane } from './components/source-status-pane.tsx'
import { SummaryPane } from './components/summary-pane.tsx'
import { WarningsPane } from './components/warnings-pane.tsx'
import { useDashboardState } from './hooks/use-dashboard-state.ts'

interface AppProps {
  onQuit: () => void
}

function createEmptySnapshot(): SummarySnapshot {
  return {
    generatedAt: '',
    sessions: [],
    sources: [],
    totals: {
      sessionsCount: 0,
      tokens: {
        cacheRead: 0,
        cacheWrite: 0,
        input: 0,
        output: 0,
        reasoning: 0,
        total: 0,
      },
      totalEstimatedCostUsd: 0,
    },
    warnings: [],
  }
}

export function App({ onQuit }: AppProps) {
  const { width, height } = useTerminalDimensions()
  const { error, isRefreshing, refresh, snapshot } = useDashboardState()
  const resolvedSnapshot = snapshot ?? createEmptySnapshot()
  const contentHeight = Math.max(height - 8, 12)
  const topPaneHeight = Math.max(8, Math.floor(contentHeight * 0.4))
  const bottomPaneHeight = Math.max(6, contentHeight - topPaneHeight - 1)

  useKeyboard((event) => {
    if (event.ctrl && event.name === 'c') {
      onQuit()
      return
    }

    if (event.name === 'q') {
      onQuit()
      return
    }

    if (event.name === 'r') {
      void refresh()
    }
  })

  return (
    <box
      style={{
        flexDirection: 'column',
        gap: 1,
        height: Math.max(height, 12),
        width,
      }}
    >
      <Header error={error} isRefreshing={isRefreshing} snapshot={snapshot} />
      <box style={{ flexDirection: 'row', gap: 1, height: topPaneHeight }}>
        <SourceStatusPane height={topPaneHeight} sources={resolvedSnapshot.sources} />
        <SummaryPane height={topPaneHeight} totals={resolvedSnapshot.totals} />
      </box>
      <box style={{ flexDirection: 'row', gap: 1, height: bottomPaneHeight }}>
        <SessionListPane height={bottomPaneHeight} sessions={resolvedSnapshot.sessions} />
        <WarningsPane height={bottomPaneHeight} warnings={resolvedSnapshot.warnings} />
      </box>
    </box>
  )
}
