import type { SourceState, SummarySnapshot, TokenTotals, UsageSession } from './types'

interface DemoSessionSeed {
  agent: UsageSession['agent']
  nativeSessionId: string
  projectPath: string
  startedHoursAgo: number
  durationMinutes: number
  messageCount: number
  modelsUsed: string[]
  tokenTotals: Omit<TokenTotals, 'total'>
  costUsd: number
  confidence: UsageSession['confidence']
  inferenceReason: string | null
}

function createTokenTotals(values: Omit<TokenTotals, 'total'>): TokenTotals {
  const total =
    values.input +
    values.output +
    values.reasoning +
    values.cacheRead +
    values.cacheWrite

  return {
    ...values,
    total,
  }
}

function addTokenTotals(left: TokenTotals, right: TokenTotals): TokenTotals {
  return createTokenTotals({
    input: left.input + right.input,
    output: left.output + right.output,
    reasoning: left.reasoning + right.reasoning,
    cacheRead: left.cacheRead + right.cacheRead,
    cacheWrite: left.cacheWrite + right.cacheWrite,
  })
}

function shiftDate(baseDate: Date, hoursAgo: number) {
  return new Date(baseDate.getTime() - hoursAgo * 60 * 60 * 1000)
}

function shiftMinutes(baseDate: Date, minutes: number) {
  return new Date(baseDate.getTime() + minutes * 60 * 1000)
}

function createSourceStates(): SourceState[] {
  return [
    {
      agent: 'claude',
      status: 'ready',
      supportLevel: 'exact',
      discoveredPaths: ['/demo/.claude/projects/agent-ledger/2026-04-13T0900.jsonl'],
      warnings: [],
    },
    {
      agent: 'gemini',
      status: 'ready',
      supportLevel: 'heuristic',
      discoveredPaths: ['/demo/.gemini/tmp/launchpad-web/chats/session-2026-04-13.json'],
      warnings: [],
    },
    {
      agent: 'opencode',
      status: 'ready',
      supportLevel: 'exact',
      discoveredPaths: ['/demo/.local/share/opencode/opencode.db'],
      warnings: [],
    },
    {
      agent: 'codex',
      status: 'ready',
      supportLevel: 'heuristic',
      discoveredPaths: ['/demo/.codex/history/sandbox-mobile/session-2026-04-12.jsonl'],
      warnings: [],
    },
    {
      agent: 'pi',
      status: 'ready',
      supportLevel: 'exact',
      discoveredPaths: ['/demo/.pi/agent/sessions/agent-ledger/demo-2026-04-13.jsonl'],
      warnings: [],
    },
  ]
}

