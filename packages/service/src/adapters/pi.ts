import { basename } from 'node:path'

import type { TokenTotals, UsageMessageInput } from '../types'

type PiJsonLine = Record<string, unknown>

interface PiParserContext {
  sessionId: string
  projectPath: string | null
  fallbackModel: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function toIsoTimestamp(value: unknown): string | null {
  if (typeof value === 'string') {
    const timestamp = Date.parse(value)
    return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString()
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const millis = value > 1_000_000_000_000 ? value : value * 1000
    return new Date(millis).toISOString()
  }

  return null
}

function parseJsonLine(line: string): PiJsonLine | null {
  try {
    const parsed = JSON.parse(line)
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function normalizeTotals(usage: Record<string, unknown>): TokenTotals {
  const input = toNumber(usage.input)
  const output = toNumber(usage.output)
  const reasoning = toNumber(usage.reasoning)
  const cacheRead = toNumber(usage.cacheRead)
  const cacheWrite = toNumber(usage.cacheWrite)
  const derivedTotal = input + output + reasoning + cacheRead + cacheWrite

  return {
    input,
    output,
    reasoning,
    cacheRead,
    cacheWrite,
    total: toNumber(usage.totalTokens) || derivedTotal,
  }
}

export function parsePiSession(content: string, rawRef: string): UsageMessageInput[] {
  const fallbackSessionId = basename(rawRef, '.jsonl')
  const context: PiParserContext = {
    sessionId: fallbackSessionId,
    projectPath: null,
    fallbackModel: null,
  }

  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(parseJsonLine)
    .flatMap((row, index) => {
      if (!row) {
        return []
      }

      const type = toStringOrNull(row.type)

      if (type === 'session') {
        context.sessionId = toStringOrNull(row.id) ?? context.sessionId
        context.projectPath = toStringOrNull(row.cwd) ?? context.projectPath
        return []
      }

      if (type === 'model_change') {
        context.fallbackModel = toStringOrNull(row.modelId) ?? context.fallbackModel
        return []
      }

      if (type !== 'message') {
        return []
      }

      const message = isRecord(row.message) ? row.message : null
      const usage = isRecord(message?.usage) ? message.usage : null

      if (!message || message.role !== 'assistant' || !usage) {
        return []
      }

      const id = toStringOrNull(row.id) ?? `${context.sessionId}:${index}`
      const timestamp =
        toIsoTimestamp(row.timestamp) ??
        toIsoTimestamp(message.timestamp) ??
        new Date(0).toISOString()

      return [
        {
          id,
          sessionId: context.sessionId,
          agent: 'pi',
          model: toStringOrNull(message.model) ?? context.fallbackModel,
          projectPath: context.projectPath,
          timestamp,
          role: 'assistant',
          tokens: normalizeTotals(usage),
          rawRef,
        },
      ]
    })
}
