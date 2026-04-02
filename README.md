# Agent Ledger

Agent Ledger is a Bun monorepo that reads local coding-agent usage data and shows a summarized snapshot in an OpenTUI dashboard.

## Quick Start

From the project root:

```sh
bun install
bun run dev
```

## TUI Navigation

- `1..5` switch tabs
- `[` / `]` cycle tabs
- `t` cycle time window
- `s` cycle sort key
- `a` toggle sort order
- `j` / `k` or arrows move session selection
- `enter` toggle expanded session details
- `w` toggle warning details
- `r` refresh
- `q` quit

## Requirements

- Bun installed
- local agent data on the machine, unless you plan to run it against empty sources
- SQLite support through Bun for reading the OpenCode database

## Main Commands

- `bun run dev`
- `bun run snapshot`

## Documentation

- How it works: `docs/how-it-works.md`
- Pricing: `docs/pricing.md`
