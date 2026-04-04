# OpenTUI Component Review

Date: 2026-04-04
Scope: `apps/tui`
Framework: OpenTUI React (`@opentui/react` + `@opentui/core`)

## Summary

The TUI is built on the correct OpenTUI React foundation and generally follows the expected renderer, JSX, and keyboard patterns. The main implementation risks are in responsive layout behavior, a narrow-width rendering bug in the session details token mix, lack of renderer-level tests, and a few maintenance issues caused by duplicated rendering logic and unused components.

## Findings

### 1. High: top-level layout overflows on small terminals

Files:
- `apps/tui/src/app.tsx:66-70`
- `apps/tui/src/app.tsx:182-227`

Problem:
The root app sets a minimum height of `12`, but the layout below it requires much more than that:
- header: `8`
- top row minimum: `8`
- bottom row minimum: `6`

This means the effective minimum content height is `22`, not `12`. On shorter terminals, the child panes cannot fit inside the root container, so the lower panes will clip or become unreachable.

Why this matters:
Support for small terminals is required. This is the main functional responsiveness bug in the current TUI and should be treated as a real defect rather than a visual compromise.

Suggested fix:
Rework the vertical sizing logic so the app degrades intentionally under constrained height.

Recommended approach:
- Compute available height after the header first.
- If there is enough space, render the current 2x2 dashboard layout.
- If height is constrained, switch to a stacked layout instead of enforcing fixed pane minimums.
- Use `flexGrow` where possible instead of manually forcing pane heights that exceed the parent.
- Define explicit breakpoints such as normal layout, compact stacked layout, and ultra-compact summary-only layout.

### 2. Medium: narrow-width token layout is inverted

Files:
- `apps/tui/src/components/session-details-pane.tsx:417-418`
- `apps/tui/src/components/session-details-pane.tsx:172-184`

Problem:
When `contentWidth <= 44`, the component switches token rows to `2` columns instead of `1`.

This makes the narrow layout worse because each token row gets less horizontal space exactly when space is already limited. The result is more truncation and less readable token distribution output.

Why this matters:
This affects one of the key detail views in the dashboard and is especially visible in the terminals where readability already matters most.

Suggested fix:
Invert the condition:
- use `1` column for narrow widths
- use `2` columns only when there is enough width to support it

Recommended implementation:
Replace:
`const tokenColumns: 1 | 2 = contentWidth <= 44 ? 2 : 1`

With logic closer to:
`const tokenColumns: 1 | 2 = contentWidth >= <safe-threshold> ? 2 : 1`

The exact threshold should be chosen after validating how much width a token row needs without aggressive truncation.

### 3. Medium: no OpenTUI renderer-based test coverage

Files:
- `apps/tui/package.json:5-7`
- `apps/tui/src/**/*`

Problem:
The TUI has no component or renderer-level tests. The app relies heavily on:
- manual width calculations
- truncation
- ASCII frame rendering
- keyboard navigation
- multiple compact and wide rendering branches

This is exactly the kind of UI that benefits from OpenTUI snapshot and interaction tests.

Why this matters:
Without tests, layout regressions and keyboard regressions are easy to introduce, especially when changing width thresholds or shared formatting logic.

Suggested fix:
Add a small but meaningful OpenTUI test suite using `@opentui/react/test-utils`.

Recommended minimum coverage:
- snapshot test for `App` at a wide terminal size
- snapshot test for `App` at a small terminal size
- snapshot test for `SessionDetailsPane` narrow mode
- snapshot test for `SessionListPane` compact mode
- interaction test for keyboard navigation covering `j` / `k`, tab switching shortcuts, `t`, `s`, and `a`
- regression test for the no-session and empty-data states

### 4. Low-Medium: Ctrl+C ownership is split between renderer and app

Files:
- `apps/tui/src/main.tsx:6-11`
- `apps/tui/src/app.tsx:116-120`

Problem:
The renderer is created with `exitOnCtrlC: true`, but the app also handles `Ctrl+C` in `useKeyboard` and calls `onQuit()`.

