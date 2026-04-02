# Pricing in Agent Ledger

Agent Ledger estimates USD cost per message from token totals and a pricing catalog.

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

If no matching entry is found, usage still loads but estimated cost remains `null`.

## Local Pricing Overrides

You can override or extend pricing via:

`~/.config/agent-ledger/pricing.json`

Accepted formats:

- a JSON array of pricing entries
- an object with an `entries` array

Matching `provider` + `model` pairs override built-in entries.

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
