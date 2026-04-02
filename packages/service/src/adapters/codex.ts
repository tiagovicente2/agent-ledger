import type { SourceState } from '../types'

export function getCodexStatus(paths: string[]): SourceState {
  return paths.length === 0
    ? {
        agent: 'codex',
        status: 'not_detected',
        supportLevel: 'unavailable',
        discoveredPaths: [],
        warnings: ['Codex local runtime data not detected on this machine'],
      }
    : {
        agent: 'codex',
        status: 'partial',
        supportLevel: 'unavailable',
        discoveredPaths: [...paths],
        warnings: ['Codex local runtime parsing is not implemented yet'],
      }
}
