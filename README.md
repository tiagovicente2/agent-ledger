# Agent Ledger

Agent Ledger is a Bun monorepo that reads local coding-agent usage data and shows a summarized snapshot in an OpenTUI dashboard.

Costs are resolved from a mix of native source-reported values and local pricing estimates. The TUI uses `~$` for estimated or partial costs and reserves `n/a` for sessions where no usable cost data could be resolved.

<img width="1512" height="1000" alt="image" src="https://github.com/user-attachments/assets/8f76b2d6-7df6-442d-9026-6f42f75243cd" />

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

### Demo Data for Screenshots

Use the built-in demo snapshot when you want to record the UI without showing your real projects:

```sh
bun run dev -- --demo
```

You can also write the demo snapshot to disk and reopen it later:

```sh
bun run snapshot -- --demo --out demo/demo-snapshot.json
bun run dev -- --snapshot demo/demo-snapshot.json
```

You can force a cost policy when generating a snapshot:

```sh
bun run snapshot -- --cost-mode auto
bun run snapshot -- --cost-mode calculate
bun run snapshot -- --cost-mode display
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

Agent Ledger prefers native costs when a source provides them, currently including pi sessions and some OpenCode records.

## Main Commands

- `bun run dev`
- `bun run snapshot`
- `bun run snapshot -- --demo --out demo/demo-snapshot.json`
- `bun run build:release`

## Documentation

- [How it works](docs/how-it-works.md)
- [Pricing](docs/pricing.md)

For new or mismatched models, you can always override pricing locally via `~/.config/agent-ledger/pricing.json`.
