# Agent Ledger

Agent Ledger is a Bun monorepo with a service package that loads local agent usage data and a TUI that renders the aggregated snapshot.

## Runtime Requirements

- Bun 1.1+
- Node.js runtime support for local development tools used by Bun
- A machine with local agent data available in the default locations, or equivalent paths supplied through config
- `node:sqlite` support in Node or Bun's `bun:sqlite` fallback for OpenCode database reads

## Local Source Assumptions

By default the service reads from local, machine-specific paths:

- Claude Code: `~/.claude/projects/**/*.jsonl`
- Gemini: `~/.gemini/tmp/**/chats/session-*.json`
- OpenCode: `~/.local/share/opencode/opencode.db` and optional `-wal`
- Codex: `~/.config/Codex` and `~/.cache/Codex`

Source discovery is best-effort. Missing sources are reported in snapshot source state instead of failing the load.

## Pricing

The service ships with a builtin pricing catalog for supported Anthropic, Google, and OpenAI models.

You can override or extend pricing locally with `~/.config/agent-ledger/pricing.json` by default. The file can be either a JSON array of pricing entries or an object with an `entries` array. Matching `provider` + `model` pairs override builtin entries.

Unknown or unpriced models are still loaded into the snapshot. Their cost fields stay `null` until pricing is available.

## Cache

Snapshots are cached at `~/.local/share/agent-ledger/cache/snapshot.json` by default.

`loadSnapshot()` reuses the cached snapshot when discovered source fingerprints and the pricing override file fingerprint have not changed. Otherwise it rebuilds the snapshot and refreshes the cache.

## Main Commands

- `bun install`
- `bun run typecheck`
- `bunx @biomejs/biome check .`
- `bun run dev`
- `bun run dev:tui`
