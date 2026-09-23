// Server configuration display and TOML export for the About dialog

export interface ConfigEntry {
  key: string
  envVar?: string
  value: string
}

type ConfigTree = Record<string, unknown>

const isTree = (v: unknown): v is ConfigTree => !!v && typeof v === 'object' && !Array.isArray(v)

/** Flattens the nested server config into dotted keys, with the matching ND_ environment variable */
export const flattenConfig = (config: unknown, prefix = ''): ConfigEntry[] => {
  if (!isTree(config)) return []
  const result: ConfigEntry[] = []
  for (const key of Object.keys(config)) {
    const value = config[key]
    const currentKey = prefix ? `${prefix}.${key}` : key
    if (isTree(value)) {
      result.push(...flattenConfig(value, currentKey))
    } else {
      result.push({
        key: currentKey,
        envVar: 'ND_' + currentKey.toUpperCase().replace(/\./g, '_'),
        value:
          Array.isArray(value) || (typeof value === 'object' && value !== null)
            ? JSON.stringify(value)
            : String(value),
      })
    }
  }
  return result
}

/** Splits entries into regular and Dev* flags (ConfigFile is shown separately), each sorted */
export const separateAndSortConfigs = (entries: ConfigEntry[] | ConfigTree | null | undefined) => {
  const flattened = Array.isArray(entries) ? entries : flattenConfig(entries)
  const regularConfigs: ConfigEntry[] = []
  const devConfigs: ConfigEntry[] = []
  for (const entry of flattened ?? []) {
    if (entry.key === 'ConfigFile') continue
    if (entry.key.startsWith('Dev')) devConfigs.push(entry)
    else regularConfigs.push(entry)
  }
  regularConfigs.sort((a, b) => a.key.localeCompare(b.key))
  devConfigs.sort((a, b) => a.key.localeCompare(b.key))
  return { regularConfigs, devConfigs }
}

const quote = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

/** Quotes a TOML key unless it is a valid bare key */
export const escapeTomlKey = (key: unknown): string => {
  const keyStr = String(key)
  if (keyStr === '') return '""'
  return /^[a-zA-Z0-9_-]+$/.test(keyStr) ? keyStr : quote(keyStr)
}

/** Renders a config value (always carried as a string) as a TOML value */
export const formatTomlValue = (value: unknown): string => {
  if (value === null || value === undefined) return '""'
  const str = String(value)
  if (str === 'true' || str === 'false') return str
  if (/^-?\d+$/.test(str) || /^-?\d*\.\d+$/.test(str)) return str
  // Durations ("300ms", "1s", "5m") stay strings
  if (/^\d+(\.\d+)?(ns|us|µs|ms|s|m|h)$/.test(str)) return `"${str}"`
  if (str.startsWith('[') || str.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(str)
      if (Array.isArray(parsed)) {
        const items = parsed.map((item: unknown) =>
          typeof item === 'number' || typeof item === 'boolean'
            ? String(item)
            : quote(String(item)),
        )
        return items.length === 0 ? '[ ]' : `[ ${items.join(', ')} ]`
      }
      return `"""${str}"""`
    } catch {
      return quote(str)
    }
  }
  return quote(str)
}

interface KeyValue {
  key: string
  value: string
}

/** Groups dotted keys into [sections] by their first segment */
export const buildTomlSections = (configs: ConfigEntry[]) => {
  const sections: Record<string, KeyValue[]> = {}
  const rootKeys: KeyValue[] = []
  for (const { key, value } of configs) {
    if (key.includes('.')) {
      const [section, ...rest] = key.split('.')
      ;(sections[section] ??= []).push({ key: rest.join('.'), value })
    } else {
      rootKeys.push({ key, value })
    }
  }
  return { sections, rootKeys }
}

const renderSections = (sections: Record<string, KeyValue[]>) =>
  Object.keys(sections)
    .sort()
    .map(
      (name) =>
        `[${name}]\n` +
        sections[name]
          .map(({ key, value }) => `${escapeTomlKey(key)} = ${formatTomlValue(value)}\n`)
          .join('') +
        '\n',
    )
    .join('')

/** The server configuration as a navidrome.toml, dev flags grouped under a comment */
export const configToToml = (
  configData: { config?: ConfigEntry[] | ConfigTree | null },
  translate: (key: string) => string = (key) => key,
): string => {
  let toml = `# Navidrome Configuration\n# Generated on ${new Date().toISOString()}\n\n`
  const configs = Array.isArray(configData.config)
    ? configData.config
    : flattenConfig(configData.config)
  const { regularConfigs, devConfigs } = separateAndSortConfigs(configs)

  const regular = buildTomlSections(regularConfigs)
  if (regular.rootKeys.length > 0) {
    toml +=
      regular.rootKeys.map(({ key, value }) => `${key} = ${formatTomlValue(value)}\n`).join('') +
      '\n'
  }

  if (devConfigs.length > 0) {
    toml += `# ${translate('about.config.devFlagsHeader')}\n`
    toml += `# ${translate('about.config.devFlagsComment')}\n\n`
    const dev = buildTomlSections(devConfigs)
    toml += dev.rootKeys.map(({ key, value }) => `${key} = ${formatTomlValue(value)}\n`).join('')
    if (dev.rootKeys.length > 0) toml += '\n'
    toml += renderSections(dev.sections)
  }

  return toml + renderSections(regular.sections)
}
