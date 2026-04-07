import { describe, expect, test } from 'bun:test'

import { truncatePathSuffix } from './path-truncation.ts'

describe('truncatePathSuffix', () => {
  test('returns slash-aligned suffix when it fits without ellipsis', () => {
    expect(truncatePathSuffix('/workspaces/routers/kimi-k2p5-turbo', 24)).toBe(
      '/routers/kimi-k2p5-turbo',
    )
  })

  test('prefers a clean slash-aligned suffix when it still fits', () => {
    expect(truncatePathSuffix('/workspaces/routers/kimi-k2p5-turbo', 19)).toBe('/kimi-k2p5-turbo')
  })

  test('falls back to generic end truncation when no slash suffix fits', () => {
    expect(truncatePathSuffix('/workspaces/routers/kimi-k2p5-turbo', 10)).toBe('...5-turbo')
  })
})
