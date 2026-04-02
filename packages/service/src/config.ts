import { homedir } from 'node:os'
import { join } from 'node:path'

export interface ClaudeSourceConfig {
  enabled: boolean
  root: string
}

export interface GeminiSourceConfig {
  enabled: boolean
  root: string
}

export interface OpenCodeSourceConfig {
  enabled: boolean
  dbPath: string
}

export interface CodexSourceConfig {
  enabled: boolean
  roots: string[]
}

export interface AgentLedgerConfig {
  home: string
  pricingOverridePath: string
  cachePath: string
  sources: {
    claude: ClaudeSourceConfig
    gemini: GeminiSourceConfig
    opencode: OpenCodeSourceConfig
    codex: CodexSourceConfig
  }
}

export interface AgentLedgerConfigInput {
  home?: string
  pricingOverridePath?: string
  cachePath?: string
  sources?: {
    claude?: Partial<ClaudeSourceConfig>
    gemini?: Partial<GeminiSourceConfig>
    opencode?: Partial<OpenCodeSourceConfig>
    codex?: Partial<CodexSourceConfig>
  }
}

export function getDefaultConfig(home = homedir()): AgentLedgerConfig {
  return {
    home,
    pricingOverridePath: join(home, '.config/agent-ledger/pricing.json'),
    cachePath: join(home, '.local/share/agent-ledger/cache/snapshot.json'),
    sources: {
      claude: {
        enabled: true,
        root: join(home, '.claude/projects'),
      },
      gemini: {
        enabled: true,
        root: join(home, '.gemini/tmp'),
      },
      opencode: {
        enabled: true,
        dbPath: join(home, '.local/share/opencode/opencode.db'),
      },
      codex: {
        enabled: true,
        roots: [join(home, '.config/Codex'), join(home, '.cache/Codex')],
      },
    },
  }
}

function expandClaudeSourceConfig(
  defaults: ClaudeSourceConfig,
  config: Partial<ClaudeSourceConfig> | undefined,
): ClaudeSourceConfig {
  return {
    enabled: config?.enabled ?? defaults.enabled,
    root: config?.root ?? defaults.root,
  }
}

function expandGeminiSourceConfig(
  defaults: GeminiSourceConfig,
  config: Partial<GeminiSourceConfig> | undefined,
): GeminiSourceConfig {
  return {
    enabled: config?.enabled ?? defaults.enabled,
    root: config?.root ?? defaults.root,
  }
}

function expandOpenCodeSourceConfig(
  defaults: OpenCodeSourceConfig,
  config: Partial<OpenCodeSourceConfig> | undefined,
): OpenCodeSourceConfig {
  return {
    enabled: config?.enabled ?? defaults.enabled,
    dbPath: config?.dbPath ?? defaults.dbPath,
  }
}

function expandCodexSourceConfig(
  defaults: CodexSourceConfig,
  config: Partial<CodexSourceConfig> | undefined,
): CodexSourceConfig {
  return {
    enabled: config?.enabled ?? defaults.enabled,
    roots: config?.roots ?? defaults.roots,
  }
}

export function expandConfig(config: AgentLedgerConfigInput = {}): AgentLedgerConfig {
  const defaults = getDefaultConfig(config.home)

  return {
    home: config.home ?? defaults.home,
    pricingOverridePath: config.pricingOverridePath ?? defaults.pricingOverridePath,
    cachePath: config.cachePath ?? defaults.cachePath,
    sources: {
      claude: expandClaudeSourceConfig(defaults.sources.claude, config.sources?.claude),
      gemini: expandGeminiSourceConfig(defaults.sources.gemini, config.sources?.gemini),
      opencode: expandOpenCodeSourceConfig(defaults.sources.opencode, config.sources?.opencode),
      codex: expandCodexSourceConfig(defaults.sources.codex, config.sources?.codex),
    },
  }
}
