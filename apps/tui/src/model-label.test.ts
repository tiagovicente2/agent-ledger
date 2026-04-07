import { describe, expect, test } from 'bun:test'

import { formatModelLabel } from './model-label.ts'

describe('formatModelLabel', () => {
  test('returns the last slash-delimited segment', () => {
    expect(formatModelLabel('/workspaces/routers/kimi-k2p5-turbo')).toBe('kimi-k2p5-turbo')
  })

  test('keeps simple provider/model ids on the model name', () => {
    expect(formatModelLabel('openai/gpt-5.4')).toBe('gpt-5.4')
  })

  test('keeps unknown unchanged', () => {
    expect(formatModelLabel('unknown')).toBe('unknown')
  })
})
