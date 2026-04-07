#!/usr/bin/env bun

import { $ } from 'bun'

const appName = 'agent-ledger'
const distDir = new URL('../dist/', import.meta.url)
const packagePath = new URL('../package.json', import.meta.url)
const packageJson = await Bun.file(packagePath).json()
const version = String(packageJson.version ?? '').trim()

const targets = [
  {
    archive: `${appName}-linux-x64.tar.gz`,
    directory: `${appName}-linux-x64`,
    hostArch: 'x64',
    target: 'bun-linux-x64',
  },
  {
    archive: `${appName}-linux-arm64.tar.gz`,
    directory: `${appName}-linux-arm64`,
    hostArch: 'arm64',
    target: 'bun-linux-arm64',
  },
] as const

await $`rm -rf ${distDir.pathname}`
await $`mkdir -p ${distDir.pathname}`

await $`bun install --os="*" --cpu="*"`

for (const item of targets) {
  const targetDir = new URL(`../dist/${item.directory}/`, import.meta.url)
  const outputPath = new URL(`./${appName}`, targetDir)

  await $`mkdir -p ${targetDir.pathname}`
  console.log(`Building ${item.target}`)

  await $`bun build ./apps/tui/src/main.tsx --compile --outfile ${outputPath.pathname} --target ${item.target}`

  await $`tar -czf ../${item.archive} ${appName}`.cwd(targetDir.pathname)

  if (process.platform === 'linux' && process.arch === item.hostArch) {
    const smokeVersion = (await $`${outputPath.pathname} --version`.text()).trim()

    if (smokeVersion !== version) {
      throw new Error(
        `Smoke test failed for ${item.target}: expected ${version}, got ${smokeVersion}`,
      )
    }
  }
}
