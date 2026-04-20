import { createCliRenderer } from '@opentui/core'
import { createRoot } from '@opentui/react'

import { App } from './app.tsx'
import { APP_VERSION, getHelpText } from './version.ts'

interface CliOptions {
  mode: 'live' | 'demo' | 'file'
  snapshotPath: string | null
}

function parseCliOptions(args: string[]): CliOptions {
  let mode: CliOptions['mode'] = 'live'
  let snapshotPath: string | null = null

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index]

    if (value === '--demo') {
      mode = 'demo'
      continue
    }

    if (value === '--snapshot') {
      snapshotPath = args[index + 1] ?? null
      mode = 'file'
      index += 1
    }
  }

  if (mode === 'file' && !snapshotPath) {
    throw new Error('Missing path after --snapshot')
  }

  return {
    mode,
    snapshotPath,
  }
}

const args = Bun.argv.slice(2)

if (args.includes('--help')) {
  console.log(getHelpText())
  process.exit(0)
}

if (args.includes('--version')) {
  console.log(APP_VERSION)
  process.exit(0)
}

const options = parseCliOptions(args)

const renderer = await createCliRenderer({
  exitOnCtrlC: false,
  useMouse: false,
  enableMouseMovement: false,
  useKittyKeyboard: null,
})

const root = createRoot(renderer)
let hasQuit = false

function quit() {
  if (hasQuit) {
    return
  }

  hasQuit = true

  try {
    root.unmount()
  } finally {
    renderer.destroy()
  }
}

root.render(
  <App
    mode={options.mode}
    onQuit={() => {
      quit()
    }}
    snapshotPath={options.snapshotPath}
  />,
)
