import type { SummarySnapshot } from '@agent-ledger/service'
import { useKeyboard, useTerminalDimensions } from '@opentui/react'
import { Fragment, type ReactNode, useEffect } from 'react'

import { HelpOverlay } from './components/help-overlay.tsx'
import { OverviewDriversPane } from './components/overview-drivers-pane.tsx'
import { OverviewTrendPane } from './components/overview-trend-pane.tsx'
import { SessionDetailsPane } from './components/session-details-pane.tsx'
import { SessionListPane } from './components/session-list-pane.tsx'
import { SourceOverlay } from './components/source-overlay.tsx'
import { StatusBar, STATUS_BAR_HEIGHT } from './components/status-bar.tsx'
import { useDashboardUi } from './hooks/use-dashboard-ui.ts'
import {
  type ActiveAgent,
  AGENT_TABS,
  type DashboardState,
  SORT_DIRECTION_OPTIONS,
  SORT_KEY_OPTIONS,
  TIME_WINDOW_OPTIONS,
  useDashboardState,
} from './hooks/use-dashboard-state.ts'

interface AppProps {
  onQuit: () => void
}

interface DashboardAppProps extends AppProps {
  dashboardState: DashboardState
  terminalHeight: number
  terminalWidth: number
}

interface PaneDef {
  key: string
  render: (height: number) => ReactNode
}

const MIN_GRID_WIDTH = 80
const MIN_GRID_BODY_HEIGHT = 12
const MIN_STACK_PANE_HEIGHT = 3

function planPaneHeights(totalHeight: number, desiredCount: number, minHeight: number) {
  if (totalHeight <= 0) {
    return []
  }

  let count = Math.max(1, desiredCount)
  const clampedMin = Math.max(1, Math.min(minHeight, totalHeight))

  while (count > 1 && count * clampedMin > totalHeight) {
    count -= 1
  }

  const heights = new Array<number>(count).fill(clampedMin)
  let remaining = totalHeight - count * clampedMin
  let index = 0

  while (remaining > 0 && count > 0) {
    heights[index % count] += 1
    remaining -= 1
    index += 1
  }

  return heights
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
  const dashboardState = useDashboardState()

  return (
    <DashboardApp
      dashboardState={dashboardState}
      onQuit={onQuit}
      terminalHeight={height}
      terminalWidth={width}
    />
  )
}

