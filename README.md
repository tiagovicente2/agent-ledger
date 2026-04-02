# Agent Ledger

Agent Ledger is a Bun monorepo that reads local coding-agent usage data and shows a summarized snapshot in an OpenTUI dashboard.

## Quick Start

From the project root:

```sh
bun install
bun run dev
```

What happens:

- the TUI starts in your terminal
- it loads a snapshot from your local Claude, Gemini, and OpenCode data when present
- press `r` to refresh
- press `q` to quit
- `Ctrl+C` also exits

## TUI Navigation

- `1..5` switch tabs
- `[` / `]` cycle tabs
- `t` cycle time window
- `s` cycle sort mode
- `j` / `k` or arrows move session selection
- `enter` toggle expanded session details
- `w` toggle warning details
- `r` refresh
- `q` quit

If you only want verification commands:

```sh
bun run typecheck
bunx @biomejs/biome check .
bun test
```

## Requirements

- Bun installed
- local agent data on the machine, unless you plan to run it against empty sources
- SQLite support through Bun for reading the OpenCode database

## Where It Reads Data

By default Agent Ledger looks in these local paths:

- Claude Code: `~/.claude/projects/**/*.jsonl`
- Gemini: `~/.gemini/tmp/**/chats/session-*.json`
- OpenCode: `~/.local/share/opencode/opencode.db` and optional `opencode.db-wal`
- Codex: `~/.config/Codex` and `~/.cache/Codex`

Source discovery is best-effort.

- missing sources do not crash the app
- each source is reported as `ready`, `partial`, `not_detected`, or `error`
- Codex currently stays dormant unless local runtime data is detected

## What You Should Expect

On startup, the dashboard shows:

- source status for each agent
- total token usage
- estimated total cost when pricing is known
- recent sessions
- warnings from discovery or parsing

If a model has no pricing entry yet, usage still loads but cost stays `null`.

## Pricing Overrides

Built-in pricing covers a limited set of known models.

You can override or extend pricing with:

`~/.config/agent-ledger/pricing.json`

Accepted formats:

- a JSON array of pricing entries
- an object with an `entries` array

Matching `provider` + `model` pairs override builtin entries.

Example:

```json
[
  {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514",
    "currency": "USD",
    "inputPerMillion": 3,
    "outputPerMillion": 15,
    "reasoningPerMillion": 0,
    "cacheReadPerMillion": 0.3,
    "cacheWritePerMillion": 3.75,
    "source": "local_override"
  },
  {
    "provider": "openai",
    "model": "gpt-5-codex",
    "currency": "USD",
    "inputPerMillion": 1.25,
    "outputPerMillion": 10,
    "reasoningPerMillion": 0,
    "cacheReadPerMillion": 0,
    "cacheWritePerMillion": 0,
    "source": "local_override"
  }
]
```

## Cache

Snapshots are cached at:

`~/.local/share/agent-ledger/cache/snapshot.json`

The service reuses the cached snapshot when:

- discovered source fingerprints match
- the pricing override fingerprint matches

Otherwise it rebuilds the snapshot and writes a fresh cache file.

## Main Commands

- `bun run dev`
- `bun run dev:tui`
- `bun run typecheck`
- `bunx @biomejs/biome check .`
- `bun test`

## Development

Monorepo structure:

- `apps/tui`: the OpenTUI app that renders the dashboard
- `packages/service`: local discovery, adapters, normalization, pricing, cache, and snapshot loading
- `docs`: planning and implementation notes

Useful development flow:

1. run `bun install`
2. run `bun run typecheck`
3. run `bun run dev`
4. press `r` after changing service logic or local source data
