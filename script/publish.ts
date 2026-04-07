#!/usr/bin/env bun

import { $ } from 'bun'

const packagePath = new URL('../package.json', import.meta.url)
const packageJson = await Bun.file(packagePath).json()
const version = String(packageJson.version ?? '').trim()
const tag = `v${version}`

if (!version) {
  throw new Error('package.json is missing a version field')
}

await $`gh release upload ${tag} ./dist/*.tar.gz --clobber`
await $`gh release edit ${tag} --draft=false`
