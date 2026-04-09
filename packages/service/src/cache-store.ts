import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import type { SourceFingerprint, SourceFingerprintSnapshot } from './fingerprints'
import { fingerprintsMatch } from './fingerprints'
import type { SummarySnapshot } from './types'

export const CACHE_PAYLOAD_VERSION = 5

export interface CachePayload {
  version: typeof CACHE_PAYLOAD_VERSION
  fingerprints: SourceFingerprintSnapshot
  pricingOverrideFingerprints: SourceFingerprint[]
  snapshot: SummarySnapshot
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function isTokenTotals(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  return (
    isNumber(value.input) &&
    isNumber(value.output) &&
    isNumber(value.reasoning) &&
    isNumber(value.cacheRead) &&
    isNumber(value.cacheWrite) &&
    isNumber(value.total)
  )
}

function isSourceFingerprint(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  return typeof value.path === 'string' && isNumber(value.size) && isNumber(value.mtimeMs)
}

function isSourceFingerprintList(value: unknown): value is SourceFingerprint[] {
  return Array.isArray(value) && value.every(isSourceFingerprint)
}

function isSourceFingerprintSnapshot(value: unknown): value is SourceFingerprintSnapshot {
  if (!isRecord(value) || !isRecord(value.sources)) {
    return false
  }

  return (
    Array.isArray(value.sources.claude) &&
    value.sources.claude.every(isSourceFingerprint) &&
    Array.isArray(value.sources.gemini) &&
    value.sources.gemini.every(isSourceFingerprint) &&
    Array.isArray(value.sources.opencode) &&
    value.sources.opencode.every(isSourceFingerprint) &&
    Array.isArray(value.sources.codex) &&
    value.sources.codex.every(isSourceFingerprint) &&
    Array.isArray(value.sources.pi) &&
    value.sources.pi.every(isSourceFingerprint)
  )
}

function isSourceState(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  return (
    (value.agent === 'claude' ||
      value.agent === 'gemini' ||
      value.agent === 'opencode' ||
      value.agent === 'codex' ||
      value.agent === 'pi') &&
    (value.status === 'ready' ||
      value.status === 'partial' ||
      value.status === 'not_detected' ||
      value.status === 'error') &&
    (value.supportLevel === 'exact' ||
      value.supportLevel === 'heuristic' ||
      value.supportLevel === 'unavailable') &&
    isStringArray(value.discoveredPaths) &&
    isStringArray(value.warnings)
  )
}

function isUsageSession(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    (value.agent === 'claude' ||
      value.agent === 'gemini' ||
      value.agent === 'opencode' ||
      value.agent === 'codex' ||
      value.agent === 'pi') &&
    (typeof value.nativeSessionId === 'string' || value.nativeSessionId === null) &&
    (typeof value.projectPath === 'string' || value.projectPath === null) &&
    typeof value.startedAt === 'string' &&
    typeof value.endedAt === 'string' &&
    isNumber(value.messageCount) &&
    isStringArray(value.modelsUsed) &&
    isTokenTotals(value.tokenTotals) &&
    (isNumber(value.estimatedCostUsd) || value.estimatedCostUsd === null) &&
    (value.confidence === 'exact' || value.confidence === 'inferred') &&
    (typeof value.inferenceReason === 'string' || value.inferenceReason === null)
  )
}

function isSummaryTotals(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  return (
    isTokenTotals(value.tokens) &&
    (isNumber(value.totalEstimatedCostUsd) || value.totalEstimatedCostUsd === null) &&
    isNumber(value.sessionsCount)
  )
}

function isSummarySnapshot(value: unknown): value is SummarySnapshot {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.generatedAt === 'string' &&
    Array.isArray(value.sources) &&
    value.sources.every(isSourceState) &&
    Array.isArray(value.sessions) &&
    value.sessions.every(isUsageSession) &&
    isSummaryTotals(value.totals) &&
    isStringArray(value.warnings)
  )
}

export function isCachePayload(value: unknown): value is CachePayload {
  if (!isRecord(value)) {
    return false
  }

  return (
    value.version === CACHE_PAYLOAD_VERSION &&
    isSourceFingerprintSnapshot(value.fingerprints) &&
    isSourceFingerprintList(value.pricingOverrideFingerprints) &&
    isSummarySnapshot(value.snapshot)
  )
}

export function createCachePayload(
  fingerprints: SourceFingerprintSnapshot,
  pricingOverrideFingerprints: SourceFingerprint[],
  snapshot: SummarySnapshot,
): CachePayload {
  return {
    version: CACHE_PAYLOAD_VERSION,
    fingerprints,
    pricingOverrideFingerprints,
    snapshot,
  }
}

function sourceFingerprintListsMatch(
  left: SourceFingerprint[],
  right: SourceFingerprint[],
): boolean {
  return (
    left.length === right.length &&
    left.every((fingerprint, index) => {
      const other = right[index]

      return (
        fingerprint.path === other?.path &&
        fingerprint.size === other.size &&
        fingerprint.mtimeMs === other.mtimeMs
      )
    })
  )
}

export function shouldReuseCache(
  payload: CachePayload | null,
  fingerprints: SourceFingerprintSnapshot,
  pricingOverrideFingerprints: SourceFingerprint[],
): payload is CachePayload {
  return (
    payload !== null &&
    fingerprintsMatch(payload.fingerprints, fingerprints) &&
    sourceFingerprintListsMatch(payload.pricingOverrideFingerprints, pricingOverrideFingerprints)
  )
}

export async function readCache(path: string): Promise<CachePayload | null> {
  try {
    const raw = await readFile(path, 'utf8')
    const parsed = JSON.parse(raw) as unknown

    return isCachePayload(parsed) ? parsed : null
  } catch {
    return null
  }
}

export async function writeCache(path: string, payload: CachePayload): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(
    path,
    `${JSON.stringify(
      {
        ...payload,
        version: CACHE_PAYLOAD_VERSION,
      },
      null,
      2,
    )}\n`,
  )
}
