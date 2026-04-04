declare module 'bun:test' {
  export function afterEach(fn: () => void | Promise<void>): void
  export function describe(name: string, fn: () => void | Promise<void>): void
  export function test(name: string, fn: () => void | Promise<void>): void

  export function expect<T>(actual: T): {
    toBe(expected: T): void
    toContain(expected: string): void
    toMatchSnapshot(): void
  }
}
