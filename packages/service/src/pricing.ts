import { readFile } from 'node:fs/promises'

import type { PricingEntry, TokenTotals } from './types'

export interface CostEstimate {
  currency: 'USD'
  amount: number
  usd: number
}

const BUILTIN_PRICING_CATALOG: PricingEntry[] = [
  {
    provider: 'anthropic',
    model: 'claude-3-5-haiku-latest',
    currency: 'USD',
    inputPerMillion: 0.8,
    outputPerMillion: 4,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0.08,
    cacheWritePerMillion: 1,
    source: 'builtin',
  },
  {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-latest',
    currency: 'USD',
    inputPerMillion: 3,
    outputPerMillion: 15,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0.3,
    cacheWritePerMillion: 3.75,
    source: 'builtin',
  },
  {
    provider: 'anthropic',
    model: 'claude-3-7-sonnet-latest',
    currency: 'USD',
    inputPerMillion: 3,
    outputPerMillion: 15,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0.3,
    cacheWritePerMillion: 3.75,
    source: 'builtin',
  },
  {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    currency: 'USD',
    inputPerMillion: 3,
    outputPerMillion: 15,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0.3,
    cacheWritePerMillion: 3.75,
    source: 'builtin',
  },
  {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    currency: 'USD',
    inputPerMillion: 3,
    outputPerMillion: 15,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0.3,
    cacheWritePerMillion: 3.75,
    source: 'builtin',
  },
  {
    provider: 'anthropic',
    model: 'claude-opus-4-20250514',
    currency: 'USD',
    inputPerMillion: 15,
    outputPerMillion: 75,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 1.5,
    cacheWritePerMillion: 18.75,
    source: 'builtin',
  },
  {
    provider: 'anthropic',
    model: 'claude-opus-4-6',
    currency: 'USD',
    inputPerMillion: 5,
    outputPerMillion: 25,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0.5,
    cacheWritePerMillion: 6.25,
    source: 'builtin',
  },
  {
    provider: 'anthropic',
    model: 'claude-haiku-4-5',
    currency: 'USD',
    inputPerMillion: 1,
    outputPerMillion: 5,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0.1,
    cacheWritePerMillion: 1.25,
    source: 'builtin',
  },
  {
    provider: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    currency: 'USD',
    inputPerMillion: 1,
    outputPerMillion: 5,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0.1,
    cacheWritePerMillion: 1.25,
    source: 'builtin',
  },
  {
    provider: 'google',
    model: 'gemini-2.0-flash',
    currency: 'USD',
    inputPerMillion: 0.1,
    outputPerMillion: 0.4,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0.025,
    cacheWritePerMillion: 0,
    source: 'builtin',
  },
  {
    provider: 'google',
    model: 'gemini-2.5-flash',
    currency: 'USD',
    inputPerMillion: 0.3,
    outputPerMillion: 2.5,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0.075,
    cacheWritePerMillion: 0,
    source: 'builtin',
  },
  {
    provider: 'google',
    model: 'gemini-2.5-pro',
    currency: 'USD',
    inputPerMillion: 1.25,
    outputPerMillion: 10,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0.3125,
    cacheWritePerMillion: 0,
    source: 'builtin',
  },
  {
    provider: 'google',
    model: 'gemini-3-flash-preview',
    currency: 'USD',
    inputPerMillion: 0.5,
    outputPerMillion: 3,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0.05,
    cacheWritePerMillion: 0,
    source: 'builtin',
  },
  {
    provider: 'google',
    model: 'gemini-3-pro-preview',
    currency: 'USD',
    inputPerMillion: 2,
    outputPerMillion: 12,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0.2,
    cacheWritePerMillion: 0,
    source: 'builtin',
  },
  {
    provider: 'google',
    model: 'gemini-3.1-pro-preview',
    currency: 'USD',
    inputPerMillion: 2,
    outputPerMillion: 12,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0.2,
    cacheWritePerMillion: 0,
    source: 'builtin',
  },
  {
    provider: 'openai',
    model: 'gpt-4.1',
    currency: 'USD',
    inputPerMillion: 2,
    outputPerMillion: 8,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0.5,
    cacheWritePerMillion: 0,
    source: 'builtin',
  },
  {
    provider: 'openai',
    model: 'gpt-4.1-mini',
    currency: 'USD',
    inputPerMillion: 0.4,
    outputPerMillion: 1.6,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0.1,
    cacheWritePerMillion: 0,
    source: 'builtin',
  },
  {
    provider: 'openai',
    model: 'o3',
    currency: 'USD',
    inputPerMillion: 10,
    outputPerMillion: 40,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 2.5,
    cacheWritePerMillion: 0,
    source: 'builtin',
  },
  {
    provider: 'openai',
    model: 'o4-mini',
    currency: 'USD',
    inputPerMillion: 1.1,
    outputPerMillion: 4.4,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0.275,
    cacheWritePerMillion: 0,
    source: 'builtin',
  },
  {
    provider: 'openai',
    model: 'gpt-5.3-codex',
    currency: 'USD',
    inputPerMillion: 1.75,
    outputPerMillion: 14,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0.175,
    cacheWritePerMillion: 0,
    source: 'builtin',
  },
  {
    provider: 'openai',
    model: 'gpt-5.3-codex-spark',
    currency: 'USD',
    inputPerMillion: 1.75,
    outputPerMillion: 14,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0.175,
    cacheWritePerMillion: 0,
    source: 'builtin',
  },
  {
    provider: 'openai',
    model: 'gpt-5.4',
    currency: 'USD',
    inputPerMillion: 2.5,
    outputPerMillion: 15,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0.25,
    cacheWritePerMillion: 0,
    source: 'builtin',
  },
  {
    provider: 'zen',
    model: 'big-pickle',
    currency: 'USD',
    inputPerMillion: 0,
    outputPerMillion: 0,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0,
    cacheWritePerMillion: 0,
    source: 'builtin',
  },
  {
    provider: 'zen',
    model: 'minimax-m2.5-free',
    currency: 'USD',
    inputPerMillion: 0,
    outputPerMillion: 0,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0,
    cacheWritePerMillion: 0,
    source: 'builtin',
  },
  {
    provider: 'zen',
    model: 'minimax-m2.5',
    currency: 'USD',
    inputPerMillion: 0.3,
    outputPerMillion: 1.2,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0.06,
    cacheWritePerMillion: 0.375,
    source: 'builtin',
  },
  {
    provider: 'zen',
    model: 'qwen3.6-plus-free',
    currency: 'USD',
    inputPerMillion: 0,
    outputPerMillion: 0,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0,
    cacheWritePerMillion: 0,
    source: 'builtin',
  },
  {
    provider: 'zen',
    model: 'kimi-k2.5',
    currency: 'USD',
    inputPerMillion: 0.6,
    outputPerMillion: 3,
    reasoningPerMillion: 0,
    cacheReadPerMillion: 0.1,
    cacheWritePerMillion: 0,
    source: 'builtin',
  },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPricingEntry(value: unknown): value is PricingEntry {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.provider === 'string' &&
    typeof value.model === 'string' &&
    value.currency === 'USD' &&
    typeof value.inputPerMillion === 'number' &&
    typeof value.outputPerMillion === 'number' &&
    typeof value.reasoningPerMillion === 'number' &&
    typeof value.cacheReadPerMillion === 'number' &&
    typeof value.cacheWritePerMillion === 'number' &&
    (value.source === 'builtin' || value.source === 'local_override')
  )
}

