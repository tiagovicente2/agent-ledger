import { readFile } from 'node:fs/promises'

import { isSummarySnapshot } from './cache-store'
import type { SummarySnapshot } from './types'

export async function readSummarySnapshot(path: string): Promise<SummarySnapshot> {
  const raw = await readFile(path, 'utf8')
  const parsed = JSON.parse(raw) as unknown

  if (!isSummarySnapshot(parsed)) {
    throw new Error(`Invalid summary snapshot: ${path}`)
  }

  return parsed
}
