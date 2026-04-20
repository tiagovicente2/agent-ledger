import { estimateCost } from './pricing'
import type { AgentName, PricingEntry, UsageMessage, UsageMessageInput } from './types'

const ZERO_COST_PRICING_ENTRY: PricingEntry = {
  provider: 'free',
  model: 'free',
  currency: 'USD',
  inputPerMillion: 0,
  outputPerMillion: 0,
  reasoningPerMillion: 0,
  cacheReadPerMillion: 0,
  cacheWritePerMillion: 0,
  source: 'builtin',
}

const MODEL_ALIASES = new Map<string, string>([
  ['gpt-5-codex', 'gpt-5.3-codex'],
  ['gpt-5.1-codex', 'gpt-5.3-codex'],
  ['gpt-5.1-codex-mini', 'gpt-5.3-codex-spark'],
])

function normalizeModel(model: string): string {
  return model.trim().toLowerCase()
}

function stripRoutePrefix(model: string): string {
  const normalizedModel = normalizeModel(model)

  return normalizedModel.includes('/')
    ? (normalizedModel.split('/').at(-1) ?? normalizedModel)
    : normalizedModel
}

function stripVariantSuffix(model: string): string {
  const normalizedModel = normalizeModel(model)
  const suffixIndex = normalizedModel.indexOf(':')

  return suffixIndex >= 0 ? normalizedModel.slice(0, suffixIndex) : normalizedModel
}

function stripKnownSuffixes(model: string): string[] {
  const normalizedModel = normalizeModel(model)
  const candidates = new Set<string>([normalizedModel])

  if (normalizedModel.endsWith('-thinking')) {
    candidates.add(normalizedModel.slice(0, -'-thinking'.length))
  }

  return [...candidates].filter(Boolean)
}

function resolveModelAlias(model: string): string {
  return MODEL_ALIASES.get(normalizeModel(model)) ?? normalizeModel(model)
}

function isKnownFreeModel(model: string): boolean {
  const normalizedModel = normalizeModel(model)
  const routedModel = stripRoutePrefix(normalizedModel)

  return (
    normalizedModel === 'openrouter/free' ||
    normalizedModel.endsWith(':free') ||
    normalizedModel.endsWith('-free') ||
    routedModel.endsWith(':free') ||
    routedModel.endsWith('-free')
  )
}

function inferProvider(agent: AgentName, model: string): string | null {
  const normalizedModel = normalizeModel(model)
  const routedModel = stripRoutePrefix(model)

  if (
    agent === 'claude' ||
    normalizedModel.startsWith('anthropic/') ||
    normalizedModel.startsWith('claude') ||
    routedModel.startsWith('claude')
  ) {
    return 'anthropic'
  }

  if (
    agent === 'gemini' ||
    normalizedModel.startsWith('google/') ||
    normalizedModel.startsWith('gemini') ||
    routedModel.startsWith('gemini')
  ) {
    return 'google'
  }

  if (
    normalizedModel.startsWith('openai/') ||
    normalizedModel.startsWith('gpt') ||
    normalizedModel.startsWith('o1') ||
    normalizedModel.startsWith('o3') ||
    normalizedModel.startsWith('o4') ||
    routedModel.startsWith('gpt') ||
    routedModel.startsWith('o1') ||
    routedModel.startsWith('o3') ||
    routedModel.startsWith('o4')
  ) {
    return 'openai'
  }

  return null
}

function getPricingCandidates(model: string): string[] {
  const normalizedModel = resolveModelAlias(model)
  const candidates = new Set<string>([normalizedModel])
  const routedModel = stripRoutePrefix(normalizedModel)
  const routeAndVariantStrippedModel = stripVariantSuffix(routedModel)

  for (const candidate of [normalizedModel, routedModel, routeAndVariantStrippedModel]) {
    for (const strippedCandidate of stripKnownSuffixes(candidate)) {
      candidates.add(strippedCandidate)
      candidates.add(strippedCandidate.replaceAll('.', '-'))
    }
  }

  if (normalizedModel.endsWith('-latest')) {
    candidates.add(normalizedModel.slice(0, -'-latest'.length))
  }

  if (routedModel.endsWith('-latest')) {
    candidates.add(routedModel.slice(0, -'-latest'.length))
  }

  if (routeAndVariantStrippedModel.includes('kimi-k2p5')) {
    candidates.add('kimi-k2.5')
    candidates.add('kimi-k2-5')
  }

  return [...candidates].filter(Boolean)
}

function findPricingEntry(
  message: Pick<UsageMessageInput, 'agent' | 'model'>,
  catalog: PricingEntry[],
): PricingEntry | null {
  if (!message.model) {
    return null
  }

  if (isKnownFreeModel(message.model)) {
    return {
      ...ZERO_COST_PRICING_ENTRY,
      model: normalizeModel(message.model),
    }
  }

  const provider = inferProvider(message.agent, message.model)

  if (provider) {
    const candidates = new Set(
      getPricingCandidates(message.model).map((candidate) => `${provider}:${candidate}`),
    )

    for (const entry of catalog) {
      const key = `${entry.provider.toLowerCase()}:${normalizeModel(entry.model)}`

      if (candidates.has(key)) {
        return entry
      }
    }
  }

  const fallbackCandidates = new Set(getPricingCandidates(message.model))

  for (const entry of catalog) {
    if (getPricingCandidates(entry.model).some((candidate) => fallbackCandidates.has(candidate))) {
      return entry
    }
  }

  return null
}

export function normalizeMessages(
  inputs: UsageMessageInput[],
  pricingCatalog: PricingEntry[],
): UsageMessage[] {
  return [...inputs]
    .sort((left, right) => {
      const timestampOrder = left.timestamp.localeCompare(right.timestamp)

      if (timestampOrder !== 0) {
        return timestampOrder
      }

      return left.id.localeCompare(right.id)
    })
    .map((input) => {
      const pricing = findPricingEntry(input, pricingCatalog)

      return {
        ...input,
        catalogCostUsd: pricing ? estimateCost(input.tokens, pricing).usd : null,
      }
    })
}
