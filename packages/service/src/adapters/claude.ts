import { basename } from 'node:path'

import type { MessageRole, TokenTotals, UsageMessageInput } from '../types'

type ClaudeJsonLine = Record<string, unknown>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function toRole(value: unknown): MessageRole {
  return value === 'system' || value === 'user' || value === 'assistant' || value === 'tool'
    ? value
    : 'unknown'
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

function normalizeTotals(usage: Record<string, unknown>): TokenTotals {
  const input = toNumber(usage.input_tokens)
  const output = toNumber(usage.output_tokens)
  const reasoning = toNumber(usage.reasoning_tokens)
  const cacheRead = toNumber(usage.cache_read_input_tokens)
  const cacheWrite = toNumber(usage.cache_creation_input_tokens)
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

function parseJsonLine(line: string): ClaudeJsonLine | null {
  try {
    const parsed = JSON.parse(line)
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function getClaudeUsage(row: ClaudeJsonLine): Record<string, unknown> | null {
  const message = isRecord(row.message) ? row.message : null

  if (message && isRecord(message.usage)) {
    return message.usage
  }

  return isRecord(row.usage) ? row.usage : null
}

export function parseClaudeSession(content: string, rawRef: string): UsageMessageInput[] {
  const fallbackSessionId = basename(rawRef, '.jsonl')

  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(parseJsonLine)
    .flatMap((row, index) => {
      if (!row) {
        return []
      }

      const message = isRecord(row.message) ? row.message : null
      const usage = getClaudeUsage(row)

      if (!usage) {
        return []
      }

      const sessionId =
        toStringOrNull(row.sessionId) ??
        toStringOrNull(row.session_id) ??
        toStringOrNull(row.conversationId) ??
        toStringOrNull(row.conversation_id) ??
        fallbackSessionId

      const id =
        toStringOrNull(row.uuid) ??
        toStringOrNull(row.messageId) ??
        toStringOrNull(message?.id) ??
        `${sessionId}:${index}`

      const timestamp =
        toIsoTimestamp(row.timestamp) ??
        toIsoTimestamp(row.created_at) ??
        toIsoTimestamp(message?.created_at) ??
        new Date(0).toISOString()

      return [
        {
          id,
          sessionId,
          agent: 'claude',
          model: toStringOrNull(message?.model) ?? toStringOrNull(row.model),
          projectPath:
            toStringOrNull(row.cwd) ??
            toStringOrNull(row.projectPath) ??
            toStringOrNull(row.project_path),
          timestamp,
          role: toRole(message?.role ?? row.role ?? row.type),
          tokens: normalizeTotals(usage),
          sourceCostUsd: null,
          rawRef,
        },
      ]
    })
}
