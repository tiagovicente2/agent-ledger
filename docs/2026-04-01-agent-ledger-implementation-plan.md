# Agent Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Bun/TypeScript monorepo with an OpenTUI dashboard and a reusable local service layer that discovers Claude, Gemini, and OpenCode usage data, normalizes token/session usage, estimates cost, and exposes a stable object model for the app.

**Architecture:** `packages/service` owns discovery, adapters, normalization, aggregation, pricing, and cache logic. `apps/tui` consumes that service directly and renders a read-only dashboard. A local JSON cache speeds reloads, but source files remain authoritative and the cache is rebuilt whenever fingerprints change.

**Tech Stack:** Bun workspaces, TypeScript, `@opentui/react`, `@opentui/core`, React, Bun test, `bun:sqlite`

---

## File Structure

**Create**
- `package.json`
- `tsconfig.base.json`
- `README.md`
- `apps/tui/package.json`
- `apps/tui/tsconfig.json`
- `apps/tui/src/main.tsx`
- `apps/tui/src/app.tsx`
- `apps/tui/src/hooks/use-dashboard-state.ts`
- `apps/tui/src/components/header.tsx`
- `apps/tui/src/components/source-status-pane.tsx`
- `apps/tui/src/components/summary-pane.tsx`
- `apps/tui/src/components/session-list-pane.tsx`
- `apps/tui/src/components/warnings-pane.tsx`
- `packages/service/package.json`
- `packages/service/tsconfig.json`
- `packages/service/src/index.ts`
- `packages/service/src/types.ts`
- `packages/service/src/config.ts`
- `packages/service/src/discovery.ts`
- `packages/service/src/fingerprints.ts`
- `packages/service/src/cache-store.ts`
- `packages/service/src/pricing.ts`
- `packages/service/src/adapters/claude.ts`
- `packages/service/src/adapters/gemini.ts`
- `packages/service/src/adapters/opencode.ts`
- `packages/service/src/adapters/codex.ts`
- `packages/service/src/normalize.ts`
- `packages/service/src/aggregate.ts`
- `packages/service/src/load-snapshot.ts`
- `packages/service/test/config.test.ts`
- `packages/service/test/pricing.test.ts`
- `packages/service/test/aggregate.test.ts`
- `packages/service/test/adapters/claude.test.ts`
- `packages/service/test/adapters/gemini.test.ts`
- `packages/service/test/adapters/opencode.test.ts`
- `packages/service/test/fixtures/claude/session.jsonl`
- `packages/service/test/fixtures/gemini/session.json`

### Task 1: Scaffold the Bun Monorepo

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `README.md`
- Create: `apps/tui/package.json`
- Create: `apps/tui/tsconfig.json`
- Create: `packages/service/package.json`
- Create: `packages/service/tsconfig.json`

- [ ] **Step 1: Write the failing workspace smoke test**

```ts
// packages/service/test/config.test.ts
import { expect, test } from "bun:test"
import { getDefaultConfig } from "../src/config"

test("default config includes known agent sources", () => {
  const config = getDefaultConfig()

  expect(config.sources.claude.enabled).toBe(true)
  expect(config.sources.gemini.enabled).toBe(true)
  expect(config.sources.opencode.enabled).toBe(true)
  expect(config.sources.codex.enabled).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/service/test/config.test.ts`
Expected: FAIL with module-not-found errors for `../src/config`

- [ ] **Step 3: Write minimal workspace files**

```json
// package.json
{
  "name": "agent-ledger",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:tui": "bun --cwd apps/tui run src/main.tsx",
    "test": "bun test",
    "typecheck": "bunx tsc -b apps/tui packages/service"
  }
}
```

```json
// apps/tui/package.json
{
  "name": "@agent-ledger/tui",
  "private": true,
  "type": "module",
  "dependencies": {
    "@agent-ledger/service": "workspace:*",
    "@opentui/core": "^0.1.92",
    "@opentui/react": "^0.1.92",
    "react": "^19.0.0"
  }
}
```

