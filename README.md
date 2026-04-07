# Agent Ledger

Agent Ledger is a Bun monorepo that reads local coding-agent usage data and shows a summarized snapshot in an OpenTUI dashboard.

## Installation

```sh
curl -fsSL https://al.arpgg.io/install | bash
```

## Usage

```sh
agent-ledger
```

## Local Development

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
- `r` refresh
- `q` quit

## Requirements

- Bun
- Local agent data (unless you want to run against empty sources)
- SQLite (for OpenCode data)

## Main Commands

- `bun run dev`
- `bun run snapshot`
- `bun run build:release`

## Documentation

- [How it works](docs/how-it-works.md)
- [Pricing](docs/pricing.md)
