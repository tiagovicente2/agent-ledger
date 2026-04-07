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
  dbPaths: string[]
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
  const defaults = getPlatformDefaults(home)

  return {
    home,
    pricingOverridePath: defaults.pricingOverridePath,
    cachePath: defaults.cachePath,
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
        dbPaths: defaults.opencodeDbPaths,
      },
      codex: {
        enabled: true,
        roots: defaults.codexRoots,
      },
    },
  }
}

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths)]
}

function getPlatformDefaults(home: string) {
  const configHome = process.env.XDG_CONFIG_HOME || join(home, '.config')
  const dataHome = process.env.XDG_DATA_HOME || join(home, '.local/share')
  const cacheHome = process.env.XDG_CACHE_HOME || join(home, '.cache')

  switch (process.platform) {
    case 'darwin': {
      const appSupport = join(home, 'Library/Application Support')
      const caches = join(home, 'Library/Caches')

      return {
        pricingOverridePath: join(appSupport, 'agent-ledger/pricing.json'),
        cachePath: join(caches, 'agent-ledger/snapshot.json'),
        opencodeDbPaths: [join(appSupport, 'opencode/opencode.db')],
        codexRoots: uniquePaths([
          join(home, '.codex'),
          join(configHome, 'Codex'),
          join(caches, 'Codex'),
        ]),
      }
    }
    case 'win32': {
      const roamingAppData = process.env.APPDATA || join(home, 'AppData/Roaming')
      const localAppData = process.env.LOCALAPPDATA || join(home, 'AppData/Local')

      return {
        pricingOverridePath: join(roamingAppData, 'agent-ledger/pricing.json'),
        cachePath: join(localAppData, 'agent-ledger/cache/snapshot.json'),
        opencodeDbPaths: uniquePaths([
          join(localAppData, 'opencode/opencode.db'),
          join(roamingAppData, 'opencode/opencode.db'),
        ]),
        codexRoots: uniquePaths([
          join(home, '.codex'),
          join(roamingAppData, 'Codex'),
          join(localAppData, 'Codex'),
        ]),
      }
    }
    default:
      return {
        pricingOverridePath: join(configHome, 'agent-ledger/pricing.json'),
        cachePath: join(dataHome, 'agent-ledger/cache/snapshot.json'),
        opencodeDbPaths: [join(dataHome, 'opencode/opencode.db')],
        codexRoots: uniquePaths([
          join(home, '.codex'),
          join(configHome, 'Codex'),
          join(cacheHome, 'Codex'),
        ]),
      }
  }
}

export function getPricingOverridePaths(
  config: Pick<AgentLedgerConfig, 'home' | 'pricingOverridePath'>,
) {
  const paths = [config.pricingOverridePath]

  if (process.platform !== 'darwin') {
    return paths
  }

  const currentDefault = getPlatformDefaults(config.home).pricingOverridePath

  if (config.pricingOverridePath !== currentDefault) {
    return paths
  }

  const legacyPath = join(config.home, '.config/agent-ledger/pricing.json')

  return uniquePaths([...paths, legacyPath])
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
    dbPaths: config?.dbPaths ?? defaults.dbPaths,
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
