export type AgentName = 'claude' | 'gemini' | 'opencode' | 'codex' | 'pi'

export type SourceStatus = 'ready' | 'partial' | 'not_detected' | 'error'

export type SupportLevel = 'exact' | 'heuristic' | 'unavailable'

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool' | 'unknown'

export type PricingProvenance = 'builtin' | 'local_override'
export type CostMode = 'auto' | 'calculate' | 'display'
export type CostStatus = 'exact' | 'estimated' | 'partial' | 'missing'
export type CostProvenance = 'source' | 'catalog' | 'mixed' | 'none'

export interface TokenTotals {
  input: number
  output: number
  reasoning: number
  cacheRead: number
  cacheWrite: number
  total: number
}

export interface PricingEntry {
  provider: string
  model: string
  currency: 'USD'
  inputPerMillion: number
  outputPerMillion: number
  reasoningPerMillion: number
  cacheReadPerMillion: number
  cacheWritePerMillion: number
  source: PricingProvenance
}

export interface UsageMessage {
  id: string
  sessionId: string
  agent: AgentName
  model: string | null
  projectPath: string | null
  timestamp: string
  role: MessageRole
  tokens: TokenTotals
  sourceCostUsd: number | null
  catalogCostUsd: number | null
  rawRef: string
}

export type UsageMessageInput = Omit<UsageMessage, 'catalogCostUsd'>

export interface UsageSession {
  id: string
  agent: AgentName
  nativeSessionId: string | null
  projectPath: string | null
  startedAt: string
  endedAt: string
  messageCount: number
  modelsUsed: string[]
  tokenTotals: TokenTotals
  costUsd: number | null
  costStatus: CostStatus
  costProvenance: CostProvenance
  missingCostMessageCount: number
  missingCostTokenTotal: number
  confidence: 'exact' | 'inferred'
  inferenceReason: string | null
}

export interface SourceState {
  agent: AgentName
  status: SourceStatus
  supportLevel: SupportLevel
  discoveredPaths: string[]
  warnings: string[]
}

export interface SummaryTotals {
  tokens: TokenTotals
  totalCostUsd: number | null
  costStatus: CostStatus
  costProvenance: CostProvenance
  sessionsCount: number
}

export interface SummarySnapshot {
  generatedAt: string
  sources: SourceState[]
  sessions: UsageSession[]
  totals: SummaryTotals
  warnings: string[]
}
