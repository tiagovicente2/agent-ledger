#!/usr/bin/env bun

import { $ } from 'bun'

function resolveTag() {
  const tagFromEnv = String(process.env.AGENT_LEDGER_TAG ?? process.env.GITHUB_REF_NAME ?? '')
    .trim()
    .replace(/^refs\/tags\//, '')

  if (!tagFromEnv) {
    throw new Error('Missing AGENT_LEDGER_TAG or GITHUB_REF_NAME for release publish')
  }

  if (!tagFromEnv.startsWith('v')) {
    throw new Error(`Expected a version tag like v0.1.0, got ${tagFromEnv}`)
  }

  return tagFromEnv
}

const packagePath = new URL('../package.json', import.meta.url)
const packageJson = await Bun.file(packagePath).json()
const version = String(packageJson.version ?? '').trim()
const tag = resolveTag()

if (!version) {
  throw new Error('package.json is missing a version field')
}

if (tag !== `v${version}`) {
  throw new Error(`Tag ${tag} does not match package.json version ${version}`)
}

const notesPath = `${process.env.RUNNER_TEMP ?? '/tmp'}/agent-ledger-release-notes.txt`
await Bun.write(notesPath, `Release ${tag}`)

const existingRelease = await $`gh release view ${tag}`.nothrow()

if (existingRelease.exitCode !== 0) {
  await $`gh release create ${tag} --draft --title ${tag} --notes-file ${notesPath}`
}

await $`gh release upload ${tag} ./dist/*.tar.gz --clobber`
await $`gh release edit ${tag} --draft=false --latest`
