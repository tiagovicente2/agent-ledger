import { basename } from 'node:path'

import type { TokenTotals, UsageMessageInput } from '../types'

type CodexJsonLine = Record<string, unknown>

type UsageKind = 'cumulative' | 'incremental'

interface ParsedUsage {
  totals: TokenTotals
  kind: UsageKind
}

interface CodexParserContext {
  sessionId: string
  fallbackProjectPath: string | null
  fallbackModel: string | null
  activeTurnId: string | null
  modelByTurnId: Map<string, string | null>
  projectPathByTurnId: Map<string, string | null>
  previousCumulativeTotals: TokenTotals | null
  messageIndex: number
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

function parseJsonLine(line: string): CodexJsonLine | null {
  try {
    const parsed = JSON.parse(line)
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function normalizeTotals(usage: Record<string, unknown>): TokenTotals {
  const inputTokens = toNumber(usage.input_tokens)
  const cachedInputTokens = toNumber(usage.cached_input_tokens)
  const outputTokens = toNumber(usage.output_tokens)
  const reasoningTokens = toNumber(usage.reasoning_output_tokens)

  const input = Math.max(0, inputTokens - cachedInputTokens)
  const output = Math.max(0, outputTokens - reasoningTokens)
  const reasoning = reasoningTokens
  const cacheRead = cachedInputTokens
  const cacheWrite = 0
  const derivedTotal = input + output + reasoning + cacheRead + cacheWrite

  return {
    input,
    output,
    reasoning,
    cacheRead,
    cacheWrite,
    total: toNumber(usage.total_tokens) || derivedTotal,
  }
}

function subtractTotals(current: TokenTotals, previous: TokenTotals): TokenTotals {
  const input = Math.max(0, current.input - previous.input)
  const output = Math.max(0, current.output - previous.output)
  const reasoning = Math.max(0, current.reasoning - previous.reasoning)
  const cacheRead = Math.max(0, current.cacheRead - previous.cacheRead)
  const cacheWrite = Math.max(0, current.cacheWrite - previous.cacheWrite)
  const derivedTotal = input + output + reasoning + cacheRead + cacheWrite
  const total = Math.max(0, current.total - previous.total) || derivedTotal

  return {
    input,
    output,
    reasoning,
    cacheRead,
    cacheWrite,
    total,
  }
}

function parseUsage(payload: Record<string, unknown>): ParsedUsage | null {
  const info = isRecord(payload.info) ? payload.info : null

  if (!info) {
    return null
  }

  if (isRecord(info.total_token_usage)) {
    return {
      totals: normalizeTotals(info.total_token_usage),
      kind: 'cumulative',
    }
  }

  if (isRecord(info.last_token_usage)) {
    return {
      totals: normalizeTotals(info.last_token_usage),
      kind: 'incremental',
    }
  }

  return null
}

export function parseCodexSession(content: string, rawRef: string): UsageMessageInput[] {
  const fallbackSessionId = basename(rawRef, '.jsonl')
  const context: CodexParserContext = {
    sessionId: fallbackSessionId,
    fallbackProjectPath: null,
    fallbackModel: null,
    activeTurnId: null,
    modelByTurnId: new Map(),
    projectPathByTurnId: new Map(),
    previousCumulativeTotals: null,
    messageIndex: 0,
  }

  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(parseJsonLine)
    .flatMap((row) => {
      if (!row) {
        return []
      }

      const timestamp = toIsoTimestamp(row.timestamp) ?? new Date(0).toISOString()
      const type = toStringOrNull(row.type)
      const payload = isRecord(row.payload) ? row.payload : null

      if (type === 'session_meta' && payload) {
        context.sessionId = toStringOrNull(payload.id) ?? context.sessionId
        context.fallbackProjectPath =
          toStringOrNull(payload.cwd) ??
          toStringOrNull(payload.projectPath) ??
          toStringOrNull(payload.project_path)
        context.fallbackModel = toStringOrNull(payload.model) ?? context.fallbackModel
        return []
      }

      if (type === 'turn_context' && payload) {
        const turnId = toStringOrNull(payload.turn_id)

        if (!turnId) {
          return []
        }

        context.modelByTurnId.set(turnId, toStringOrNull(payload.model) ?? context.fallbackModel)
        context.projectPathByTurnId.set(
          turnId,
          toStringOrNull(payload.cwd) ??
            toStringOrNull(payload.projectPath) ??
            toStringOrNull(payload.project_path) ??
            context.fallbackProjectPath,
        )
        return []
      }

      if (type !== 'event_msg' || !payload) {
        return []
      }

      const eventType = toStringOrNull(payload.type)

      if (eventType === 'task_started') {
        const turnId = toStringOrNull(payload.turn_id)
        context.activeTurnId = turnId

        if (!turnId) {
          return []
        }

        context.modelByTurnId.set(turnId, toStringOrNull(payload.model) ?? context.fallbackModel)
        context.projectPathByTurnId.set(
          turnId,
          toStringOrNull(payload.cwd) ??
            toStringOrNull(payload.projectPath) ??
            toStringOrNull(payload.project_path) ??
            context.fallbackProjectPath,
        )
        return []
      }

      if (eventType === 'task_complete') {
        context.activeTurnId = null
        return []
      }

      if (eventType !== 'token_count') {
        return []
      }

      const usage = parseUsage(payload)

      if (!usage) {
        return []
      }

      let delta = usage.totals

      if (usage.kind === 'cumulative') {
        if (context.previousCumulativeTotals) {
          const appearsReset = usage.totals.total < context.previousCumulativeTotals.total
          delta = appearsReset ? usage.totals : subtractTotals(usage.totals, context.previousCumulativeTotals)
        }

        context.previousCumulativeTotals = usage.totals
      } else {
        context.previousCumulativeTotals = null
      }

      if (delta.total <= 0) {
        return []
      }

      const turnId = context.activeTurnId
      const model = turnId
        ? (context.modelByTurnId.get(turnId) ?? context.fallbackModel)
        : context.fallbackModel
      const projectPath = turnId
        ? (context.projectPathByTurnId.get(turnId) ?? context.fallbackProjectPath)
        : context.fallbackProjectPath
      const id = `${context.sessionId}:${context.messageIndex}`
      context.messageIndex += 1

      return [
        {
          id,
          sessionId: context.sessionId,
          agent: 'codex',
          model,
          projectPath,
          timestamp,
          role: 'assistant',
          tokens: delta,
          rawRef,
        },
      ]
    })
}
