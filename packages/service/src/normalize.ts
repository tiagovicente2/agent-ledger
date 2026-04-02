import { estimateCost } from './pricing'
import type { AgentName, PricingEntry, UsageMessage, UsageMessageInput } from './types'

function normalizeModel(model: string): string {
  return model.trim().toLowerCase()
}

function inferProvider(agent: AgentName, model: string): string | null {
  const normalizedModel = normalizeModel(model)

  if (agent === 'claude' || normalizedModel.startsWith('claude')) {
    return 'anthropic'
  }

  if (agent === 'gemini' || normalizedModel.startsWith('gemini')) {
    return 'google'
  }

  if (
    normalizedModel.startsWith('gpt') ||
    normalizedModel.startsWith('o1') ||
    normalizedModel.startsWith('o3') ||
    normalizedModel.startsWith('o4')
  ) {
    return 'openai'
  }

  return null
}

function getPricingCandidates(model: string): string[] {
  const normalizedModel = normalizeModel(model)
  const candidates = new Set<string>([normalizedModel])

  if (normalizedModel.endsWith('-latest')) {
    candidates.add(normalizedModel.slice(0, -'-latest'.length))
  }

  return [...candidates]
}

function findPricingEntry(
  message: Pick<UsageMessageInput, 'agent' | 'model'>,
  catalog: PricingEntry[],
): PricingEntry | null {
  if (!message.model) {
    return null
  }

  const provider = inferProvider(message.agent, message.model)

  if (!provider) {
    return null
  }

  const candidates = new Set(
    getPricingCandidates(message.model).map((candidate) => `${provider}:${candidate}`),
  )

  for (const entry of catalog) {
    const key = `${entry.provider.toLowerCase()}:${normalizeModel(entry.model)}`

    if (candidates.has(key)) {
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
        costEstimateUsd: pricing ? estimateCost(input.tokens, pricing).usd : null,
      }
    })
}
