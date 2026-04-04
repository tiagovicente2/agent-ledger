import { createCliRenderer } from '@opentui/core'
import { createRoot } from '@opentui/react'

import { App } from './app.tsx'

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