```json
// packages/service/package.json
{
  "name": "@agent-ledger/service",
  "private": true,
  "type": "module"
}
```

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noEmit": true
  }
}
```

```json
// apps/tui/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ESNext", "DOM"],
    "jsx": "react-jsx",
    "jsxImportSource": "@opentui/react"
  },
  "include": ["src"]
}
```

```json
// packages/service/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ESNext"]
  },
  "include": ["src", "test"]
}
```

```ts
// packages/service/src/config.ts
export function getDefaultConfig() {
  return {
    sources: {
      claude: { enabled: true },
      gemini: { enabled: true },
      opencode: { enabled: true },
      codex: { enabled: true },
    },
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/service/test/config.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.base.json README.md apps/tui/package.json apps/tui/tsconfig.json packages/service/package.json packages/service/tsconfig.json packages/service/src/config.ts packages/service/test/config.test.ts
git commit -m "chore: scaffold bun monorepo"
```

### Task 2: Define the Canonical Model, Pricing, and Cache Contracts

**Files:**
- Create: `packages/service/src/types.ts`
- Create: `packages/service/src/pricing.ts`
- Create: `packages/service/src/fingerprints.ts`
- Create: `packages/service/src/cache-store.ts`
- Create: `packages/service/test/pricing.test.ts`

- [ ] **Step 1: Write the failing pricing and cache tests**

```ts
// packages/service/test/pricing.test.ts
import { expect, test } from "bun:test"
import { estimateCost, mergePricingCatalog } from "../src/pricing"

test("estimateCost uses per-million token rates", () => {
  const result = estimateCost(
    {
      input: 1000,
      output: 500,
      reasoning: 0,
      cacheRead: 200,
      cacheWrite: 0,
      total: 1700,
    },
    {
      provider: "anthropic",
      model: "claude-sonnet",
      currency: "USD",
      inputPerMillion: 3,
      outputPerMillion: 15,
      reasoningPerMillion: 0,
      cacheReadPerMillion: 0.3,
      cacheWritePerMillion: 0,
      source: "builtin",
    },
  )

  expect(result.usd).toBeCloseTo(0.01056, 5)
})

test("local overrides replace builtin pricing by provider and model", () => {
  const merged = mergePricingCatalog(
    [{ provider: "openai", model: "gpt-4.1", inputPerMillion: 2, outputPerMillion: 8, reasoningPerMillion: 0, cacheReadPerMillion: 0, cacheWritePerMillion: 0, currency: "USD", source: "builtin" }],
    [{ provider: "openai", model: "gpt-4.1", inputPerMillion: 3, outputPerMillion: 9, reasoningPerMillion: 0, cacheReadPerMillion: 0, cacheWritePerMillion: 0, currency: "USD", source: "local_override" }],
  )

  expect(merged[0].inputPerMillion).toBe(3)
  expect(merged[0].source).toBe("local_override")
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/service/test/pricing.test.ts`
Expected: FAIL with missing exports

- [ ] **Step 3: Write the core domain contracts**

```ts
// packages/service/src/types.ts
export type AgentName = "claude" | "gemini" | "opencode" | "codex"
export type SourceStatus = "ready" | "partial" | "not_detected" | "error"
export type SupportLevel = "exact" | "heuristic" | "unavailable"

export interface TokenTotals {
  input: number
  output: number
  reasoning: number
  cacheRead: number
  cacheWrite: number
  total: number
}

export interface PricingEntry {
  provider: string
  model: string
  currency: "USD"
  inputPerMillion: number
  outputPerMillion: number
  reasoningPerMillion: number
  cacheReadPerMillion: number
  cacheWritePerMillion: number
  source: "builtin" | "local_override"
}

export interface UsageMessage {
  id: string
  sessionId: string
  agent: AgentName
  model: string | null
  timestamp: string
  role: string
  tokens: TokenTotals
  costEstimateUsd: number | null
  rawRef: string
}

export interface UsageSession {
  id: string
  agent: AgentName
  nativeSessionId: string | null
  projectPath: string | null
  startedAt: string
  endedAt: string
  messageCount: number
  modelsUsed: string[]
  tokenTotals: TokenTotals
  estimatedCostUsd: number | null
  confidence: "exact" | "inferred"
  inferenceReason: string | null
}

export interface SourceState {
  agent: AgentName
  status: SourceStatus
  supportLevel: SupportLevel
  discoveredPaths: string[]
  warnings: string[]
}

export interface SummarySnapshot {
  generatedAt: string
  sources: SourceState[]
  sessions: UsageSession[]
  totals: {
    totalTokens: number
    totalEstimatedCostUsd: number | null
    sessionsCount: number
  }
  warnings: string[]
}
```

```ts
// packages/service/src/pricing.ts
import type { PricingEntry, TokenTotals } from "./types"

export function mergePricingCatalog(
  builtin: PricingEntry[],
  overrides: PricingEntry[],
): PricingEntry[] {
  const byKey = new Map<string, PricingEntry>()
  for (const entry of builtin) byKey.set(`${entry.provider}:${entry.model}`, entry)
  for (const entry of overrides) byKey.set(`${entry.provider}:${entry.model}`, entry)
  return [...byKey.values()]
}

export function estimateCost(tokens: TokenTotals, pricing: PricingEntry) {
  const usd =
    (tokens.input / 1_000_000) * pricing.inputPerMillion +
    (tokens.output / 1_000_000) * pricing.outputPerMillion +
    (tokens.reasoning / 1_000_000) * pricing.reasoningPerMillion +
    (tokens.cacheRead / 1_000_000) * pricing.cacheReadPerMillion +
    (tokens.cacheWrite / 1_000_000) * pricing.cacheWritePerMillion

  return { usd }
}
```

```ts
// packages/service/src/fingerprints.ts
export interface SourceFingerprint {
  path: string
  size: number
  mtimeMs: number
}
```

```ts
// packages/service/src/cache-store.ts
import type { SummarySnapshot } from "./types"

export interface CachePayload {
  fingerprints: Record<string, unknown>
  snapshot: SummarySnapshot
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/service/test/pricing.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/service/src/types.ts packages/service/src/pricing.ts packages/service/src/fingerprints.ts packages/service/src/cache-store.ts packages/service/test/pricing.test.ts
git commit -m "feat: add domain and pricing contracts"
```

### Task 3: Implement Discovery, Source Fingerprinting, and Config Loading

**Files:**
- Modify: `packages/service/src/config.ts`
- Create: `packages/service/src/discovery.ts`
- Modify: `packages/service/src/fingerprints.ts`
- Modify: `packages/service/src/cache-store.ts`

- [ ] **Step 1: Write the failing discovery tests**

```ts
// packages/service/test/config.test.ts
import { expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { discoverSources } from "../src/discovery"

test("discoverSources finds claude and gemini files by known paths", async () => {
  const root = mkdtempSync(join(tmpdir(), "agent-ledger-"))
  const claudeFile = join(root, ".claude/projects/demo/session.jsonl")
  const geminiFile = join(root, ".gemini/tmp/demo/chats/session-1.json")

  mkdirSync(join(root, ".claude/projects/demo"), { recursive: true })
  mkdirSync(join(root, ".gemini/tmp/demo/chats"), { recursive: true })
  writeFileSync(claudeFile, "{}\n")
  writeFileSync(geminiFile, "{}\n")

  const result = await discoverSources(root)

  expect(result.claude.paths).toContain(claudeFile)
  expect(result.gemini.paths).toContain(geminiFile)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/service/test/config.test.ts`
Expected: FAIL because `discoverSources` does not exist

- [ ] **Step 3: Implement config and discovery**

```ts
// packages/service/src/config.ts
import { homedir } from "node:os"
import { join } from "node:path"

export function getDefaultConfig(home = homedir()) {
  return {
    home,
    pricingOverridePath: join(home, ".config/agent-ledger/pricing.json"),
    cachePath: join(home, ".local/share/agent-ledger/cache/snapshot.json"),
    sources: {
      claude: { enabled: true, root: join(home, ".claude/projects") },
      gemini: { enabled: true, root: join(home, ".gemini/tmp") },
      opencode: { enabled: true, dbPath: join(home, ".local/share/opencode/opencode.db") },
      codex: { enabled: true, roots: [join(home, ".config/Codex"), join(home, ".cache/Codex")] },
    },
  }
}
```

```ts
// packages/service/src/discovery.ts
import { existsSync } from "node:fs"
import { glob } from "node:fs/promises"
import { getDefaultConfig } from "./config"

export async function discoverSources(home?: string) {
  const config = getDefaultConfig(home)
  const claudePaths = existsSync(config.sources.claude.root)
    ? Array.fromAsync(glob("**/*.jsonl", { cwd: config.sources.claude.root, absolute: true }))
    : []
  const geminiPaths = existsSync(config.sources.gemini.root)
    ? Array.fromAsync(glob("**/session-*.json", { cwd: config.sources.gemini.root, absolute: true }))
    : []

  return {
    claude: { paths: await claudePaths },
    gemini: { paths: await geminiPaths },
    opencode: { paths: existsSync(config.sources.opencode.dbPath) ? [config.sources.opencode.dbPath] : [] },
    codex: { paths: [] },
  }
}
```

- [ ] **Step 4: Add fingerprint and cache helpers**

```ts
// packages/service/src/fingerprints.ts
import { stat } from "node:fs/promises"

export async function fingerprintFile(path: string) {
  const info = await stat(path)
  return { path, size: info.size, mtimeMs: info.mtimeMs }
}
```

```ts
// packages/service/src/cache-store.ts
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import type { CachePayload } from "./cache-store"

export async function readCache(path: string): Promise<CachePayload | null> {
  try {
    return JSON.parse(await readFile(path, "utf8"))
  } catch {
    return null
  }
}

export async function writeCache(path: string, payload: CachePayload) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(payload, null, 2))
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test packages/service/test/config.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/service/src/config.ts packages/service/src/discovery.ts packages/service/src/fingerprints.ts packages/service/src/cache-store.ts packages/service/test/config.test.ts
git commit -m "feat: add source discovery and cache primitives"
```

### Task 4: Implement Agent Adapters for Claude, Gemini, OpenCode, and Codex Status

**Files:**
- Create: `packages/service/src/adapters/claude.ts`
- Create: `packages/service/src/adapters/gemini.ts`
- Create: `packages/service/src/adapters/opencode.ts`
- Create: `packages/service/src/adapters/codex.ts`
- Create: `packages/service/test/adapters/claude.test.ts`
- Create: `packages/service/test/adapters/gemini.test.ts`
- Create: `packages/service/test/adapters/opencode.test.ts`
- Create: `packages/service/test/fixtures/claude/session.jsonl`
- Create: `packages/service/test/fixtures/gemini/session.json`

- [ ] **Step 1: Write the failing adapter tests**

```ts
// packages/service/test/adapters/claude.test.ts
import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parseClaudeSession } from "../../src/adapters/claude"

test("parseClaudeSession extracts exact token usage rows", () => {
  const content = readFileSync(join(import.meta.dir, "../fixtures/claude/session.jsonl"), "utf8")
  const rows = parseClaudeSession(content, "/tmp/session.jsonl")

  expect(rows.length).toBeGreaterThan(0)
  expect(rows[0]?.agent).toBe("claude")
  expect(rows[0]?.tokens.total).toBeGreaterThan(0)
})
```

```ts
// packages/service/test/adapters/gemini.test.ts
import { expect, test } from "bun:test"
import fixture from "../fixtures/gemini/session.json"
import { parseGeminiSession } from "../../src/adapters/gemini"

test("parseGeminiSession extracts session and usage", () => {
  const rows = parseGeminiSession(fixture as any, "/tmp/session.json")

  expect(rows.length).toBeGreaterThan(0)
  expect(rows[0]?.agent).toBe("gemini")
  expect(rows[0]?.sessionId).toBeTruthy()
})
```

```ts
// packages/service/test/adapters/opencode.test.ts
import { expect, test } from "bun:test"
import { Database } from "bun:sqlite"
import { loadOpenCodeMessages } from "../../src/adapters/opencode"

test("loadOpenCodeMessages reads assistant token totals from sqlite", () => {
  const db = new Database(":memory:")
  db.run("create table message (id text primary key, session_id text, time_created integer, time_updated integer, data text)")
  db.run(
    "insert into message values (?, ?, ?, ?, ?)",
    "msg_1",
    "ses_1",
    1,
    2,
    JSON.stringify({
      role: "assistant",
      providerID: "opencode",
      modelID: "big-pickle",
      path: { cwd: "/tmp/project", root: "/" },
      tokens: { total: 100, input: 20, output: 30, reasoning: 0, cache: { read: 10, write: 40 } },
      time: { created: 1, completed: 2 },
    }),
  )

  const rows = loadOpenCodeMessages(db)

  expect(rows).toHaveLength(1)
  expect(rows[0]?.tokens.total).toBe(100)
  expect(rows[0]?.projectPath).toBe("/tmp/project")
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/service/test/adapters`
Expected: FAIL with missing modules

- [ ] **Step 3: Implement the adapters**

```ts
// packages/service/src/adapters/claude.ts
export function parseClaudeSession(content: string, rawRef: string) {
  return content
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line))
    .filter((row) => row.message?.usage || row.usage)
    .map((row, index) => {
      const usage = row.message?.usage ?? row.usage
      const sessionId = row.sessionId ?? row.conversation_id ?? rawRef
      return {
        id: `${sessionId}:${index}`,
        sessionId,
        agent: "claude" as const,
        model: row.message?.model ?? row.model ?? null,
        timestamp: row.timestamp ?? row.created_at ?? new Date().toISOString(),
        role: row.message?.role ?? row.role ?? "assistant",
        projectPath: row.cwd ?? row.projectPath ?? null,
        tokens: {
          input: usage.input_tokens ?? 0,
          output: usage.output_tokens ?? 0,
          reasoning: usage.reasoning_tokens ?? 0,
          cacheRead: usage.cache_read_input_tokens ?? 0,
          cacheWrite: usage.cache_creation_input_tokens ?? 0,
          total: usage.total_tokens ?? 0,
        },
        rawRef,
      }
    })
}
```

```ts
// packages/service/src/adapters/gemini.ts
export function parseGeminiSession(payload: any, rawRef: string) {
  const sessionId = payload.sessionId ?? payload.id ?? rawRef
  const messages = payload.messages ?? payload.events ?? []

  return messages
    .filter((message: any) => message.usageMetadata)
    .map((message: any, index: number) => ({
      id: `${sessionId}:${index}`,
      sessionId,
      agent: "gemini" as const,
      model: message.model ?? payload.model ?? null,
      timestamp: message.timestamp ?? payload.updatedAt ?? new Date().toISOString(),
      role: message.role ?? "assistant",
      projectPath: payload.cwd ?? null,
      tokens: {
        input: message.usageMetadata.promptTokenCount ?? 0,
        output: message.usageMetadata.candidatesTokenCount ?? 0,
        reasoning: message.usageMetadata.thoughtsTokenCount ?? 0,
        cacheRead: message.usageMetadata.cachedContentTokenCount ?? 0,
        cacheWrite: 0,
        total: message.usageMetadata.totalTokenCount ?? 0,
      },
      rawRef,
    }))
}
```

```ts
// packages/service/src/adapters/opencode.ts
import type { Database } from "bun:sqlite"

export function loadOpenCodeMessages(db: Database) {
  const query = db.query("select session_id, data from message where json_extract(data, '$.role') = 'assistant'")
  return query.all().map((row: any, index: number) => {
    const data = JSON.parse(row.data)
    return {
      id: data.id ?? `opencode:${index}`,
      sessionId: row.session_id,
      agent: "opencode" as const,
      model: data.modelID ?? null,
      timestamp: new Date(data.time?.completed ?? data.time?.created ?? Date.now()).toISOString(),
      role: data.role,
      projectPath: data.path?.cwd ?? null,
      tokens: {
        input: data.tokens?.input ?? 0,
        output: data.tokens?.output ?? 0,
        reasoning: data.tokens?.reasoning ?? 0,
        cacheRead: data.tokens?.cache?.read ?? 0,
        cacheWrite: data.tokens?.cache?.write ?? 0,
        total: data.tokens?.total ?? 0,
      },
      rawRef: "opencode.db",
    }
  })
}
```

```ts
// packages/service/src/adapters/codex.ts
export function getCodexStatus(paths: string[]) {
  return paths.length === 0
    ? { agent: "codex" as const, status: "not_detected" as const, supportLevel: "unavailable" as const, discoveredPaths: [], warnings: [] }
    : { agent: "codex" as const, status: "partial" as const, supportLevel: "unavailable" as const, discoveredPaths: paths, warnings: ["Codex parser not implemented yet"] }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/service/test/adapters`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/service/src/adapters packages/service/test/adapters packages/service/test/fixtures
git commit -m "feat: add local usage adapters"
```

### Task 5: Normalize Records, Aggregate Sessions, and Build the Hybrid Cache Snapshot

**Files:**
- Create: `packages/service/src/normalize.ts`
- Create: `packages/service/src/aggregate.ts`
- Create: `packages/service/src/load-snapshot.ts`
- Create: `packages/service/test/aggregate.test.ts`
- Modify: `packages/service/src/index.ts`

- [ ] **Step 1: Write the failing snapshot test**

```ts
// packages/service/test/aggregate.test.ts
import { expect, test } from "bun:test"
import { buildSessions, buildSummarySnapshot } from "../src/aggregate"

test("buildSessions groups messages by native session id", () => {
  const sessions = buildSessions([
    {
      id: "m1",
      sessionId: "s1",
      agent: "claude",
      model: "claude-sonnet",
      timestamp: "2026-04-01T10:00:00.000Z",
      role: "assistant",
      tokens: { input: 10, output: 20, reasoning: 0, cacheRead: 0, cacheWrite: 0, total: 30 },
      costEstimateUsd: 0.001,
      rawRef: "a",
    },
    {
      id: "m2",
      sessionId: "s1",
      agent: "claude",
      model: "claude-sonnet",
      timestamp: "2026-04-01T10:05:00.000Z",
      role: "assistant",
      tokens: { input: 5, output: 10, reasoning: 0, cacheRead: 0, cacheWrite: 0, total: 15 },
      costEstimateUsd: 0.0005,
      rawRef: "b",
    },
  ])

  expect(sessions).toHaveLength(1)
  expect(sessions[0]?.tokenTotals.total).toBe(45)
  expect(sessions[0]?.messageCount).toBe(2)
})

test("buildSummarySnapshot preserves source warnings", () => {
  const snapshot = buildSummarySnapshot([], [
    { agent: "codex", status: "not_detected", supportLevel: "unavailable", discoveredPaths: [], warnings: ["not installed"] },
  ])

  expect(snapshot.sources[0]?.status).toBe("not_detected")
  expect(snapshot.warnings).toContain("not installed")
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/service/test/aggregate.test.ts`
Expected: FAIL with missing functions

- [ ] **Step 3: Implement normalization and aggregation**

```ts
// packages/service/src/normalize.ts
import type { PricingEntry, UsageMessage } from "./types"
import { estimateCost } from "./pricing"

export function attachPricing(messages: Omit<UsageMessage, "costEstimateUsd">[], pricing: PricingEntry[]) {
  return messages.map((message) => {
    const match = pricing.find((entry) => entry.model === message.model)
    return {
      ...message,
      costEstimateUsd: match ? estimateCost(message.tokens, match).usd : null,
    }
  })
}
```

```ts
// packages/service/src/aggregate.ts
import type { SourceState, SummarySnapshot, UsageMessage, UsageSession } from "./types"

function emptyTotals() {
  return { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
}

export function buildSessions(messages: UsageMessage[]): UsageSession[] {
  const groups = new Map<string, UsageMessage[]>()

  for (const message of messages) {
    const bucket = groups.get(message.sessionId) ?? []
    bucket.push(message)
    groups.set(message.sessionId, bucket)
  }

  return [...groups.entries()].map(([sessionId, bucket]) => {
    const sorted = bucket.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    const totals = sorted.reduce((acc, message) => ({
      input: acc.input + message.tokens.input,
      output: acc.output + message.tokens.output,
      reasoning: acc.reasoning + message.tokens.reasoning,
      cacheRead: acc.cacheRead + message.tokens.cacheRead,
      cacheWrite: acc.cacheWrite + message.tokens.cacheWrite,
      total: acc.total + message.tokens.total,
    }), emptyTotals())

    const costs = sorted.map((message) => message.costEstimateUsd).filter((value): value is number => value !== null)

    return {
      id: sessionId,
      agent: sorted[0]!.agent,
      nativeSessionId: sessionId,
      projectPath: null,
      startedAt: sorted[0]!.timestamp,
      endedAt: sorted.at(-1)!.timestamp,
      messageCount: sorted.length,
      modelsUsed: [...new Set(sorted.map((message) => message.model).filter(Boolean))] as string[],
      tokenTotals: totals,
      estimatedCostUsd: costs.length === sorted.length ? costs.reduce((sum, value) => sum + value, 0) : null,
      confidence: "exact" as const,
      inferenceReason: null,
    }
  })
}

export function buildSummarySnapshot(messages: UsageMessage[], sources: SourceState[]): SummarySnapshot {
  const sessions = buildSessions(messages)
  const pricedSessions = sessions.filter((session) => session.estimatedCostUsd !== null)

  return {
    generatedAt: new Date().toISOString(),
    sources,
    sessions,
    totals: {
      totalTokens: sessions.reduce((sum, session) => sum + session.tokenTotals.total, 0),
      totalEstimatedCostUsd:
        pricedSessions.length === sessions.length
          ? pricedSessions.reduce((sum, session) => sum + (session.estimatedCostUsd ?? 0), 0)
          : null,
      sessionsCount: sessions.length,
    },
    warnings: sources.flatMap((source) => source.warnings),
  }
}
```

```ts
// packages/service/src/load-snapshot.ts
import { readFile } from "node:fs/promises"
import { Database } from "bun:sqlite"
import { discoverSources } from "./discovery"
import { readCache, writeCache } from "./cache-store"
import { buildSummarySnapshot } from "./aggregate"
import { parseClaudeSession } from "./adapters/claude"
import { parseGeminiSession } from "./adapters/gemini"
import { loadOpenCodeMessages } from "./adapters/opencode"
import { getCodexStatus } from "./adapters/codex"

export async function loadSnapshot(home?: string) {
  const discovered = await discoverSources(home)
  const messages = []

  for (const path of discovered.claude.paths) {
    messages.push(...parseClaudeSession(await readFile(path, "utf8"), path))
  }

  for (const path of discovered.gemini.paths) {
    messages.push(...parseGeminiSession(JSON.parse(await readFile(path, "utf8")), path))
  }

  if (discovered.opencode.paths[0]) {
    const db = new Database(discovered.opencode.paths[0], { readonly: true })
    messages.push(...loadOpenCodeMessages(db))
    db.close()
  }

  const sources = [
    { agent: "claude", status: discovered.claude.paths.length ? "ready" : "not_detected", supportLevel: "exact", discoveredPaths: discovered.claude.paths, warnings: [] },
    { agent: "gemini", status: discovered.gemini.paths.length ? "ready" : "not_detected", supportLevel: "exact", discoveredPaths: discovered.gemini.paths, warnings: [] },
    { agent: "opencode", status: discovered.opencode.paths.length ? "ready" : "not_detected", supportLevel: "exact", discoveredPaths: discovered.opencode.paths, warnings: [] },
    getCodexStatus(discovered.codex.paths),
  ]

  return buildSummarySnapshot(messages, sources)
}
```

```ts
// packages/service/src/index.ts
export { loadSnapshot } from "./load-snapshot"
export type * from "./types"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/service/test/aggregate.test.ts`
Expected: PASS

- [ ] **Step 5: Run the full service test suite**

Run: `bun test packages/service/test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/service/src/index.ts packages/service/src/normalize.ts packages/service/src/aggregate.ts packages/service/src/load-snapshot.ts packages/service/test/aggregate.test.ts
git commit -m "feat: build normalized snapshot pipeline"
```

### Task 6: Build the OpenTUI Dashboard

**Files:**
- Create: `apps/tui/src/main.tsx`
- Create: `apps/tui/src/app.tsx`
- Create: `apps/tui/src/hooks/use-dashboard-state.ts`
- Create: `apps/tui/src/components/header.tsx`
- Create: `apps/tui/src/components/source-status-pane.tsx`
- Create: `apps/tui/src/components/summary-pane.tsx`
- Create: `apps/tui/src/components/session-list-pane.tsx`
- Create: `apps/tui/src/components/warnings-pane.tsx`

- [ ] **Step 1: Write the failing TUI smoke test as a pure view-model test**

```ts
// packages/service/test/config.test.ts
import { expect, test } from "bun:test"
import { formatUsd } from "../../apps/tui/src/hooks/use-dashboard-state"

test("formatUsd returns placeholder for unresolved cost", () => {
  expect(formatUsd(null)).toBe("n/a")
  expect(formatUsd(1.234)).toBe("$1.23")
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/service/test/config.test.ts`
Expected: FAIL because `formatUsd` does not exist

- [ ] **Step 3: Implement the TUI entry and dashboard**

```tsx
// apps/tui/src/main.tsx
import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { App } from "./app"

const renderer = await createCliRenderer({ exitOnCtrlC: true })
createRoot(renderer).render(<App />)
```

```tsx
// apps/tui/src/hooks/use-dashboard-state.ts
import { useEffect, useState } from "react"
import { loadSnapshot, type SummarySnapshot } from "@agent-ledger/service"

export function formatUsd(value: number | null) {
  return value === null ? "n/a" : `$${value.toFixed(2)}`
}

export function useDashboardState() {
  const [snapshot, setSnapshot] = useState<SummarySnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    try {
      setSnapshot(await loadSnapshot())
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unknown refresh error")
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  return { snapshot, error, refresh }
}
```

```tsx
// apps/tui/src/app.tsx
import { useKeyboard } from "@opentui/react"
import { Header } from "./components/header"
import { SummaryPane } from "./components/summary-pane"
import { SourceStatusPane } from "./components/source-status-pane"
import { SessionListPane } from "./components/session-list-pane"
import { WarningsPane } from "./components/warnings-pane"
import { useDashboardState } from "./hooks/use-dashboard-state"

export function App() {
  const { snapshot, error, refresh } = useDashboardState()

  useKeyboard((key) => {
    if (key.name === "r") void refresh()
    if (key.name === "q") process.exit(0)
  })

  return (
    <box style={{ flexDirection: "column", padding: 1, gap: 1 }}>
      <Header />
      {error ? <text fg="red">{error}</text> : null}
      {snapshot ? (
        <>
          <SummaryPane snapshot={snapshot} />
          <SourceStatusPane sources={snapshot.sources} />
          <SessionListPane sessions={snapshot.sessions.slice(0, 20)} />
          <WarningsPane warnings={snapshot.warnings} />
        </>
      ) : (
        <text>Loading...</text>
      )}
    </box>
  )
}
```

- [ ] **Step 4: Fill in the presentational components**

```tsx
// apps/tui/src/components/header.tsx
export function Header() {
  return <text fg="#7dd3fc">Agent Ledger  r refresh  q quit</text>
}
```

```tsx
// apps/tui/src/components/summary-pane.tsx
import type { SummarySnapshot } from "@agent-ledger/service"
import { formatUsd } from "../hooks/use-dashboard-state"

export function SummaryPane({ snapshot }: { snapshot: SummarySnapshot }) {
  return (
    <box style={{ border: true, padding: 1, flexDirection: "column" }}>
      <text>Total tokens: {String(snapshot.totals.totalTokens)}</text>
      <text>Total estimated cost: {formatUsd(snapshot.totals.totalEstimatedCostUsd)}</text>
      <text>Sessions: {String(snapshot.totals.sessionsCount)}</text>
    </box>
  )
}
```

```tsx
// apps/tui/src/components/source-status-pane.tsx
import type { SourceState } from "@agent-ledger/service"

export function SourceStatusPane({ sources }: { sources: SourceState[] }) {
  return (
    <box style={{ border: true, padding: 1, flexDirection: "column" }}>
      {sources.map((source) => (
        <text key={source.agent}>
          {source.agent}: {source.status} ({source.supportLevel})
        </text>
      ))}
    </box>
  )
}
```

```tsx
// apps/tui/src/components/session-list-pane.tsx
import type { UsageSession } from "@agent-ledger/service"
import { formatUsd } from "../hooks/use-dashboard-state"

export function SessionListPane({ sessions }: { sessions: UsageSession[] }) {
  return (
    <box style={{ border: true, padding: 1, flexDirection: "column" }}>
      {sessions.map((session) => (
        <text key={session.id}>
          {session.agent} {session.id} {String(session.tokenTotals.total)} tokens {formatUsd(session.estimatedCostUsd)}
        </text>
      ))}
    </box>
  )
}
```

```tsx
// apps/tui/src/components/warnings-pane.tsx
export function WarningsPane({ warnings }: { warnings: string[] }) {
  return (
    <box style={{ border: true, padding: 1, flexDirection: "column" }}>
      {warnings.length === 0 ? <text>No warnings</text> : warnings.map((warning, index) => <text key={index} fg="yellow">{warning}</text>)}
    </box>
  )
}
```

- [ ] **Step 5: Run tests and the TUI manually**

Run: `bun test`
Expected: PASS

Run: `bun run dev:tui`
Expected: TUI opens, shows discovered sources, totals, recent sessions, and `codex: not_detected`

- [ ] **Step 6: Commit**

```bash
git add apps/tui/src packages/service/test/config.test.ts
git commit -m "feat: add opentui usage dashboard"
```

### Task 7: Add Cache-Aware Loading, Pricing Overrides, and Final Verification

**Files:**
- Modify: `packages/service/src/load-snapshot.ts`
- Modify: `packages/service/src/cache-store.ts`
- Modify: `packages/service/src/pricing.ts`
- Modify: `README.md`

- [ ] **Step 1: Write the failing cache reuse test**

```ts
// packages/service/test/aggregate.test.ts
import { expect, test } from "bun:test"
import { shouldReuseCache } from "../src/cache-store"

test("shouldReuseCache returns true when fingerprints match", () => {
  expect(
    shouldReuseCache(
      [{ path: "/tmp/a", size: 1, mtimeMs: 2 }],
      [{ path: "/tmp/a", size: 1, mtimeMs: 2 }],
    ),
  ).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/service/test/aggregate.test.ts`
Expected: FAIL because `shouldReuseCache` does not exist

- [ ] **Step 3: Implement cache reuse and pricing override loading**

```ts
// packages/service/src/cache-store.ts
import type { SourceFingerprint } from "./fingerprints"

export function shouldReuseCache(current: SourceFingerprint[], cached: SourceFingerprint[]) {
  if (current.length !== cached.length) return false

  const left = [...current].sort((a, b) => a.path.localeCompare(b.path))
  const right = [...cached].sort((a, b) => a.path.localeCompare(b.path))

  return left.every((entry, index) => {
    const other = right[index]
    return other && entry.path === other.path && entry.size === other.size && entry.mtimeMs === other.mtimeMs
  })
}
```

```ts
// packages/service/src/pricing.ts
import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { getDefaultConfig } from "./config"

export async function loadPricingCatalog(home?: string) {
  const config = getDefaultConfig(home)
  const builtin = [
    { provider: "anthropic", model: "claude-sonnet", currency: "USD", inputPerMillion: 3, outputPerMillion: 15, reasoningPerMillion: 0, cacheReadPerMillion: 0.3, cacheWritePerMillion: 3.75, source: "builtin" as const },
    { provider: "google", model: "gemini-2.5-pro", currency: "USD", inputPerMillion: 1.25, outputPerMillion: 10, reasoningPerMillion: 0, cacheReadPerMillion: 0, cacheWritePerMillion: 0, source: "builtin" as const },
  ]

  if (!existsSync(config.pricingOverridePath)) return builtin
  const overrides = JSON.parse(await readFile(config.pricingOverridePath, "utf8"))
  return mergePricingCatalog(builtin, overrides)
}
```

```ts
// packages/service/src/load-snapshot.ts
// add:
// 1. fingerprint all discovered files
// 2. attempt cache read
// 3. reuse cache when fingerprints match
// 4. otherwise rebuild snapshot and write cache
```

- [ ] **Step 4: Update README with runtime and source assumptions**

```md
# README.md

## Requirements
- Bun installed
- Zig available if OpenTUI native build requires it on your machine

## Supported local sources
- Claude Code: `~/.claude/projects/**/*.jsonl`
- Gemini CLI/App: `~/.gemini/tmp/*/chats/session-*.json`
- OpenCode: `~/.local/share/opencode/opencode.db`
- Codex: detected but not parsed in v1 unless local runtime files are present

## Commands
- `bun install`
- `bun test`
- `bun run dev:tui`
```

- [ ] **Step 5: Run full verification**

Run: `bun install && bun test && bun run typecheck`
Expected: all commands succeed

Run: `bun run dev:tui`
Expected: dashboard renders with live local data and refreshes with `r`

- [ ] **Step 6: Commit**

```bash
git add packages/service/src/load-snapshot.ts packages/service/src/cache-store.ts packages/service/src/pricing.ts README.md
git commit -m "feat: add cache-aware snapshot loading"
```

## Self-Review Notes

Spec coverage:
- local file ingestion: covered by discovery and adapters
- stable object model: covered by `types.ts`, normalization, snapshot builder
- estimated token pricing: covered by pricing catalog and cost calculator
- extensibility for new agents: covered by adapter-per-agent structure and source status model
- hybrid cache: covered by fingerprinting and cache reuse

Potential gaps to watch during implementation:
- Claude/Gemini fixture formats may vary by installed version, so parser tests should include real sanitized samples from this machine
- model-name normalization for pricing lookup may need a dedicated mapping table if native names do not match public pricing names
- OpenCode may emit assistant rows without tokens for some events; filter those out explicitly
