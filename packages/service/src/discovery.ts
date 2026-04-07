import { existsSync } from 'node:fs'
import { glob } from 'node:fs/promises'
import { join } from 'node:path'

import type { AgentLedgerConfig } from './config'
import { getDefaultConfig } from './config'
import type { AgentName } from './types'

export interface DiscoveredSource {
  paths: string[]
  primaryPath?: string | null
  companionPaths?: string[]
}

export type DiscoveredSourceMap = Record<AgentName, DiscoveredSource>

function sortPaths(paths: string[]): string[] {
  return [...new Set(paths)].sort((left, right) => left.localeCompare(right))
}

async function globPaths(root: string, patterns: string[]): Promise<string[]> {
  if (!existsSync(root)) {
    return []
  }

  const matches = await Promise.all(
    patterns.map((pattern) => Array.fromAsync(glob(pattern, { cwd: root }))),
  )

  return sortPaths(
    matches
      .flat()
      .filter((match): match is string => typeof match === 'string')
      .map((match) => join(root, match)),
  )
}

function existingPaths(paths: string[]): string[] {
  return [...new Set(paths.filter((path) => existsSync(path)))]
}

async function discoverCodexPaths(roots: string[]): Promise<string[]> {
  const directPaths = roots.flatMap((root) => [
    join(root, 'history.jsonl'),
    join(root, 'sessions.db'),
    join(root, 'sessions.sqlite'),
    join(root, 'sessions.sqlite3'),
  ])

  const nestedPaths = await Promise.all(
    roots.map((root) => globPaths(root, ['sessions/**/*.jsonl', 'history/**/*.jsonl'])),
  )

  return sortPaths([...existingPaths(directPaths), ...nestedPaths.flat()])
}

export function getDiscoveredPaths(source: DiscoveredSource): string[] {
  return sortPaths([
    ...source.paths,
    ...(source.primaryPath ? [source.primaryPath] : []),
    ...(source.companionPaths ?? []),
  ])
}

function resolveConfig(configOrHome?: AgentLedgerConfig | string): AgentLedgerConfig {
  if (typeof configOrHome === 'string') {
    return getDefaultConfig(configOrHome)
  }

  return configOrHome ?? getDefaultConfig()
}

export async function discoverSources(
  configOrHome?: AgentLedgerConfig | string,
): Promise<DiscoveredSourceMap> {
  const config = resolveConfig(configOrHome)

  const claudePaths = config.sources.claude.enabled
    ? globPaths(config.sources.claude.root, ['**/*.jsonl'])
    : Promise.resolve([])

  const geminiPaths = config.sources.gemini.enabled
    ? globPaths(config.sources.gemini.root, ['**/chats/session-*.json'])
    : Promise.resolve([])

  const codexPaths = config.sources.codex.enabled
    ? discoverCodexPaths(config.sources.codex.roots)
    : Promise.resolve([])

  const opencodePrimaryPath = config.sources.opencode.enabled
    ? (existingPaths(config.sources.opencode.dbPaths)[0] ?? null)
    : null

  const opencodeCompanionPaths = config.sources.opencode.enabled
    ? existingPaths(config.sources.opencode.dbPaths.map((path) => `${path}-wal`))
    : []

  return {
    claude: {
      paths: await claudePaths,
    },
    gemini: {
      paths: await geminiPaths,
    },
    opencode: {
      paths: opencodePrimaryPath ? [opencodePrimaryPath] : [],
      primaryPath: opencodePrimaryPath,
      companionPaths: opencodeCompanionPaths,
    },
    codex: {
      paths: await codexPaths,
    },
  }
}
