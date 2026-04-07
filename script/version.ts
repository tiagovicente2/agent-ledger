#!/usr/bin/env bun

import { $ } from 'bun'

const packagePath = new URL('../package.json', import.meta.url)
const packageJson = await Bun.file(packagePath).json()

const currentVersion = String(packageJson.version ?? '').trim()
const requestedVersion = String(process.env.AGENT_LEDGER_VERSION ?? '')
  .trim()
  .replace(/^v/, '')
const requestedBump = String(process.env.AGENT_LEDGER_BUMP ?? 'patch').trim()

function bumpVersion(version: string, bump: string) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)

  if (!match) {
    throw new Error(`Unsupported version format: ${version}`)
  }

  const major = Number(match[1])
  const minor = Number(match[2])
  const patch = Number(match[3])

  switch (bump) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
      return `${major}.${minor}.${patch + 1}`
    default:
      throw new Error(`Unsupported bump type: ${bump}`)
  }
}

async function resolveBranch() {
  const branchFromEnv = String(process.env.GITHUB_REF_NAME ?? '').trim()

  if (branchFromEnv.length > 0 && branchFromEnv !== 'HEAD') {
    return branchFromEnv
  }

  const branch = (await $`git rev-parse --abbrev-ref HEAD`.text()).trim()

  if (branch === 'HEAD' || branch.length === 0) {
    throw new Error('Unable to determine the current branch for release push')
  }

  return branch
}

async function writeOutputs(lines: string[]) {
  const outputPath = process.env.GITHUB_OUTPUT

  if (outputPath) {
    await Bun.write(outputPath, `${lines.join('\n')}\n`)
  }
}

if (!currentVersion) {
  throw new Error('package.json is missing a version field')
}

const nextVersion = requestedVersion || bumpVersion(currentVersion, requestedBump)

const tag = `v${nextVersion}`
const branch = await resolveBranch()

const existingTag = (await $`git tag --list ${tag}`.text()).trim()

if (existingTag === tag) {
  throw new Error(`Tag ${tag} already exists`)
}

if (nextVersion !== currentVersion) {
  packageJson.version = nextVersion
  await Bun.write(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`)

  await $`git add package.json`
  await $`git commit -m ${`release: ${tag}`}`
}

const commit = (await $`git rev-parse HEAD`.text()).trim()
await $`git tag ${tag}`
await $`git push origin HEAD:${branch} --tags`

await writeOutputs([`version=${nextVersion}`, `tag=${tag}`, `branch=${branch}`, `commit=${commit}`])
