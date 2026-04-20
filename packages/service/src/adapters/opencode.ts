import type { UsageMessageInput } from '../types'

export interface OpenCodeQueryResultRow {
  id?: string | null
  session_id?: string | null
  data: string
}

export interface OpenCodeQueryable {
  query(sql: string): {
    all(...params: unknown[]): OpenCodeQueryResultRow[]
  }
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

function parseData(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value)
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function loadOpenCodeMessages(
  database: OpenCodeQueryable,
  rawRef = 'opencode.db',
): UsageMessageInput[] {
  const rows = database
    .query(
      "select id, session_id, data from message where json_extract(data, '$.role') = 'assistant'",
    )
    .all()

  return rows.flatMap((row, index) => {
    const data = parseData(row.data)

    if (!data) {
      return []
    }

    const tokens = isRecord(data.tokens) ? data.tokens : null
    const cache = tokens && isRecord(tokens.cache) ? tokens.cache : null
    const time = isRecord(data.time) ? data.time : null
    const path = isRecord(data.path) ? data.path : null

    const sessionId =
      toStringOrNull(row.session_id) ?? toStringOrNull(data.sessionID) ?? `opencode:${index}`

    return [
      {
        id: toStringOrNull(row.id) ?? toStringOrNull(data.id) ?? `${sessionId}:${index}`,
        sessionId,
        agent: 'opencode',
        model: toStringOrNull(data.modelID),
        projectPath: toStringOrNull(path?.cwd),
        timestamp:
          toIsoTimestamp(time?.completed) ??
          toIsoTimestamp(time?.created) ??
          new Date(0).toISOString(),
        role: 'assistant',
        sourceCostUsd: toNumber(data.cost) > 0 ? toNumber(data.cost) : null,
        tokens: {
          input: toNumber(tokens?.input),
          output: toNumber(tokens?.output),
          reasoning: toNumber(tokens?.reasoning),
          cacheRead: toNumber(cache?.read),
          cacheWrite: toNumber(cache?.write),
          total:
            toNumber(tokens?.total) ||
            toNumber(tokens?.input) +
              toNumber(tokens?.output) +
              toNumber(tokens?.reasoning) +
              toNumber(cache?.read) +
              toNumber(cache?.write),
        },
        rawRef,
      },
    ]
  })
}