export function DashboardApp({
  dashboardState,
  onQuit,
  terminalHeight,
  terminalWidth,
}: DashboardAppProps) {
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
  } = dashboardState
  const resolvedSnapshot = snapshot ?? createEmptySnapshot()
  const {
    closeOverlay,
    moveSelection,
    overlay,
    resetSelection,
    selectedSessionIndex,
    syncSelection,
    toggleOverlay,
  } = useDashboardUi()
  const width = Math.max(terminalWidth, 1)
  const height = Math.max(terminalHeight, STATUS_BAR_HEIGHT + 1)
  const bodyHeight = Math.max(height - STATUS_BAR_HEIGHT, 1)
  const selectedSession = filteredSessions[selectedSessionIndex] ?? null
  const useGridLayout = width >= MIN_GRID_WIDTH && bodyHeight >= MIN_GRID_BODY_HEIGHT
  const isHelpOpen = overlay === 'help'
  const isSourceOverlayOpen = overlay === 'sources'

  function setTab(tab: ActiveAgent) {
    setActiveAgent(tab)
    resetSelection()
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
    resetSelection()
  }

  function cycleSortKey() {
    const currentIndex = SORT_KEY_OPTIONS.indexOf(sortKey)
    const nextIndex = (Math.max(0, currentIndex) + 1) % SORT_KEY_OPTIONS.length
    setSortKey(SORT_KEY_OPTIONS[nextIndex])
    resetSelection()
  }

  function cycleSortDirection() {
    const currentIndex = SORT_DIRECTION_OPTIONS.indexOf(sortDirection)
    const nextIndex = (Math.max(0, currentIndex) + 1) % SORT_DIRECTION_OPTIONS.length
    setSortDirection(SORT_DIRECTION_OPTIONS[nextIndex])
    resetSelection()
  }

  useEffect(() => {
    syncSelection(filteredSessions.length)
  }, [filteredSessions.length, syncSelection])

  useKeyboard((event) => {
    if (event.ctrl && event.name === 'c') {
      onQuit()
      return
    }

    const helpToggleRequested = event.sequence === '?'
    const sourceOverlayRequested = event.name === 'w'

    if (overlay !== 'none') {
      if (event.name === 'escape' || event.name === 'q') {
        closeOverlay()
        return
      }

      if (helpToggleRequested) {
        toggleOverlay('help')
        return
      }

      if (sourceOverlayRequested) {
        toggleOverlay('sources')
      }

      return
    }

    if (helpToggleRequested) {
      toggleOverlay('help')
      return
    }

    if (sourceOverlayRequested) {
      toggleOverlay('sources')
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

    if (event.name === 'down' || event.name === 'j') {
      moveSelection(1, filteredSessions.length)
      return
    }

    if (event.name === 'up' || event.name === 'k') {
      moveSelection(-1, filteredSessions.length)
    }
  })

  const paneWidth = Math.max(1, width)
  const helpOverlay = isHelpOpen ? <HelpOverlay height={bodyHeight} width={width} /> : null
  const sourceOverlay = isSourceOverlayOpen ? (
    <SourceOverlay error={error} height={bodyHeight} snapshot={resolvedSnapshot} width={width} />
  ) : null
  const statusBar = (
    <StatusBar
      activeTab={activeAgent}
      error={error}
      generatedAt={snapshot?.generatedAt ?? null}
      isRefreshing={isRefreshing}
      selectedSessionCount={filteredSessions.length}
      selectedSessionIndex={selectedSessionIndex}
      sortDirection={sortDirection}
      sortKey={sortKey}
      tabs={AGENT_TABS}
      timeWindow={timeWindow}
      warningCount={resolvedSnapshot.warnings.length}
      width={width}
    />
  )

  const compactPanes: PaneDef[] = [
    {
      key: 'sessions',
      render: (paneHeight) => (
        <SessionListPane
          activeFilter={activeAgent}
          height={paneHeight}
          selectedSessionIndex={selectedSessionIndex}
          sessions={filteredSessions}
          sortDirection={sortDirection}
          sortKey={sortKey}
          width={paneWidth}
        />
      ),
    },
    {
      key: 'details',
      render: (paneHeight) => (
        <SessionDetailsPane height={paneHeight} session={selectedSession} width={paneWidth} />
      ),
    },
    {
      key: 'trend',
      render: (paneHeight) => (
        <OverviewTrendPane height={paneHeight} points={trend} width={paneWidth} />
      ),
    },
    {
      key: 'drivers',
      render: (paneHeight) => (
        <OverviewDriversPane
          height={paneHeight}
          sessions={filteredSessions}
          totals={resolvedSnapshot.totals}
          width={paneWidth}
        />
      ),
    },
  ]

  const compactPaneHeights = planPaneHeights(bodyHeight, compactPanes.length, MIN_STACK_PANE_HEIGHT)

  if (!useGridLayout) {
    return (
      <box
        style={{
          flexDirection: 'column',
          height,
          position: 'relative',
          width,
        }}
      >
        <box style={{ flexDirection: 'column', height: bodyHeight, width }}>
          {compactPaneHeights.map((paneHeight, index) => (
            <Fragment key={compactPanes[index].key}>
              {compactPanes[index].render(paneHeight)}
            </Fragment>
          ))}
        </box>
        {statusBar}
        {helpOverlay}
        {sourceOverlay}
      </box>
    )
  }

  const topPaneHeight = Math.max(1, Math.floor(bodyHeight * 0.45))
  const bottomPaneHeight = Math.max(1, bodyHeight - topPaneHeight)
  const leftPaneWidth = Math.floor(width / 2)
  const rightPaneWidth = width - leftPaneWidth

  return (
    <box
      style={{
        flexDirection: 'column',
        height,
        position: 'relative',
        width,
      }}
    >
      <box style={{ flexDirection: 'row', height: topPaneHeight }}>
        <OverviewTrendPane height={topPaneHeight} points={trend} width={leftPaneWidth} />
        <OverviewDriversPane
          height={topPaneHeight}
          sessions={filteredSessions}
          totals={resolvedSnapshot.totals}
          width={rightPaneWidth}
        />
      </box>
      <box style={{ flexDirection: 'row', height: bottomPaneHeight }}>
        <SessionListPane
          activeFilter={activeAgent}
          height={bottomPaneHeight}
          selectedSessionIndex={selectedSessionIndex}
          sessions={filteredSessions}
          sortDirection={sortDirection}
          sortKey={sortKey}
          width={leftPaneWidth}
        />
        <SessionDetailsPane
          height={bottomPaneHeight}
          session={selectedSession}
          width={rightPaneWidth}
        />
      </box>
      {statusBar}
      {helpOverlay}
      {sourceOverlay}
    </box>
  )
}
