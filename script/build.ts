#!/usr/bin/env bun

import { $ } from 'bun'

const appName = 'agent-ledger'
const distDir = new URL('../dist/', import.meta.url)
const packageJson = await Bun.file(new URL('../package.json', import.meta.url)).json()
const version = String(packageJson.version ?? '').trim()

const targets = [
  {
    archive: `${appName}-linux-x64.tar.gz`,
    directory: `${appName}-linux-x64`,
    executable: appName,
    hostOs: 'linux',
    hostArch: 'x64',
    target: 'bun-linux-x64',
  },
  {
    archive: `${appName}-linux-arm64.tar.gz`,
    directory: `${appName}-linux-arm64`,
    executable: appName,
    hostOs: 'linux',
    hostArch: 'arm64',
    target: 'bun-linux-arm64',
  },
  {
    archive: `${appName}-darwin-x64.tar.gz`,
    directory: `${appName}-darwin-x64`,
    executable: appName,
    hostOs: 'darwin',
    hostArch: 'x64',
    target: 'bun-darwin-x64',
  },
  {
    archive: `${appName}-darwin-arm64.tar.gz`,
    directory: `${appName}-darwin-arm64`,
    executable: appName,
    hostOs: 'darwin',
    hostArch: 'arm64',
    target: 'bun-darwin-arm64',
  },
] as const

await $`rm -rf ${distDir.pathname}`
await $`mkdir -p ${distDir.pathname}`

await $`bun install --os="*" --cpu="*"`

for (const item of targets) {
  const targetDir = new URL(`../dist/${item.directory}/`, import.meta.url)
  const outputPath = new URL(`./${item.executable}`, targetDir)

  await $`mkdir -p ${targetDir.pathname}`
  console.log(`Building ${item.target}`)

  await $`bun build ./apps/tui/src/main.tsx --compile --outfile ${outputPath.pathname} --target ${item.target}`

  await $`tar -czf ../${item.archive} ${item.executable}`.cwd(targetDir.pathname)

  if (process.platform === item.hostOs && process.arch === item.hostArch) {
    const smokeVersion = (await $`${outputPath.pathname} --version`.text()).trim()

    if (smokeVersion !== version) {
      throw new Error(
        `Smoke test failed for ${item.target}: expected ${version}, got ${smokeVersion}`,
      )
    }
  }
}
