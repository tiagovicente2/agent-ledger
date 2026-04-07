import { afterEach, describe, expect, test } from 'bun:test'
import type { SummarySnapshot, UsageSession } from '@agent-ledger/service'
import type { KeyEvent } from '@opentui/core'
import { testRender } from '@opentui/react/test-utils'
import { act, useState } from 'react'

import { DashboardApp } from './app.tsx'
import { SessionDetailsPane } from './components/session-details-pane.tsx'
import { SessionListPane } from './components/session-list-pane.tsx'
import type { ActiveAgent, DashboardState } from './hooks/use-dashboard-state.ts'
import {
  buildTokenTrend,
  filterSessions,
  type SortDirection,
  type SortKey,
  sortSessions,
  type TimeWindow,
} from './view-models/overview.ts'

let testSetup: Awaited<ReturnType<typeof testRender>> | undefined

function getTestSetup() {
  if (!testSetup) {
    throw new Error('test setup was not initialized')
  }

  return testSetup
}

const BASE_SESSIONS: UsageSession[] = [
  {
    id: 'session-1',
    agent: 'claude',
    nativeSessionId: 'native-1',
    projectPath: '/workspaces/atlas',
    startedAt: '2026-04-04T10:00:00.000Z',
    endedAt: '2026-04-04T10:20:00.000Z',
    messageCount: 6,
    modelsUsed: ['anthropic/claude-sonnet-4'],
    tokenTotals: {
      input: 1800,
      output: 900,
      reasoning: 300,
      cacheRead: 150,
      cacheWrite: 50,
      total: 3200,
    },
    estimatedCostUsd: 1.12,
    confidence: 'exact',
    inferenceReason: null,
  },
  {
    id: 'session-2',
    agent: 'gemini',
    nativeSessionId: 'native-2',
    projectPath: '/workspaces/orbit',
    startedAt: '2026-04-04T11:00:00.000Z',
    endedAt: '2026-04-04T11:08:00.000Z',
    messageCount: 4,
    modelsUsed: ['google/gemini-2.5-pro'],
    tokenTotals: {
      input: 1200,
      output: 400,
      reasoning: 900,
      cacheRead: 0,
      cacheWrite: 0,
      total: 2500,
    },
    estimatedCostUsd: 0.87,
    confidence: 'exact',
    inferenceReason: null,
  },
  {
    id: 'session-3',
    agent: 'opencode',
    nativeSessionId: null,
    projectPath: '/workspaces/zephyr',
    startedAt: '2026-03-28T09:00:00.000Z',
    endedAt: '2026-03-28T09:45:00.000Z',
    messageCount: 9,
    modelsUsed: ['openai/o4-mini', 'openai/gpt-4.1'],
    tokenTotals: {
      input: 2800,
      output: 1500,
      reasoning: 700,
      cacheRead: 200,
      cacheWrite: 100,
      total: 5300,
    },
    estimatedCostUsd: 2.41,
    confidence: 'inferred',
    inferenceReason: 'merged contiguous transcript entries',
  },
]

const DETAIL_SESSION: UsageSession = {
  ...BASE_SESSIONS[2],
  startedAt: 'invalid-date',
  endedAt: 'invalid-date',
}

const BASE_SNAPSHOT: SummarySnapshot = {
  generatedAt: '',
  sources: [],
  sessions: BASE_SESSIONS,
  totals: {
    sessionsCount: BASE_SESSIONS.length,
    tokens: {
      input: 5800,
      output: 2800,
      reasoning: 1900,
      cacheRead: 350,
      cacheWrite: 150,
      total: 11000,
    },
    totalEstimatedCostUsd: 4.4,
  },
  warnings: ['pricing table missing one archival model'],
}

function createStaticDashboardState(
  overrides: Partial<DashboardState> = {},
  snapshot: SummarySnapshot | null = null,
): DashboardState {
  return {
    activeAgent: 'all',
    filteredSessions: [],
    error: null,
    isRefreshing: false,
    refresh: async () => {},
    setActiveAgent: () => {},
    setSortDirection: () => {},
    setSortKey: () => {},
    setTimeWindow: () => {},
    snapshot,
    sortDirection: 'desc',
    sortKey: 'recent',
    timeWindow: '7d',
    trend: [],
    ...overrides,
  }
}

function DashboardHarness({ width, height }: { width: number; height: number }) {
  const [activeAgent, setActiveAgent] = useState<ActiveAgent>('all')
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('7d')
  const [sortKey, setSortKey] = useState<SortKey>('recent')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const filteredSessions = sortSessions(
    filterSessions(BASE_SNAPSHOT, activeAgent, timeWindow),
    sortKey,
    sortDirection,
  )

  const dashboardState: DashboardState = {
    activeAgent,
    filteredSessions,
    error: null,
    isRefreshing: false,
    refresh: async () => {},
    setActiveAgent,
    setSortDirection,
    setSortKey,
    setTimeWindow,
    snapshot: BASE_SNAPSHOT,
    sortDirection,
    sortKey,
    timeWindow,
    trend: buildTokenTrend(filteredSessions),
  }

  return (
    <DashboardApp
      dashboardState={dashboardState}
      onQuit={() => {}}
      terminalHeight={height}
      terminalWidth={width}
    />
  )
}

