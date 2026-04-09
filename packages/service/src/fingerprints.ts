import { stat } from 'node:fs/promises'

import type { DiscoveredSourceMap } from './discovery'
import { getDiscoveredPaths } from './discovery'
import type { AgentName } from './types'

export interface SourceFingerprint {
  path: string
  size: number
  mtimeMs: number
}

export type SourceFingerprintMap = Record<AgentName, SourceFingerprint[]>

export interface SourceFingerprintSnapshot {
  sources: SourceFingerprintMap
}

function sortFingerprints(fingerprints: SourceFingerprint[]): SourceFingerprint[] {
  return [...fingerprints].sort((left, right) => {
    const byPath = left.path.localeCompare(right.path)

    if (byPath !== 0) {
      return byPath
    }

    const bySize = left.size - right.size

    if (bySize !== 0) {
      return bySize
    }

    return left.mtimeMs - right.mtimeMs
  })
}

function normalizeSnapshot(snapshot: SourceFingerprintSnapshot): SourceFingerprintSnapshot {
  return {
    sources: {
      claude: sortFingerprints(snapshot.sources.claude),
      gemini: sortFingerprints(snapshot.sources.gemini),
      opencode: sortFingerprints(snapshot.sources.opencode),
      codex: sortFingerprints(snapshot.sources.codex),
      pi: sortFingerprints(snapshot.sources.pi),
    },
  }
}

function fingerprintListsMatch(left: SourceFingerprint[], right: SourceFingerprint[]): boolean {
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

export async function fingerprintPath(path: string): Promise<SourceFingerprint | null> {
  try {
    const fileInfo = await stat(path)

    return {
      path,
      size: fileInfo.size,
      mtimeMs: fileInfo.mtimeMs,
    }
  } catch {
    return null
  }
}

export async function fingerprintPaths(paths: string[]): Promise<SourceFingerprint[]> {
  const fingerprints = await Promise.all(paths.map((path) => fingerprintPath(path)))

  return sortFingerprints(
    fingerprints.filter((fingerprint): fingerprint is SourceFingerprint => fingerprint !== null),
  )
}

export async function fingerprintSources(
  discoveredSources: DiscoveredSourceMap,
): Promise<SourceFingerprintSnapshot> {
  const [claude, gemini, opencode, codex, pi] = await Promise.all([
    fingerprintPaths(getDiscoveredPaths(discoveredSources.claude)),
    fingerprintPaths(getDiscoveredPaths(discoveredSources.gemini)),
    fingerprintPaths(getDiscoveredPaths(discoveredSources.opencode)),
    fingerprintPaths(getDiscoveredPaths(discoveredSources.codex)),
    fingerprintPaths(getDiscoveredPaths(discoveredSources.pi)),
  ])

  return {
    sources: {
      claude,
      gemini,
      opencode,
      codex,
      pi,
    },
  }
}

export function fingerprintsMatch(
  left: SourceFingerprintSnapshot,
  right: SourceFingerprintSnapshot,
): boolean {
  const normalizedLeft = normalizeSnapshot(left)
  const normalizedRight = normalizeSnapshot(right)

  return (
    fingerprintListsMatch(normalizedLeft.sources.claude, normalizedRight.sources.claude) &&
    fingerprintListsMatch(normalizedLeft.sources.gemini, normalizedRight.sources.gemini) &&
    fingerprintListsMatch(normalizedLeft.sources.opencode, normalizedRight.sources.opencode) &&
    fingerprintListsMatch(normalizedLeft.sources.codex, normalizedRight.sources.codex) &&
    fingerprintListsMatch(normalizedLeft.sources.pi, normalizedRight.sources.pi)
  )
}
