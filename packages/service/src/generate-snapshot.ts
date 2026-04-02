import { writeFile } from 'node:fs/promises'

import { getDefaultConfig } from './config'
import { loadSnapshot } from './load-snapshot'

interface CliOptions {
  json: boolean
  outPath: string | null
}

function parseCliOptions(argv: string[]): CliOptions {
  let json = false
  let outPath: string | null = null

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]

    if (value === '--json') {
      json = true
      continue
    }

    if (value === '--out') {
      outPath = argv[index + 1] ?? null
      index += 1
    }
  }

  return {
    json,
    outPath,
  }
}

function formatUsd(value: number | null) {
  if (value === null) {
    return 'n/a'
  }

  return `$${value.toFixed(2)}`
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2))

  if (process.argv.includes('--out') && !options.outPath) {
    throw new Error('Missing path after --out')
  }

  const snapshot = await loadSnapshot()
  const config = getDefaultConfig()

  if (options.outPath) {
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
    `Est cost: ${formatUsd(snapshot.totals.totalEstimatedCostUsd)}`,
    `Warnings: ${snapshot.warnings.length.toLocaleString()}`,
    `Cache path: ${config.cachePath}`,
  ]

  if (options.outPath) {
    lines.push(`JSON output: ${options.outPath}`)
  }

  process.stdout.write(`${lines.join('\n')}\n`)
}

await main()
