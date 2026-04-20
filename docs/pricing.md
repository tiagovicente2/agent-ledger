# Pricing in Agent Ledger

Agent Ledger resolves USD cost per message from two inputs:

- native source-reported cost when available
- token-based estimation from a pricing catalog

## Cost Resolution Modes

Agent Ledger supports three cost modes through service configuration:

- `auto` (default): prefer native source cost, fall back to catalog estimation
- `calculate`: ignore native cost and always estimate from tokens
- `display`: show only native source cost

You can use the snapshot generator with an explicit mode:

```sh
bun run snapshot -- --cost-mode auto
bun run snapshot -- --cost-mode calculate
bun run snapshot -- --cost-mode display
```

Programmatic callers can also pass `costMode` through `loadSnapshot()` config.

Session and summary costs carry status metadata:

- `exact`: all resolved cost came from the source
- `estimated`: all resolved cost was computed locally or mixed source/catalog without gaps
- `partial`: some cost was resolved, but some cost-bearing messages were missing pricing
- `missing`: no usable cost data was available

Zero-token synthetic/error rows do not force a session into `missing`.

## Built-in Catalog

The service ships with a built-in catalog for known models/providers (for example Anthropic, Google, OpenAI, and Zen/OpenRouter-style model names).

If a matching pricing entry is found, cost is estimated from:

- input tokens
- output tokens
- reasoning tokens
- cache read tokens
- cache write tokens

## Matching Strategy

Model matching is tolerant to common naming differences:

- routed names with provider prefixes (for example `openai/gpt-4.1`)
- variant suffixes (for example `:free`)
- punctuation variants (dot vs dash)
- provider inference by agent/model prefix, with fallback matching
- known aliases for evolving model names (for example Codex variants)
- zero-cost handling for known free routes such as `:free` and `-free`

If no matching entry is found, usage still loads. The session may still show a numeric partial cost if other messages in the same session were resolved.

## Local Pricing Overrides

You can override or extend pricing via:

`~/.config/agent-ledger/pricing.json`

Accepted formats:

- a JSON array of pricing entries
- an object with an `entries` array

Matching `provider` + `model` pairs override built-in entries.

This is also the recommended escape hatch for newly released models before Agent Ledger ships a built-in catalog update.

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
