export function formatModelLabel(value: string) {
  if (value === 'unknown') {
    return value
  }

  const segments = value.split('/').filter((segment) => segment.length > 0)

  if (segments.length === 0) {
    return value
  }

  return segments[segments.length - 1]
}
