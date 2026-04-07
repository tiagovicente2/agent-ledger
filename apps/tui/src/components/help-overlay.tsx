interface HelpOverlayProps {
  height: number
  width: number
}

export function HelpOverlay({ height, width }: HelpOverlayProps) {
  const overlayWidth = Math.max(28, Math.min(width - 4, 70))
  const overlayHeight = 20
  const left = Math.max(0, Math.floor((width - overlayWidth) / 2))
  const top = Math.max(1, Math.floor((height - overlayHeight) / 2))

  return (
    <box
      backgroundColor="black"
      border
      flexDirection="column"
      left={left}
      padding={1}
      position="absolute"
      top={top}
      width={overlayWidth}
      zIndex={20}
    >
      <text>
        <strong>Keyboard Help</strong>
      </text>
      <text>Press Esc, q, or ? to close.</text>
      <text marginTop={1}>
        <strong>Navigation</strong>
      </text>
      <text>1..5 / [ ] switch tabs</text>
      <text>j / k or arrows move the selected session</text>
      <text>t changes the time window</text>
      <text>s changes the sort key, a flips sort order</text>
      <text>r refreshes local runtime sources</text>
      <text>w opens source health and warning details</text>
      <text marginTop={1}>
        <strong>Views</strong>
      </text>
      <text>The status bar shows filter, sort, selection, and refresh state.</text>
      <text marginTop={1}>
        <strong>Exit</strong>
      </text>
      <text>q quits the app, Ctrl+C always quits immediately.</text>
    </box>
  )
}
