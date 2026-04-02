# Agent Ledger TUI Redesign

## Goal

Redesign the terminal dashboard so usage and cost signals are understandable in 5-10 seconds, with clearer layout, graph-first summary, and quick keyboard navigation by agent.

## Scope

### In Scope

- Replace the current dense mixed-pane layout with an overview-first layout.
- Add top navigation tabs for `All`, `Claude`, `Gemini`, `OpenCode`, and `Codex`.
- Add an overview chart: tokens over time.
- Add compact secondary summaries: top drivers and per-agent quick bars.
- Improve session browsing with stable columns, explicit sort mode, and selection details.
- Keep all interactions keyboard-first.

### Out of Scope

- External GUI/web frontend.
- New storage backends.
- Historical backfill beyond what current source adapters already load.

## UX Principles

1. **Scan first, inspect second**: primary numbers and trend are visible immediately.
2. **One filter controls all panes**: active tab and time window affect every section.
3. **Stable geometry**: fixed pane borders and predictable text widths avoid jumping content.
4. **Keyboard-only flow**: all major actions have direct hotkeys.

## Information Architecture

### Views

- `Overview` (default)
  - Trend graph
  - Agent summary bars
  - Top model/session drivers
  - Session table with details

### Tabs (global filter)

- `All`
- `Claude`
- `Gemini`
- `OpenCode`
- `Codex`

Tabs change chart data, quick bars, drivers, session list, and details simultaneously.

## Layout Specification

### Header (full width)

- App title
- data freshness status (`ready`, `refreshing`, `error`)
- active tab
- active time window (`24h`, `7d`, `30d`, `all`)
- active sort mode (`recent`, `tokens`, `cost`, `messages`)
- key hints

### Upper Body (two columns)

- Left (about 65%): **Tokens Over Time** chart
- Right (about 35%):
  - agent token bars
  - agent cost bars (when priced)
  - top models list

### Lower Body (two columns)

- Left: session table/list
- Right: selected session details (metadata, token split, cost, warnings)

## Data and Transformations

No service API contract changes are required. The TUI derives view state from `SummarySnapshot`:

- Bucket `session.startedAt` into time windows for trend chart.
- Aggregate tokens/cost by agent for quick bars.
- Rank top drivers by selected metric.
- Filter session rows by active tab and time window.

If `totalEstimatedCostUsd` is `null`, cost visuals still render per-item where available and display a "partial pricing" badge.

## Interaction Model

- `1..5`: jump to tab (`All`, `Claude`, `Gemini`, `OpenCode`, `Codex`)
- `[` / `]`: previous/next tab
- `t`: cycle time window
- `s`: cycle sort mode
- `j` / `k` or arrows: move session selection
- `enter`: expand/collapse extended details block
- `w`: toggle warning detail block
- `r`: refresh snapshot
- `q`: quit

## Graph Rendering

Use ASCII/Unicode-safe graph primitives compatible with OpenTUI text rendering:

- Line/spark columns for tokens over time
- Horizontal bars for per-agent totals
- Width-aware truncation and value formatting

Graph rendering must gracefully degrade to "insufficient data" with empty states.

## Error Handling

- Keep stale snapshot visible while refresh is in progress.
- Refresh failure should show banner text without resetting current selection.
- Missing agent data should render explicit zero/empty rows rather than shifting layout.

## Verification Strategy

- Typecheck and Biome check must pass.
- Manual smoke:
  - open dashboard
  - switch tabs and time windows
  - change sort mode
  - navigate session list
  - verify details pane updates
  - quit and confirm terminal modes restore cleanly

## File-Level Plan (Design Intent)

- `apps/tui/src/app.tsx`: orchestrate view state, hotkeys, pane composition
- `apps/tui/src/components/header.tsx`: tab/time/sort/status presentation
- `apps/tui/src/components/summary-pane.tsx`: trend and aggregate panels
- `apps/tui/src/components/session-list-pane.tsx`: stable, sortable session rows
- `apps/tui/src/components/session-details-pane.tsx`: focused drilldown
- `apps/tui/src/hooks/use-dashboard-state.ts`: refresh lifecycle and derived datasets
