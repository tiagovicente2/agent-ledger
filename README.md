# Agent Ledger

Agent Ledger is a Bun monorepo that reads local coding-agent usage data and shows a summarized snapshot in an OpenTUI dashboard.

## Installation

Linux and macOS:

```sh
curl -fsSL https://al.arpgg.io/install | bash
agent-ledger
```

The installer prefers a user-writable directory that is already on `PATH`, so on most setups the command is available immediately after install.

## Local Development

```sh
bun install
bun run dev
```

## Keybindings

- `1..6` switch tabs
- `[` / `]` cycle tabs
- `t` cycle time window
- `s` cycle sort key
- `a` toggle sort order
- `j` / `k` or arrows move session selection
- `r` refresh
- `w` open source health and warnings
- `?` open keyboard help
- `q` quit

## Requirements

- Bun
- Local agent data (unless you want to run against empty sources)
- SQLite (for OpenCode data)

Default sources include Claude Code, Gemini, OpenCode, Codex, and pi session files.

## Main Commands

- `bun run dev`
- `bun run snapshot`
- `bun run build:release`

## Documentation

- [How it works](docs/how-it-works.md)
- [Pricing](docs/pricing.md)
