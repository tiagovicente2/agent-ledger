import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { getDefaultConfig } from './config'
import { createDemoSnapshot } from './demo-snapshot'
import { loadSnapshot } from './load-snapshot'

import type { CostMode } from './types'

interface CliOptions {
  costMode: CostMode | null
  demo: boolean
  json: boolean
  outPath: string | null
}

function parseCliOptions(argv: string[]): CliOptions {
  let demo = false
  let json = false
  let outPath: string | null = null
  let costMode: CostMode | null = null

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]

    if (value === '--demo') {
      demo = true
      continue
    }

    if (value === '--json') {
      json = true
      continue
    }

    if (value === '--out') {
      outPath = argv[index + 1] ?? null
      index += 1
      continue
    }

    if (value === '--cost-mode') {
      const nextValue = argv[index + 1]

      if (nextValue === 'auto' || nextValue === 'calculate' || nextValue === 'display') {
        costMode = nextValue
      }

      index += 1
    }
  }

  return {
    costMode,
    demo,
    json,
    outPath,
  }
}

function formatResolvedUsd(
  value: number | null,
  status: 'exact' | 'estimated' | 'partial' | 'missing',
) {
  if (value === null) {
    return 'n/a'
  }

  return `${status === 'exact' ? '' : '~'}$${value.toFixed(2)}`
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2))

  if (process.argv.includes('--out') && !options.outPath) {
    throw new Error('Missing path after --out')
  }

  const config = getDefaultConfig()
  const effectiveCostMode = options.costMode ?? config.costMode
  const snapshot = options.demo
    ? createDemoSnapshot()
    : await loadSnapshot({
        costMode: effectiveCostMode,
      })

  if (options.outPath) {
    await mkdir(dirname(options.outPath), { recursive: true })
    await writeFile(options.outPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`)
    return
  }

  const lines = [
    'Snapshot generated',
    `Generated at: ${snapshot.generatedAt}`,
    `Sessions: ${snapshot.totals.sessionsCount.toLocaleString()}`,
    `Tokens: ${snapshot.totals.tokens.total.toLocaleString()}`,
    `Cost: ${formatResolvedUsd(snapshot.totals.totalCostUsd, snapshot.totals.costStatus)}`,
    `Warnings: ${snapshot.warnings.length.toLocaleString()}`,
    `Cost mode: ${effectiveCostMode}`,
    options.demo ? 'Source: built-in demo snapshot' : `Cache path: ${config.cachePath}`,
  ]

  if (options.outPath) {
    lines.push(`JSON output: ${options.outPath}`)
  }

  process.stdout.write(`${lines.join('\n')}\n`)
}

await main()
