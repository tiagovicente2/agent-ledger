import { readFile } from 'node:fs/promises'

import { parseClaudeSession } from './adapters/claude'
import { parseCodexSession } from './adapters/codex'
import { parseGeminiSession } from './adapters/gemini'
import { loadOpenCodeMessages, type OpenCodeQueryResultRow } from './adapters/opencode'
import { buildSummarySnapshot } from './aggregate'
import { createCachePayload, readCache, shouldReuseCache, writeCache } from './cache-store'
import {
  type AgentLedgerConfig,
  type AgentLedgerConfigInput,
  expandConfig,
  getPricingOverridePaths,
} from './config'
import { type DiscoveredSource, discoverSources, getDiscoveredPaths } from './discovery'
import { fingerprintPaths, fingerprintSources } from './fingerprints'
import { normalizeMessages } from './normalize'
import { loadPricingCatalog } from './pricing'
import type { AgentName, SourceState, SourceStatus, SupportLevel, UsageMessageInput } from './types'

interface LoadedAgentData {
  messages: UsageMessageInput[]
  warnings: string[]
}

interface OpenCodeDatabaseHandle {
  close(): void
  query(sql: string): {
    all(): OpenCodeQueryResultRow[]
  }
}

function createSourceState(
  agent: AgentName,
  source: DiscoveredSource,
  supportLevel: SupportLevel,
  warnings: string[],
  parsedMessages: number,
): SourceState {
  const discoveredPaths = getDiscoveredPaths(source)
  let status: SourceStatus = 'not_detected'

  if (discoveredPaths.length > 0) {
    status = warnings.length === 0 ? 'ready' : parsedMessages > 0 ? 'partial' : 'error'
  }

  return {
    agent,
    status,
    supportLevel,
    discoveredPaths,
    warnings,
  }
}

async function loadClaudeMessages(paths: string[]): Promise<LoadedAgentData> {
  const warnings: string[] = []
  const messages: UsageMessageInput[] = []

  await Promise.all(
    paths.map(async (path) => {
      try {
        messages.push(...parseClaudeSession(await readFile(path, 'utf8'), path))
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        warnings.push(`Failed to read Claude source ${path}: ${detail}`)
      }
    }),
  )

  return {
    messages,
    warnings,
  }
}

async function loadGeminiMessages(paths: string[]): Promise<LoadedAgentData> {
  const warnings: string[] = []
  const messages: UsageMessageInput[] = []

  await Promise.all(
    paths.map(async (path) => {
      try {
        const payload = JSON.parse(await readFile(path, 'utf8')) as unknown
        messages.push(...parseGeminiSession(payload, path))
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        warnings.push(`Failed to read Gemini source ${path}: ${detail}`)
      }
    }),
  )

  return {
    messages,
    warnings,
  }
}

async function openOpenCodeDatabase(path: string): Promise<OpenCodeDatabaseHandle> {
  try {
    const sqlite = await import('node:sqlite')
    const database = new sqlite.DatabaseSync(path, { open: true, readOnly: true })

    return {
      close() {
        database.close()
      },
      query(sql: string) {
        return {
          all: () => database.prepare(sql).all() as unknown as OpenCodeQueryResultRow[],
        }
      },
    }
  } catch {
    const importer = new Function('specifier', 'return import(specifier)') as (
      specifier: string,
    ) => Promise<{
      Database: new (
        path: string,
        options?: {
          readonly?: boolean
        },
      ) => {
        close(): void
        query(sql: string): {
          all(): unknown[]
        }
      }
    }>
    const sqlite = await importer('bun:sqlite')
    const database = new sqlite.Database(path, { readonly: true })

    return {
      close() {
        database.close()
      },
      query(sql: string) {
        return {
          all: () => database.query(sql).all() as unknown as OpenCodeQueryResultRow[],
        }
      },
    }
  }
}

