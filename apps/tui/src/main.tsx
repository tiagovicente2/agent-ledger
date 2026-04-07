import { createCliRenderer } from '@opentui/core'
import { createRoot } from '@opentui/react'

import { App } from './app.tsx'
import { APP_VERSION, getHelpText } from './version.ts'

const args = Bun.argv.slice(2)

if (args.includes('--help')) {
  console.log(getHelpText())
  process.exit(0)
}

if (args.includes('--version')) {
  console.log(APP_VERSION)
  process.exit(0)
}

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
    onQuit={() => {
      quit()
    }}
  />,
)