Why this matters:
The current implementation is probably safe because `quit()` is idempotent, but the shutdown contract is ambiguous. This can become fragile if cleanup grows more complex later.

Suggested fix:
Choose one ownership model.

Preferred options:
- renderer-owned Ctrl+C:
  - keep `exitOnCtrlC: true`
  - remove the manual `Ctrl+C` branch from `App`
- app-owned Ctrl+C:
  - set `exitOnCtrlC: false`
  - keep the `useKeyboard` handler
  - continue routing through the existing `quit()` path

The second option is usually cleaner if the app wants all quit behavior centralized.

### 5. Low: orphaned components are still present in the codebase

Files:
- `apps/tui/src/components/summary-pane.tsx`
- `apps/tui/src/components/source-status-pane.tsx`
- `apps/tui/src/components/warnings-pane.tsx`

Observation:
These components appear to be unused. No imports were found for them under `apps/tui/src`.

Why this matters:
Unused components increase maintenance cost and make the codebase harder to review because they look like active UI surface area when they are not.

Suggested fix:
Decide whether they are intentionally retired or planned for reuse.

Recommended action:
If the redesign replaced them and there is no near-term reuse plan, remove them.

## Points Of Attention

### 1. Framing and truncation logic is duplicated across panes

Files:
- `apps/tui/src/components/header.tsx`
- `apps/tui/src/components/overview-trend-pane.tsx`
- `apps/tui/src/components/overview-drivers-pane.tsx`
- `apps/tui/src/components/session-list-pane.tsx`
- `apps/tui/src/components/session-details-pane.tsx`

Observation:
The following patterns are repeated in multiple files:
- centered top border generation
- truncation helpers
- padded row construction
- bar rendering
- framed row rendering

Why this matters:
This is not a bug by itself, but it increases the risk that one pane gets fixed while another keeps slightly different behavior.

Suggested fix:
After the layout bugs are fixed, consider extracting a very small shared formatting layer for border and title framing, row truncation, and text bar generation.

This should stay minimal. Avoid over-abstracting prematurely.

### 2. Layout is mostly manual rather than flex-driven

Files:
- `apps/tui/src/app.tsx`
- pane components using explicit width and height math

Observation:
A lot of sizing is hard-coded through manual arithmetic instead of allowing more of the layout to be handled by flex behavior.

Why this matters:
Manual size math is workable, but it becomes brittle across terminal breakpoints.

Suggested fix:
Use manual calculations only for true breakpoint decisions. For everything else, prefer `flexDirection`, `flexGrow`, explicit breakpoints, and fewer competing minimums.

## Strengths

- Correct OpenTUI React setup with `@opentui/react`, `@opentui/core`, `jsxImportSource`, `createCliRenderer`, and `createRoot`
- Proper quit path uses renderer cleanup instead of `process.exit()`
- Keyboard handling is centralized in one top-level `useKeyboard` hook
- The current panes show strong attention to compact information density
- Repeated rows use stable enough deduped keys instead of unsafe plain indexes

## Priority Order

1. Fix top-level small-terminal layout overflow.
2. Fix `SessionDetailsPane` narrow token column logic.
3. Add OpenTUI renderer-based regression tests.
4. Unify Ctrl+C ownership.
5. Remove or formally retire orphaned components.
6. Consider extracting minimal shared framing helpers.

## Suggested Implementation Plan

1. Add responsive breakpoints to `App` for short terminals.
2. Replace fixed pane minimums with a compact stacked fallback.
3. Fix `SessionDetailsPane` token column condition.
4. Add snapshot coverage for wide and narrow states.
5. Add interaction coverage for keyboard navigation.
6. Remove unused components if confirmed obsolete.
7. Optionally extract shared render helpers only after behavior is stable.

## Review Notes

This review used the OpenTUI React, layout, keyboard, and testing references to validate the current implementation against framework expectations. The main conclusion is that the code is on the right framework path, but the responsive behavior needs hardening before the TUI can be considered robust on smaller terminal sizes.
