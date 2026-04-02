import type { SummarySnapshot } from '@agent-ledger/service'
import { useKeyboard, useTerminalDimensions } from '@opentui/react'
import { useEffect, useState } from 'react'

import { Header } from './components/header.tsx'
import { OverviewDriversPane } from './components/overview-drivers-pane.tsx'
import { OverviewTrendPane } from './components/overview-trend-pane.tsx'
import { SessionDetailsPane } from './components/session-details-pane.tsx'
import { SessionListPane } from './components/session-list-pane.tsx'
import {
  type ActiveAgent,
  AGENT_TABS,
  SORT_DIRECTION_OPTIONS,
  SORT_KEY_OPTIONS,
  TIME_WINDOW_OPTIONS,
  useDashboardState,
} from './hooks/use-dashboard-state.ts'

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
  const {
    activeAgent,
    error,
    filteredSessions,
    isRefreshing,
    refresh,
    setActiveAgent,
    setSortDirection,
    setSortKey,
    setTimeWindow,
    snapshot,
    sortDirection,
    sortKey,
    timeWindow,
    trend,
  } = useDashboardState()
  const resolvedSnapshot = snapshot ?? createEmptySnapshot()
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(0)
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const [warningsOpen, setWarningsOpen] = useState(false)
  const contentHeight = Math.max(height - 12, 10)
  const topPaneHeight = Math.max(8, Math.floor(contentHeight * 0.4))
  const bottomPaneHeight = Math.max(6, contentHeight - topPaneHeight - 1)
  const topPaneWidth = Math.max(24, Math.floor((Math.max(24, width) - 1) / 2))
  const bottomPaneWidth = Math.max(24, Math.floor((Math.max(24, width) - 1) / 2))
  const selectedSession = filteredSessions[selectedSessionIndex] ?? null

  function setTab(tab: ActiveAgent) {
    setActiveAgent(tab)
    setSelectedSessionIndex(0)
  }

  function cycleTab(direction: -1 | 1) {
    const currentIndex = AGENT_TABS.indexOf(activeAgent)
    const nextIndex =
      (Math.max(0, currentIndex) + direction + AGENT_TABS.length) % AGENT_TABS.length
    setTab(AGENT_TABS[nextIndex])
  }

  function cycleWindow() {
    const currentIndex = TIME_WINDOW_OPTIONS.indexOf(timeWindow)
    const nextIndex = (Math.max(0, currentIndex) + 1) % TIME_WINDOW_OPTIONS.length
    setTimeWindow(TIME_WINDOW_OPTIONS[nextIndex])
    setSelectedSessionIndex(0)
  }

  function cycleSortKey() {
    const currentIndex = SORT_KEY_OPTIONS.indexOf(sortKey)
    const nextIndex = (Math.max(0, currentIndex) + 1) % SORT_KEY_OPTIONS.length
    setSortKey(SORT_KEY_OPTIONS[nextIndex])
    setSelectedSessionIndex(0)
  }

  function cycleSortDirection() {
    const currentIndex = SORT_DIRECTION_OPTIONS.indexOf(sortDirection)
    const nextIndex = (Math.max(0, currentIndex) + 1) % SORT_DIRECTION_OPTIONS.length
    setSortDirection(SORT_DIRECTION_OPTIONS[nextIndex])
    setSelectedSessionIndex(0)
  }

  useEffect(() => {
    setSelectedSessionIndex((currentIndex) => {
      if (filteredSessions.length === 0) {
        return 0
      }

      return Math.min(currentIndex, filteredSessions.length - 1)
    })
  }, [filteredSessions])

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
      return
    }

    const tabShortcutNumber = Number.parseInt(event.name ?? '', 10)

    if (Number.isInteger(tabShortcutNumber)) {
      const shortcutIndex = tabShortcutNumber - 1
      const targetTab = AGENT_TABS[shortcutIndex]

      if (targetTab) {
        setTab(targetTab)
        return
      }
    }

    if (event.sequence === '[') {
      cycleTab(-1)
      return
    }

    if (event.sequence === ']') {
      cycleTab(1)
      return
    }

    if (event.name === 't') {
      cycleWindow()
      return
    }

    if (event.name === 's') {
      cycleSortKey()
      return
    }

    if (event.name === 'a') {
      cycleSortDirection()
      return
    }

    if (event.name === 'return') {
      setDetailsExpanded((currentValue) => !currentValue)
      return
    }

    if (event.name === 'w') {
      setWarningsOpen((currentValue) => !currentValue)
      return
    }

    if (event.name === 'down' || event.name === 'j') {
      setSelectedSessionIndex((currentIndex) =>
        Math.min(currentIndex + 1, Math.max(filteredSessions.length - 1, 0)),
      )
      return
    }

    if (event.name === 'up' || event.name === 'k') {
      setSelectedSessionIndex((currentIndex) => Math.max(currentIndex - 1, 0))
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
      <Header
        activeTab={activeAgent}
        error={error}
        isRefreshing={isRefreshing}
        snapshot={snapshot}
        sortDirection={sortDirection}
        sortKey={sortKey}
        tabs={AGENT_TABS}
        timeWindow={timeWindow}
        warningCount={resolvedSnapshot.warnings.length}
        width={width}
      />
      <box style={{ flexDirection: 'row', gap: 1, height: topPaneHeight }}>
        <OverviewTrendPane height={topPaneHeight} points={trend} width={topPaneWidth} />
        <OverviewDriversPane
          height={topPaneHeight}
          sessions={filteredSessions}
          totals={resolvedSnapshot.totals}
          width={topPaneWidth}
        />
      </box>
      <box style={{ flexDirection: 'row', gap: 1, height: bottomPaneHeight }}>
        <SessionListPane
          activeFilter={activeAgent}
          height={bottomPaneHeight}
          selectedSessionIndex={selectedSessionIndex}
          sessions={filteredSessions}
          sortDirection={sortDirection}
          sortKey={sortKey}
          width={bottomPaneWidth}
        />
        <SessionDetailsPane
          detailsExpanded={detailsExpanded}
          height={bottomPaneHeight}
          session={selectedSession}
          warningsOpen={warningsOpen}
          warnings={resolvedSnapshot.warnings}
          width={bottomPaneWidth}
        />
      </box>
    </box>
  )
}
