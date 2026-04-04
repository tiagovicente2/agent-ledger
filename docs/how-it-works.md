# How Agent Ledger Works

Agent Ledger reads local usage artifacts from coding assistants, normalizes message-level data, and renders a unified OpenTUI dashboard.

## Runtime Flow

1. discover local data sources
2. load and parse source-specific records
3. normalize records into a shared usage model
4. estimate cost when pricing is available
5. aggregate messages into sessions and totals
6. cache the resulting snapshot
7. render the dashboard from the snapshot

## Data Sources

Default paths:

- Claude Code: `~/.claude/projects/**/*.jsonl`
- Gemini: `~/.gemini/tmp/**/chats/session-*.json`
- OpenCode: `~/.local/share/opencode/opencode.db` and optional `opencode.db-wal`
- Codex: `~/.config/Codex` and `~/.cache/Codex`

Source discovery is best-effort:

- missing sources do not crash the app
- each source is reported as `ready`, `partial`, `not_detected`, or `error`
- Codex stays dormant unless local runtime data is detected

## Snapshot and Cache

Snapshots are cached at:

`~/.local/share/agent-ledger/cache/snapshot.json`

The cached snapshot is reused when:

- discovered source fingerprints match
- pricing override fingerprint matches

Otherwise, Agent Ledger rebuilds the snapshot and writes a fresh cache file.

## Dashboard Model

The TUI shows:

- source health and warnings
- token totals and estimated costs
- session lists with filtering and sorting
- per-agent and per-model usage drivers
- always-on session context and token mix details for the selected session

## TUI Navigation

- `1..5` switch tabs
- `[` / `]` cycle tabs
- `t` cycle time window
- `s` cycle sort key
- `a` toggle sort order
- `j` / `k` or arrows move session selection
- `r` refresh from local sources
- `q` quit