function emitKey(key: Partial<KeyEvent> & Pick<KeyEvent, 'name' | 'sequence'>) {
  const event = {
    ctrl: false,
    eventType: 'press',
    meta: false,
    option: false,
    _defaultPrevented: false,
    _propagationStopped: false,
    repeated: false,
    shift: false,
    ...key,
  } as unknown as KeyEvent

  getTestSetup().renderer.keyInput.emit('keypress', event)
}

afterEach(async () => {
  if (testSetup) {
    await act(async () => {
      testSetup?.renderer.destroy()
    })
    testSetup = undefined
  }
})

describe('DashboardApp', () => {
  test('matches a wide-layout snapshot', async () => {
    testSetup = await testRender(
      <DashboardApp
        dashboardState={createStaticDashboardState()}
        onQuit={() => {}}
        terminalHeight={24}
        terminalWidth={100}
      />,
      { width: 100, height: 24 },
    )

    await testSetup.renderOnce()

    expect(getTestSetup().captureCharFrame()).toMatchSnapshot()
  })

  test('matches a compact stacked snapshot on small terminals', async () => {
    testSetup = await testRender(
      <DashboardApp
        dashboardState={createStaticDashboardState()}
        onQuit={() => {}}
        terminalHeight={14}
        terminalWidth={60}
      />,
      { width: 60, height: 14 },
    )

    await testSetup.renderOnce()

    expect(getTestSetup().captureCharFrame()).toMatchSnapshot()
  })

  test('updates selection and filters in response to keyboard input', async () => {
    testSetup = await testRender(<DashboardHarness width={100} height={24} />, {
      width: 100,
      height: 24,
    })

    await testSetup.renderOnce()
    expect(getTestSetup().captureCharFrame()).toContain('> Gemini')

    await act(async () => {
      emitKey({ name: 'j', sequence: 'j' })
      await Promise.resolve()
    })
    await getTestSetup().renderOnce()
    expect(getTestSetup().captureCharFrame()).toContain('> Claude')

    await act(async () => {
      emitKey({ name: 's', sequence: 's' })
      await Promise.resolve()
    })
    await getTestSetup().renderOnce()
    expect(getTestSetup().captureCharFrame()).toContain('Sort: Token Usage DESC')

    await act(async () => {
      emitKey({ name: 'a', sequence: 'a' })
      await Promise.resolve()
    })
    await getTestSetup().renderOnce()
    expect(getTestSetup().captureCharFrame()).toContain('Sort: Token Usage ASC')

    await act(async () => {
      emitKey({ name: '2', sequence: '2' })
      await Promise.resolve()
    })
    await getTestSetup().renderOnce()
    const filteredFrame = getTestSetup().captureCharFrame()
    expect(filteredFrame).toContain('Sessions | Agent: claude')
    expect(filteredFrame).toContain('tab claude')
    expect(filteredFrame).toContain('warn 1')
    expect(filteredFrame).toContain('w details')
  })

  test('toggles keyboard help overlay', async () => {
    testSetup = await testRender(<DashboardHarness width={100} height={24} />, {
      width: 100,
      height: 24,
    })

    await testSetup.renderOnce()

    await act(async () => {
      emitKey({ name: '?', sequence: '?' })
      await Promise.resolve()
    })
    await getTestSetup().renderOnce()

    const helpFrame = getTestSetup().captureCharFrame()
    expect(helpFrame).toContain('Keyboard Help')
    expect(helpFrame).toContain('Press Esc, q, or ? to close.')

    await act(async () => {
      emitKey({ name: 'escape', sequence: '\u001B' })
      await Promise.resolve()
    })
    await getTestSetup().renderOnce()

    expect(getTestSetup().captureCharFrame()).toContain('? help')
  })

  test('toggles source health overlay', async () => {
    testSetup = await testRender(<DashboardHarness width={100} height={24} />, {
      width: 100,
      height: 24,
    })

    await testSetup.renderOnce()

    await act(async () => {
      emitKey({ name: 'w', sequence: 'w' })
      await Promise.resolve()
    })
    await getTestSetup().renderOnce()

    const sourceFrame = getTestSetup().captureCharFrame()
    expect(sourceFrame).toContain('Source Health')
    expect(sourceFrame).toContain('pricing table')
    expect(sourceFrame).toContain('archival model')
    expect(sourceFrame).toContain('No source state loaded yet.')

    await act(async () => {
      emitKey({ name: 'w', sequence: 'w' })
      await Promise.resolve()
    })
    await getTestSetup().renderOnce()

    expect(getTestSetup().captureCharFrame()).toContain('warn 1')
  })
})

describe('Pane snapshots', () => {
  test('matches a compact SessionListPane snapshot', async () => {
    testSetup = await testRender(
      <SessionListPane
        activeFilter="all"
        height={8}
        selectedSessionIndex={0}
        sessions={BASE_SESSIONS}
        sortDirection="desc"
        sortKey="recent"
        width={48}
      />,
      { width: 48, height: 8 },
    )

    await testSetup.renderOnce()

    expect(getTestSetup().captureCharFrame()).toMatchSnapshot()
  })

  test('matches a narrow SessionDetailsPane snapshot', async () => {
    testSetup = await testRender(
      <SessionDetailsPane height={12} session={DETAIL_SESSION} width={52} />,
      { width: 52, height: 12 },
    )

    await testSetup.renderOnce()

    expect(getTestSetup().captureCharFrame()).toMatchSnapshot()
  })
})
