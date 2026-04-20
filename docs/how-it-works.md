# How Agent Ledger Works

Agent Ledger reads local usage artifacts from coding assistants, normalizes message-level data, and renders a unified OpenTUI dashboard.

## Runtime Flow

1. discover local data sources
2. load and parse source-specific records
3. preserve native source cost when a source provides it
4. normalize records into a shared usage model and estimate fallback cost when pricing is available
5. aggregate messages into sessions and totals with exact / estimated / partial / missing cost status
6. cache the resulting snapshot
7. render the dashboard from the snapshot

## Data Sources

Default paths:

- Claude Code: `~/.claude/projects/**/*.jsonl`
- Gemini: `~/.gemini/tmp/**/chats/session-*.json`
- OpenCode:
  Linux: `~/.local/share/opencode/opencode.db`
  macOS: `~/Library/Application Support/opencode/opencode.db`
- Codex:
  Linux: `~/.codex`, `~/.config/Codex`, `~/.cache/Codex`
  macOS: `~/.codex`, `~/.config/Codex`, `~/Library/Caches/Codex`
- pi: `~/.pi/agent/sessions/**/*.jsonl`

Source discovery is best-effort:

- missing sources do not crash the app
- each source is reported as `ready`, `partial`, `not_detected`, or `error`

## Snapshot and Cache

Snapshots are cached at:

`~/.local/share/agent-ledger/cache/snapshot.json`

The cached snapshot is reused when:

- discovered source fingerprints match
- pricing override fingerprint matches
- configured cost mode matches

Otherwise, Agent Ledger rebuilds the snapshot and writes a fresh cache file.

## Dashboard Model

The TUI shows:

- source health and warnings
- token totals and resolved costs
- session lists with filtering and sorting
- per-agent and per-model usage drivers
- always-on session context, token mix, and cost quality details for the selected session