function createDemoSessions(baseDate: Date): UsageSession[] {
  const seeds: DemoSessionSeed[] = [
    {
      agent: 'claude',
      nativeSessionId: 'claude-demo-001',
      projectPath: '/demo/workspaces/agent-ledger',
      startedHoursAgo: 4,
      durationMinutes: 54,
      messageCount: 28,
      modelsUsed: ['claude-sonnet-4.6'],
      tokenTotals: {
        input: 98000,
        output: 54000,
        reasoning: 21000,
        cacheRead: 6000,
        cacheWrite: 2000,
      },
      costUsd: 3.42,
      confidence: 'exact',
      inferenceReason: null,
    },
    {
      agent: 'opencode',
      nativeSessionId: 'opencode-demo-001',
      projectPath: '/demo/workspaces/ops-automations',
      startedHoursAgo: 9,
      durationMinutes: 41,
      messageCount: 19,
      modelsUsed: ['gpt-5.4'],
      tokenTotals: {
        input: 62000,
        output: 31000,
        reasoning: 9000,
        cacheRead: 16000,
        cacheWrite: 5000,
      },
      costUsd: 2.11,
      confidence: 'exact',
      inferenceReason: null,
    },
    {
      agent: 'pi',
      nativeSessionId: 'pi-demo-001',
      projectPath: '/demo/workspaces/agent-ledger',
      startedHoursAgo: 13,
      durationMinutes: 36,
      messageCount: 15,
      modelsUsed: ['gpt-5.4'],
      tokenTotals: {
        input: 34000,
        output: 19000,
        reasoning: 0,
        cacheRead: 4000,
        cacheWrite: 0,
      },
      costUsd: 0.48,
      confidence: 'exact',
      inferenceReason: null,
    },
    {
      agent: 'gemini',
      nativeSessionId: 'gemini-demo-001',
      projectPath: '/demo/workspaces/launchpad-web',
      startedHoursAgo: 20,
      durationMinutes: 63,
      messageCount: 24,
      modelsUsed: ['gemini-3.1-pro'],
      tokenTotals: {
        input: 81000,
        output: 46000,
        reasoning: 17000,
        cacheRead: 12000,
        cacheWrite: 3000,
      },
      costUsd: 2.54,
      confidence: 'inferred',
      inferenceReason: 'Gemini project path inferred from workspaceRoot metadata',
    },
    {
      agent: 'codex',
      nativeSessionId: 'codex-demo-001',
      projectPath: '/demo/workspaces/sandbox-mobile',
      startedHoursAgo: 28,
      durationMinutes: 32,
      messageCount: 18,
      modelsUsed: ['gpt-5.4'],
      tokenTotals: {
        input: 57000,
        output: 29000,
        reasoning: 14000,
        cacheRead: 8000,
        cacheWrite: 2000,
      },
      costUsd: 1.97,
      confidence: 'inferred',
      inferenceReason: 'Codex project path inferred from turn context cwd',
    },
    {
      agent: 'claude',
      nativeSessionId: 'claude-demo-002',
      projectPath: '/demo/workspaces/launchpad-web',
      startedHoursAgo: 35,
      durationMinutes: 47,
      messageCount: 22,
      modelsUsed: ['claude-sonnet-4.6'],
      tokenTotals: {
        input: 76000,
        output: 39000,
        reasoning: 18000,
        cacheRead: 10000,
        cacheWrite: 3000,
      },
      costUsd: 2.66,
      confidence: 'exact',
      inferenceReason: null,
    },
    {
      agent: 'gemini',
      nativeSessionId: 'gemini-demo-002',
      projectPath: '/demo/workspaces/docs-site',
      startedHoursAgo: 52,
      durationMinutes: 26,
      messageCount: 14,
      modelsUsed: ['gemini-3.1-pro'],
      tokenTotals: {
        input: 28000,
        output: 17000,
        reasoning: 3000,
        cacheRead: 6000,
        cacheWrite: 1000,
      },
      costUsd: 0.59,
      confidence: 'inferred',
      inferenceReason: 'Gemini project path inferred from session cwd',
    },
    {
      agent: 'opencode',
      nativeSessionId: 'opencode-demo-002',
      projectPath: '/demo/workspaces/infra-playground',
      startedHoursAgo: 70,
      durationMinutes: 58,
      messageCount: 21,
      modelsUsed: ['gpt-5.4'],
      tokenTotals: {
        input: 69000,
        output: 38000,
        reasoning: 11000,
        cacheRead: 14000,
        cacheWrite: 4000,
      },
      costUsd: 2.08,
      confidence: 'exact',
      inferenceReason: null,
    },
    {
      agent: 'pi',
      nativeSessionId: 'pi-demo-002',
      projectPath: '/demo/workspaces/customer-support-bot',
      startedHoursAgo: 90,
      durationMinutes: 39,
      messageCount: 16,
      modelsUsed: ['claude-sonnet-4.6'],
      tokenTotals: {
        input: 41000,
        output: 23000,
        reasoning: 0,
        cacheRead: 5000,
        cacheWrite: 0,
      },
      costUsd: 0.67,
      confidence: 'exact',
      inferenceReason: null,
    },
    {
      agent: 'codex',
      nativeSessionId: 'codex-demo-002',
      projectPath: '/demo/workspaces/sales-insights',
      startedHoursAgo: 110,
      durationMinutes: 44,
      messageCount: 20,
      modelsUsed: ['gpt-5.4'],
      tokenTotals: {
        input: 47000,
        output: 26000,
        reasoning: 9000,
        cacheRead: 7000,
        cacheWrite: 2000,
      },
      costUsd: 1.21,
      confidence: 'inferred',
      inferenceReason: 'Codex project path inferred from session metadata cwd',
    },
    {
      agent: 'claude',
      nativeSessionId: 'claude-demo-003',
      projectPath: '/demo/workspaces/roadmap-studio',
      startedHoursAgo: 130,
      durationMinutes: 67,
      messageCount: 31,
      modelsUsed: ['claude-opus-4.6'],
      tokenTotals: {
        input: 105000,
        output: 61000,
        reasoning: 24000,
        cacheRead: 9000,
        cacheWrite: 4000,
      },
      costUsd: 4.18,
      confidence: 'exact',
      inferenceReason: null,
    },
    {
      agent: 'gemini',
      nativeSessionId: 'gemini-demo-003',
      projectPath: '/demo/workspaces/analytics-lab',
      startedHoursAgo: 150,
      durationMinutes: 29,
      messageCount: 13,
      modelsUsed: ['gemini-3.1-pro'],
      tokenTotals: {
        input: 36000,
        output: 22000,
        reasoning: 6000,
        cacheRead: 4000,
        cacheWrite: 1000,
      },
      costUsd: 0.88,
      confidence: 'inferred',
      inferenceReason: 'Gemini project path inferred from workspace metadata',
    },
  ]

  return seeds
    .map((seed, index) => {
      const startedAt = shiftDate(baseDate, seed.startedHoursAgo)
      const endedAt = shiftMinutes(startedAt, seed.durationMinutes)
      const tokenTotals = createTokenTotals(seed.tokenTotals)

      return {
        id: `demo-session-${index + 1}`,
        agent: seed.agent,
        nativeSessionId: seed.nativeSessionId,
        projectPath: seed.projectPath,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        messageCount: seed.messageCount,
        modelsUsed: seed.modelsUsed,
        tokenTotals,
        costUsd: seed.costUsd,
        costStatus: 'estimated',
        costProvenance: 'catalog',
        missingCostMessageCount: 0,
        missingCostTokenTotal: 0,
        confidence: seed.confidence,
        inferenceReason: seed.inferenceReason,
      } satisfies UsageSession
    })
    .sort((left, right) => right.endedAt.localeCompare(left.endedAt))
}

export function createDemoSnapshot(baseDate = new Date()): SummarySnapshot {
  const sessions = createDemoSessions(baseDate)
  const totals = sessions.reduce(
    (aggregate, session) => ({
      cost: aggregate.cost + (session.costUsd ?? 0),
      tokens: addTokenTotals(aggregate.tokens, session.tokenTotals),
    }),
    {
      cost: 0,
      tokens: createTokenTotals({
        input: 0,
        output: 0,
        reasoning: 0,
        cacheRead: 0,
        cacheWrite: 0,
      }),
    },
  )

  return {
    generatedAt: baseDate.toISOString(),
    sources: createSourceStates(),
    sessions,
    totals: {
      sessionsCount: sessions.length,
      tokens: totals.tokens,
      totalCostUsd: Number(totals.cost.toFixed(2)),
      costStatus: 'estimated',
      costProvenance: 'catalog',
    },
    warnings: [],
  }
}
