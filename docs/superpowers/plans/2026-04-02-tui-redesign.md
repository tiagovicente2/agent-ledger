# Agent Ledger TUI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current dense terminal dashboard with an overview-first, graph-centric, tabbed interface that supports fast scanning and clean drill-down.

**Architecture:** Keep service APIs unchanged and implement all redesign logic in the TUI layer via derived view-model helpers and focused components. Add a deterministic layout with top tabs, overview charts, ranked driver panels, and a stable session explorer/details split. Keep keyboard-first navigation and preserve terminal cleanup behavior on exit.

**Tech Stack:** Bun, TypeScript, React, OpenTUI (`@opentui/core`, `@opentui/react`), Biome

---

## File Structure

- Create: `apps/tui/src/view-models/overview.ts`
- Create: `apps/tui/src/components/overview-trend-pane.tsx`
- Create: `apps/tui/src/components/overview-drivers-pane.tsx`
- Modify: `apps/tui/src/app.tsx`
- Modify: `apps/tui/src/components/header.tsx`
- Modify: `apps/tui/src/components/summary-pane.tsx`
- Modify: `apps/tui/src/components/session-list-pane.tsx`
- Modify: `apps/tui/src/components/session-details-pane.tsx`
- Modify: `apps/tui/src/hooks/use-dashboard-state.ts`
- Modify: `apps/tui/src/main.tsx`

### Task 1: Add Overview View-Model Helpers

**Files:**
- Create: `apps/tui/src/view-models/overview.ts`
- Modify: `apps/tui/src/hooks/use-dashboard-state.ts`

- [ ] **Step 1: Add deterministic data transforms in `overview.ts`**

```ts
// apps/tui/src/view-models/overview.ts
import type { AgentName, SummarySnapshot, UsageSession } from '@agent-ledger/service'

export type TimeWindow = '24h' | '7d' | '30d' | 'all'
export type SortMode = 'recent' | 'tokens' | 'cost' | 'messages'

export interface TrendPoint {
  label: string
  tokens: number
}

export function filterSessions(snapshot: SummarySnapshot, agent: AgentName | 'all', window: TimeWindow) {
  const now = Date.now()
  const cutoffMs =
    window === '24h'
      ? 24 * 60 * 60 * 1000
      : window === '7d'
        ? 7 * 24 * 60 * 60 * 1000
        : window === '30d'
          ? 30 * 24 * 60 * 60 * 1000
          : Number.POSITIVE_INFINITY

  return snapshot.sessions.filter((session) => {
    if (agent !== 'all' && session.agent !== agent) return false
    if (!Number.isFinite(cutoffMs)) return true
    return now - Date.parse(session.startedAt) <= cutoffMs
  })
}

export function sortSessions(sessions: UsageSession[], mode: SortMode): UsageSession[] {
  const copy = [...sessions]
  copy.sort((left, right) => {
    if (mode === 'tokens' && right.tokenTotals.total !== left.tokenTotals.total) {
      return right.tokenTotals.total - left.tokenTotals.total
    }

    if (mode === 'messages' && right.messageCount !== left.messageCount) {
      return right.messageCount - left.messageCount
    }

    if (mode === 'cost') {
      const leftCost = left.estimatedCostUsd ?? Number.NEGATIVE_INFINITY
      const rightCost = right.estimatedCostUsd ?? Number.NEGATIVE_INFINITY
      if (rightCost !== leftCost) return rightCost - leftCost
    }

    return right.startedAt.localeCompare(left.startedAt)
  })
  return copy
}

export function buildTokenTrend(sessions: UsageSession[]): TrendPoint[] {
  const byDay = new Map<string, number>()
  for (const session of sessions) {
    const day = session.startedAt.slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + session.tokenTotals.total)
  }

  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, tokens]) => ({ label, tokens }))
}
```

- [ ] **Step 2: Expose derived dashboard state in `use-dashboard-state.ts`**

```ts
// apps/tui/src/hooks/use-dashboard-state.ts (shape excerpt)
import { useMemo, useState } from 'react'
import { buildTokenTrend, filterSessions, sortSessions, type SortMode, type TimeWindow } from '../view-models/overview.ts'

const [timeWindow, setTimeWindow] = useState<TimeWindow>('7d')
const [sortMode, setSortMode] = useState<SortMode>('recent')

const filteredSessions = useMemo(() => {
  if (!snapshot) return []
  return sortSessions(filterSessions(snapshot, activeAgent, timeWindow), sortMode)
}, [snapshot, activeAgent, timeWindow, sortMode])

const trend = useMemo(() => buildTokenTrend(filteredSessions), [filteredSessions])
```

- [ ] **Step 3: Verify task output**

Run: `bun run typecheck`
Expected: no TypeScript errors

Run: `bunx @biomejs/biome check .`
Expected: no Biome violations

### Task 2: Build Tabbed Header and Global Navigation

**Files:**
- Modify: `apps/tui/src/app.tsx`
- Modify: `apps/tui/src/components/header.tsx`

- [ ] **Step 1: Replace header props and render explicit tab strip**

```tsx
// apps/tui/src/components/header.tsx (render excerpt)
<text>Agent Ledger</text>
<text>
  Tabs: {tabs.map((tab, index) => `${activeTab === tab ? '[' : ''}${index + 1}:${tab}${activeTab === tab ? ']' : ''}`).join(' ')}
</text>
<text>
  Window: {timeWindow} | Sort: {sortMode} | Warnings: {warningCount}
</text>
<text>Keys: 1-5 tabs | [ ] tab cycle | t window | s sort | j/k move | enter details | r refresh | q quit</text>
```

