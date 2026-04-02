interface WarningsPaneProps {
  height: number
  warnings: string[]
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`
}

export function WarningsPane({ height, warnings }: WarningsPaneProps) {
  const visibleWarnings = warnings.slice(0, Math.max(1, height - 3))

  return (
    <box
      style={{
        border: true,
        flexDirection: 'column',
        height,
        width: '50%',
        padding: 1,
      }}
    >
      <text>Warnings</text>
      {visibleWarnings.length === 0 ? <text>No warnings</text> : null}
      {visibleWarnings.map((warning) => (
        <text key={warning}>{truncate(warning, 36)}</text>
      ))}
    </box>
  )
}
