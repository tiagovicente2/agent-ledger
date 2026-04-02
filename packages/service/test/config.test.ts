import { expect, test } from 'bun:test'
import { getDefaultConfig } from '../src/config'

test('default config includes known agent sources', () => {
  const config = getDefaultConfig()

  expect(config.sources.claude.enabled).toBe(true)
  expect(config.sources.gemini.enabled).toBe(true)
  expect(config.sources.opencode.enabled).toBe(true)
  expect(config.sources.codex.enabled).toBe(true)
})