async function loadOpenCodePrimary(path: string): Promise<LoadedAgentData> {
  try {
    const database = await openOpenCodeDatabase(path)

    try {
      return {
        messages: loadOpenCodeMessages(
          {
            query(sql: string) {
              return database.query(sql)
            },
          },
          path,
        ),
        warnings: [],
      }
    } finally {
      database.close()
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)

    return {
      messages: [],
      warnings: [`Failed to read OpenCode database ${path}: ${detail}`],
    }
  }
}

async function loadCodexMessages(paths: string[]): Promise<LoadedAgentData> {
  const warnings: string[] = []
  const messages: UsageMessageInput[] = []

  await Promise.all(
    paths.map(async (path) => {
      const normalizedPath = path.toLowerCase()

      if (!normalizedPath.endsWith('.jsonl')) {
        const isSqliteHistory =
          normalizedPath.endsWith('.db') ||
          normalizedPath.endsWith('.sqlite') ||
          normalizedPath.endsWith('.sqlite3')

        warnings.push(
          isSqliteHistory
            ? `Skipped Codex source ${path}: SQLite Codex history is discovered but not supported yet`
            : `Skipped Codex source ${path}: unsupported file type (expected .jsonl)`,
        )
        return
      }

      try {
        messages.push(...parseCodexSession(await readFile(path, 'utf8'), path))
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        warnings.push(`Failed to read Codex source ${path}: ${detail}`)
      }
    }),
  )

  return {
    messages,
    warnings,
  }
}

function getSupportLevel(agent: AgentName): SupportLevel {
  switch (agent) {
    case 'claude':
      return 'exact'
    case 'gemini':
      return 'heuristic'
    case 'opencode':
      return 'exact'
    case 'codex':
      return 'heuristic'
  }
}

function resolveConfig(config?: AgentLedgerConfigInput | AgentLedgerConfig): AgentLedgerConfig {
  return expandConfig(config)
}

export async function loadSnapshot(configInput?: AgentLedgerConfigInput | AgentLedgerConfig) {
  const config = resolveConfig(configInput)
  const pricingOverridePaths = getPricingOverridePaths(config)
  const discovered = await discoverSources(config)
  const [fingerprints, pricingOverrideFingerprints, cachedPayload] = await Promise.all([
    fingerprintSources(discovered),
    fingerprintPaths(pricingOverridePaths),
    readCache(config.cachePath),
  ])

  if (shouldReuseCache(cachedPayload, fingerprints, pricingOverrideFingerprints)) {
    return cachedPayload.snapshot
  }

  const [pricingCatalog, claude, gemini, opencode, codex] = await Promise.all([
    loadPricingCatalog(pricingOverridePaths),
    loadClaudeMessages(discovered.claude.paths),
    loadGeminiMessages(discovered.gemini.paths),
    discovered.opencode.primaryPath
      ? loadOpenCodePrimary(discovered.opencode.primaryPath)
      : Promise.resolve({ messages: [], warnings: [] }),
    loadCodexMessages(discovered.codex.paths),
  ])
  const sourceStates: SourceState[] = [
    createSourceState(
      'claude',
      discovered.claude,
      getSupportLevel('claude'),
      claude.warnings,
      claude.messages.length,
    ),
    createSourceState(
      'gemini',
      discovered.gemini,
      getSupportLevel('gemini'),
      gemini.warnings,
      gemini.messages.length,
    ),
    createSourceState(
      'opencode',
      discovered.opencode,
      getSupportLevel('opencode'),
      opencode.warnings,
      opencode.messages.length,
    ),
    createSourceState(
      'codex',
      discovered.codex,
      getSupportLevel('codex'),
      codex.warnings,
      codex.messages.length,
    ),
  ]
  const messages = normalizeMessages(
    [...claude.messages, ...gemini.messages, ...opencode.messages, ...codex.messages],
    pricingCatalog,
  )
  const snapshot = buildSummarySnapshot(messages, sourceStates)

  try {
    await writeCache(
      config.cachePath,
      createCachePayload(fingerprints, pricingOverrideFingerprints, snapshot),
    )

    return snapshot
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)

    return {
      ...snapshot,
      warnings: [...snapshot.warnings, `Failed to write cache ${config.cachePath}: ${detail}`],
    }
  }
}