function getPricingKey(entry: Pick<PricingEntry, 'provider' | 'model'>): string {
  return `${entry.provider}:${entry.model}`.toLowerCase()
}

export function mergePricingCatalog(
  builtin: PricingEntry[],
  overrides: PricingEntry[],
): PricingEntry[] {
  const byKey = new Map<string, PricingEntry>()

  for (const entry of builtin) {
    byKey.set(getPricingKey(entry), entry)
  }

  for (const entry of overrides) {
    byKey.set(getPricingKey(entry), entry)
  }

  return [...byKey.values()]
}

export function getBuiltinPricingCatalog(): PricingEntry[] {
  return BUILTIN_PRICING_CATALOG.map((entry) => ({ ...entry }))
}

export async function loadPricingOverrides(path: string): Promise<PricingEntry[]> {
  try {
    const raw = await readFile(path, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    const entries = Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed.entries)
        ? parsed.entries
        : []

    return entries.filter(isPricingEntry).map((entry) => ({
      ...entry,
      source: 'local_override',
    }))
  } catch {
    return []
  }
}

export async function loadPricingCatalog(overridePath: string): Promise<PricingEntry[]> {
  return mergePricingCatalog(getBuiltinPricingCatalog(), await loadPricingOverrides(overridePath))
}

export function estimateCost(tokens: TokenTotals, pricing: PricingEntry): CostEstimate {
  const amount =
    (tokens.input / 1_000_000) * pricing.inputPerMillion +
    (tokens.output / 1_000_000) * pricing.outputPerMillion +
    (tokens.reasoning / 1_000_000) * pricing.reasoningPerMillion +
    (tokens.cacheRead / 1_000_000) * pricing.cacheReadPerMillion +
    (tokens.cacheWrite / 1_000_000) * pricing.cacheWritePerMillion

  return {
    currency: pricing.currency,
    amount,
    usd: amount,
  }
}
