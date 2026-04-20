import { basename, dirname } from 'node:path'

import type { MessageRole, TokenTotals, UsageMessageInput } from '../types'

type GeminiRecord = Record<string, unknown>

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
  if (value === 'assistant' || value === 'user' || value === 'system' || value === 'tool') {
    return value
  }

  if (value === 'gemini') {
    return 'assistant'
  }

  return 'unknown'
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

function normalizeTotals(message: GeminiRecord): TokenTotals {
  const usageMetadata = isRecord(message.usageMetadata) ? message.usageMetadata : null
  const tokens = isRecord(message.tokens) ? message.tokens : null

  const input = toNumber(usageMetadata?.promptTokenCount) || toNumber(tokens?.input)
  const output = toNumber(usageMetadata?.candidatesTokenCount) || toNumber(tokens?.output)
  const reasoning = toNumber(usageMetadata?.thoughtsTokenCount) || toNumber(tokens?.thoughts)
  const cacheRead = toNumber(usageMetadata?.cachedContentTokenCount) || toNumber(tokens?.cached)
  const cacheWrite = 0
  const derivedTotal = input + output + reasoning + cacheRead + cacheWrite

  return {
    input,
    output,
    reasoning,
    cacheRead,
    cacheWrite,
    total: toNumber(usageMetadata?.totalTokenCount) || toNumber(tokens?.total) || derivedTotal,
  }
}

function hasUsage(message: GeminiRecord): boolean {
  return isRecord(message.usageMetadata) || isRecord(message.tokens)
}

function inferProjectPath(payload: GeminiRecord, rawRef: string): string | null {
  return (
    toStringOrNull(payload.cwd) ??
    toStringOrNull(payload.projectPath) ??
    toStringOrNull(payload.workspaceRoot) ??
    toStringOrNull(payload.workspace) ??
    dirname(dirname(rawRef))
  )
}

export function parseGeminiSession(payload: unknown, rawRef: string): UsageMessageInput[] {
  if (!isRecord(payload)) {
    return []
  }

  const messages = Array.isArray(payload.messages)
    ? payload.messages
    : Array.isArray(payload.events)
      ? payload.events
      : []

  const sessionId =
    toStringOrNull(payload.sessionId) ?? toStringOrNull(payload.id) ?? basename(rawRef, '.json')

  const projectPath = inferProjectPath(payload, rawRef)

  return messages.flatMap((entry, index) => {
    if (!isRecord(entry) || !hasUsage(entry)) {
      return []
    }

    const id = toStringOrNull(entry.id) ?? `${sessionId}:${index}`
    const timestamp =
      toIsoTimestamp(entry.timestamp) ??
      toIsoTimestamp(payload.lastUpdated) ??
      toIsoTimestamp(payload.updatedAt) ??
      toIsoTimestamp(payload.startTime) ??
      new Date(0).toISOString()

    return [
      {
        id,
        sessionId,
        agent: 'gemini',
        model: toStringOrNull(entry.model) ?? toStringOrNull(payload.model),
        projectPath,
        timestamp,
        role: toRole(entry.role ?? entry.type),
        tokens: normalizeTotals(entry),
        sourceCostUsd: null,
        rawRef,
      },
    ]
  })
}
