import { basename } from 'node:path'

import type {
  SourceState,
  SummarySnapshot,
  SummaryTotals,
  TokenTotals,
  UsageMessage,
  UsageSession,
} from './types'

function createEmptyTotals(): TokenTotals {
  return {
    input: 0,
    output: 0,
    reasoning: 0,
    cacheRead: 0,
    cacheWrite: 0,
    total: 0,
  }
}

function addTotals(left: TokenTotals, right: TokenTotals): TokenTotals {
  return {
    input: left.input + right.input,
    output: left.output + right.output,
    reasoning: left.reasoning + right.reasoning,
    cacheRead: left.cacheRead + right.cacheRead,
    cacheWrite: left.cacheWrite + right.cacheWrite,
    total: left.total + right.total,
  }
}

function summarizeCosts(messages: UsageMessage[]): number | null {
  if (messages.some((message) => message.costEstimateUsd === null)) {
    return null
  }

  return messages.reduce((total, message) => total + (message.costEstimateUsd ?? 0), 0)
}

function inferSessionId(message: UsageMessage): string | null {
  if (message.agent === 'opencode' && message.sessionId.startsWith('opencode:')) {
    return 'OpenCode session id was missing, so the session was synthesized during normalization'
  }

  if (message.agent === 'claude' && message.sessionId === basename(message.rawRef, '.jsonl')) {
    return 'Claude session id was missing, so the session was derived from the source filename'
  }

  if (message.agent === 'gemini' && message.sessionId === basename(message.rawRef, '.json')) {
    return 'Gemini session id was missing, so the session was derived from the source filename'
  }

  return null
}

function summarizeProjectPath(messages: UsageMessage[]): {
  confidence: 'exact' | 'inferred'
  inferenceReason: string | null
  projectPath: string | null
} {
  const counts = new Map<string, number>()

  for (const message of messages) {
    if (!message.projectPath) {
      continue
    }

    counts.set(message.projectPath, (counts.get(message.projectPath) ?? 0) + 1)
  }

  const ranked = [...counts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1]
    }

    return left[0].localeCompare(right[0])
  })

  if (ranked.length === 0) {
    return {
      confidence: 'exact',
      inferenceReason: null,
      projectPath: null,
    }
  }

  if (ranked.length === 1) {
    return {
      confidence: 'exact',
      inferenceReason: null,
      projectPath: ranked[0][0],
    }
  }

  return {
    confidence: 'inferred',
    inferenceReason:
      'Messages referenced multiple project paths, so the most common path was selected',
    projectPath: ranked[0][0],
  }
}

export function aggregateSessions(messages: UsageMessage[]): UsageSession[] {
  const groups = new Map<string, UsageMessage[]>()

  for (const message of messages) {
    const groupKey = `${message.agent}:${message.sessionId}`
    const group = groups.get(groupKey)

    if (group) {
      group.push(message)
      continue
    }

    groups.set(groupKey, [message])
  }

  return [...groups.entries()]
    .map(([groupKey, groupMessages]) => {
      const sortedMessages = [...groupMessages].sort((left, right) => {
        const timestampOrder = left.timestamp.localeCompare(right.timestamp)

        if (timestampOrder !== 0) {
          return timestampOrder
        }

        return left.id.localeCompare(right.id)
      })

      const sessionIdReasons = new Set(
        sortedMessages.map(inferSessionId).filter((reason): reason is string => reason !== null),
      )
      const projectSummary = summarizeProjectPath(sortedMessages)
      const inferenceReasons = [
        ...sessionIdReasons,
        ...(projectSummary.inferenceReason ? [projectSummary.inferenceReason] : []),
      ]
      const modelsUsed = [
        ...new Set(
          sortedMessages
            .map((message) => message.model)
            .filter((model): model is string => typeof model === 'string'),
        ),
      ]
      const tokenTotals = sortedMessages.reduce(
        (totals, message) => addTotals(totals, message.tokens),
        createEmptyTotals(),
      )
      const [firstMessage, lastMessage] = [
        sortedMessages[0],
        sortedMessages.at(-1) ?? sortedMessages[0],
      ]

      return {
        id: groupKey,
        agent: firstMessage.agent,
        nativeSessionId: sessionIdReasons.size === 0 ? firstMessage.sessionId : null,
        projectPath: projectSummary.projectPath,
        startedAt: firstMessage.timestamp,
        endedAt: lastMessage.timestamp,
        messageCount: sortedMessages.length,
        modelsUsed,
        tokenTotals,
        estimatedCostUsd: summarizeCosts(sortedMessages),
        confidence:
          inferenceReasons.length === 0 && projectSummary.confidence === 'exact'
            ? 'exact'
            : 'inferred',
        inferenceReason: inferenceReasons.length > 0 ? inferenceReasons.join(' ') : null,
      } satisfies UsageSession
    })
    .sort((left, right) => {
      const startedAtOrder = right.startedAt.localeCompare(left.startedAt)

      if (startedAtOrder !== 0) {
        return startedAtOrder
      }

      return left.id.localeCompare(right.id)
    })
}

export function buildSummaryTotals(sessions: UsageSession[]): SummaryTotals {
  const tokens = sessions.reduce(
    (totals, session) => addTotals(totals, session.tokenTotals),
    createEmptyTotals(),
  )

  return {
    tokens,
    totalEstimatedCostUsd: sessions.every((session) => session.estimatedCostUsd !== null)
      ? sessions.reduce((total, session) => total + (session.estimatedCostUsd ?? 0), 0)
      : null,
    sessionsCount: sessions.length,
  }
}

export function buildSummarySnapshot(
  messages: UsageMessage[],
  sources: SourceState[],
  generatedAt = new Date().toISOString(),
): SummarySnapshot {
  const sessions = aggregateSessions(messages)
  const warnings = [...new Set(sources.flatMap((source) => source.warnings))]

  return {
    generatedAt,
    sources,
    sessions,
    totals: buildSummaryTotals(sessions),
    warnings,
  }
}
