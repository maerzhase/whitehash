/** Small dependency-free equivalents for the runtime's deep-clone/merge needs. */
export function cloneDeep<T>(value: T): T {
  if (value instanceof Uint8Array) return new Uint8Array(value) as T
  if (Array.isArray(value)) return value.map(cloneDeep) as T
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, cloneDeep(child)])
    ) as T
  }
  return value
}

export function mergeRuntime<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>
): T {
  const output = target as Record<string, unknown>
  for (const [key, value] of Object.entries(source)) {
    if (value instanceof Uint8Array) output[key] = new Uint8Array(value)
    else if (Array.isArray(value)) output[key] = value
    else if (value && typeof value === "object") {
      const current = output[key]
      output[key] = mergeRuntime(
        current && typeof current === "object" && !Array.isArray(current)
          ? (current as Record<string, unknown>)
          : {},
        value as Record<string, unknown>
      )
    } else output[key] = value
  }
  return output as T
}