- [ ] **Step 2: Add tab/window hotkeys in `app.tsx`**

```tsx
// apps/tui/src/app.tsx (keyboard excerpt)
if (event.name === '1') setTab('all')
if (event.name === '2') setTab('claude')
if (event.name === '3') setTab('gemini')
if (event.name === '4') setTab('opencode')
if (event.name === '5') setTab('codex')
if (event.sequence === '[') cycleTab(-1)
if (event.sequence === ']') cycleTab(1)
if (event.name === 't') cycleWindow()
if (event.name === 's') cycleSort()
```

- [ ] **Step 3: Verify task output**

Run: `bun run typecheck`
Expected: no TypeScript errors

Run: `bunx @biomejs/biome check .`
Expected: no Biome violations

### Task 3: Add Graph-First Overview Panes

**Files:**
- Create: `apps/tui/src/components/overview-trend-pane.tsx`
- Create: `apps/tui/src/components/overview-drivers-pane.tsx`
- Modify: `apps/tui/src/components/summary-pane.tsx`
- Modify: `apps/tui/src/app.tsx`

- [ ] **Step 1: Implement a width-aware token trend pane**

```tsx
// apps/tui/src/components/overview-trend-pane.tsx (core rendering excerpt)
const maxTokens = Math.max(1, ...points.map((point) => point.tokens))
const chartRows = points.slice(-Math.max(1, width - 12)).map((point) => {
  const barLength = Math.max(1, Math.round((point.tokens / maxTokens) * 20))
  return `${point.label.slice(5)} ${'█'.repeat(barLength)} ${point.tokens.toLocaleString()}`
})
```

- [ ] **Step 2: Implement top drivers pane (models + sessions + agent bars)**

```tsx
// apps/tui/src/components/overview-drivers-pane.tsx (shape excerpt)
<text>Top Models</text>
{topModels.map((row) => (
  <text key={row.model}>{truncate(row.model, 22)} {row.tokens.toLocaleString()} tok</text>
))}
<text>Agent Tokens</text>
{agentBars.map((row) => (
  <text key={row.agent}>{row.agent}: {'▇'.repeat(row.bar)} {row.value.toLocaleString()}</text>
))}
```

- [ ] **Step 3: Wire new panes into the top body layout**

```tsx
// apps/tui/src/app.tsx (top layout excerpt)
<box style={{ flexDirection: 'row', gap: 1, height: topPaneHeight }}>
  <OverviewTrendPane height={topPaneHeight} points={trend} />
  <OverviewDriversPane height={topPaneHeight} sessions={filteredSessions} totals={resolvedSnapshot.totals} />
</box>
```

- [ ] **Step 4: Verify task output**

Run: `bun run typecheck`
Expected: no TypeScript errors

Run: `bunx @biomejs/biome check .`
Expected: no Biome violations

Manual smoke: `bun run dev`
Expected: graph and driver panes render without overlap at normal terminal width

### Task 4: Stabilize Session Explorer and Details Pane

**Files:**
- Modify: `apps/tui/src/components/session-list-pane.tsx`
- Modify: `apps/tui/src/components/session-details-pane.tsx`
- Modify: `apps/tui/src/app.tsx`

- [ ] **Step 1: Convert session list to fixed columns**

```tsx
// apps/tui/src/components/session-list-pane.tsx (row formatter excerpt)
const row = [
  pad(agentLabel, 9),
  pad(truncate(projectLabel, 18), 18),
  pad(tokensLabel, 12),
  pad(costLabel, 10),
  pad(msgLabel, 6),
  pad(startLabel, 16),
].join(' ')
```

- [ ] **Step 2: Add expandable details and warning toggle**

```tsx
// apps/tui/src/app.tsx (state excerpt)
const [detailsExpanded, setDetailsExpanded] = useState(false)
const [warningsOpen, setWarningsOpen] = useState(false)

if (event.name === 'return') setDetailsExpanded((value) => !value)
if (event.name === 'w') setWarningsOpen((value) => !value)
```

```tsx
// apps/tui/src/components/session-details-pane.tsx (conditional excerpt)
{detailsExpanded ? extendedLines.map(...) : compactLines.map(...) }
{warningsOpen ? warningLines.map(...) : null}
```

- [ ] **Step 3: Verify task output**

Run: `bun run typecheck`
Expected: no TypeScript errors

Run: `bunx @biomejs/biome check .`
Expected: no Biome violations

Manual smoke: `bun run dev`
Expected: selection remains stable while changing sort/tab/window; details and warnings toggles work

### Task 5: Exit Cleanly and Final UX Verification

**Files:**
- Modify: `apps/tui/src/main.tsx`
- Modify: `README.md`

- [ ] **Step 1: Confirm quit path always restores terminal modes**

```tsx
// apps/tui/src/main.tsx (quit excerpt)
function quit() {
  if (hasQuit) return
  hasQuit = true
  try {
    root.unmount()
  } finally {
    renderer.destroy()
  }
}
```

- [ ] **Step 2: Document redesigned navigation in README**

```md
## TUI Navigation

- `1..5` switch tabs
- `[` / `]` cycle tabs
- `t` cycle time window
- `s` cycle sort mode
- `j` / `k` move selection
- `enter` expand details
- `w` toggle warning block
- `r` refresh
- `q` quit
```

- [ ] **Step 3: Run final verification**

Run: `bun run typecheck`
Expected: no TypeScript errors

Run: `bunx @biomejs/biome check .`
Expected: no Biome violations

Run: `script -qfec "printf '125tsjkwrq' | bun run dev" /dev/null`
Expected: app starts, processes tab/window/sort/navigation/refresh/quit keys, and exits cleanly with no terminal control-sequence leakage
