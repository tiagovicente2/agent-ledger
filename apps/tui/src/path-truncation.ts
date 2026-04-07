function truncateKeepEnd(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }

  if (maxLength <= 3) {
    return value.slice(Math.max(0, value.length - maxLength))
  }

  return `...${value.slice(Math.max(0, value.length - (maxLength - 3)))}`
}

export function truncatePathSuffix(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }

  if (maxLength <= 3) {
    return value.slice(Math.max(0, value.length - maxLength))
  }

  const slashIndexes: number[] = []

  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '/') {
      slashIndexes.push(index)
    }
  }

  for (const slashIndex of slashIndexes) {
    const suffix = value.slice(slashIndex)

    if (suffix.length <= maxLength) {
      return suffix
    }
  }

  for (const slashIndex of slashIndexes) {
    if (slashIndex === 0) {
      continue
    }

    const suffix = value.slice(slashIndex)
    const shortened = `...${suffix}`

    if (shortened.length <= maxLength) {
      return shortened
    }
  }

  return truncateKeepEnd(value, maxLength)
}
