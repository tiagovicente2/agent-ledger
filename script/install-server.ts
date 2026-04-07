import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const port = Number(process.env.PORT ?? 3000)
const repo = (process.env.AGENT_LEDGER_REPO ?? 'tiagovicente2/agent-ledger').trim()
const rootDir = fileURLToPath(new URL('..', import.meta.url))
const installScriptPath = join(rootDir, 'install')
const installScriptTemplate = readFileSync(installScriptPath, 'utf8')

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `"'"'`)}'`
}

function buildInstallScript(repoName: string) {
  const shebang = '#!/usr/bin/env bash\n'
  const scriptBody = installScriptTemplate.startsWith(shebang)
    ? installScriptTemplate.slice(shebang.length)
    : installScriptTemplate

  return `${shebang}AGENT_LEDGER_REPO=${shellQuote(repoName)}\nexport AGENT_LEDGER_REPO\n${scriptBody}`
}

const server = Bun.serve({
  port,
  fetch(req) {
    const url = new URL(req.url)

    if (url.pathname === '/healthz') {
      return new Response('ok\n', {
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      })
    }

    if (url.pathname === '/install') {
      return new Response(buildInstallScript(repo), {
        headers: {
          'cache-control': 'no-store',
          'content-type': 'text/x-shellscript; charset=utf-8',
        },
      })
    }

    return new Response(
      ['agent-ledger installer service', '', `curl -fsSL ${url.origin}/install | bash`, ''].join(
        '\n',
      ),
      {
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      },
    )
  },
})

console.log(`installer server listening on http://localhost:${server.port}`)
