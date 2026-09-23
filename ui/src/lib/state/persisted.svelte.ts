const read = (key: string): unknown => {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? undefined : JSON.parse(raw)
  } catch {
    return undefined
  }
}

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: keep working in memory
  }
}

/**
 * A deeply reactive object mirrored to localStorage. Unknown or missing keys fall back to
 * `initial`, so adding a field never needs a migration. `seed` supplies values for a first run
 * (e.g. imported from the legacy UI's storage) and is ignored once the key exists.
 */
export function persisted<T extends object>(key: string, initial: T, seed?: () => Partial<T>): T {
  const stored = read(key)
  const base = stored && typeof stored === 'object' ? (stored as Partial<T>) : (seed?.() ?? {})
  const state = $state<T>({ ...initial, ...base })

  $effect.root(() => {
    $effect(() => {
      write(key, $state.snapshot(state))
    })
  })

  return state
}

/** Reads the legacy React UI's redux snapshot, used to seed first-run settings */
export const legacyState = (): Record<string, unknown> | undefined => {
  const value = read('state')
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined
}
