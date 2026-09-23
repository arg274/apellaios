import type { Plugin } from '$lib/api/types'
import type { JsonSchema, UiElement } from '$lib/schemaForm/schema'

export interface PluginPermission {
  reason?: string
  requiredHosts?: string[]
  /** library permission: whether the plugin may touch library files */
  filesystem?: boolean
}

export interface PluginManifest {
  name?: string
  author?: string
  version?: string
  description?: string
  website?: string
  permissions?: Record<string, PluginPermission | undefined>
  config?: { schema?: JsonSchema; uiSchema?: UiElement }
}

export function parseManifest(plugin: Pick<Plugin, 'manifest'> | undefined): PluginManifest | null {
  if (!plugin?.manifest) return null
  try {
    return JSON.parse(plugin.manifest) as PluginManifest
  } catch {
    return null
  }
}

/** The plugin stores id lists as JSON strings */
export function parseIds<T>(json: string | undefined): T[] {
  if (!json) return []
  try {
    const ids = JSON.parse(json)
    return Array.isArray(ids) ? ids : []
  } catch {
    return []
  }
}

/**
 * A plugin asking for user or library access can't be enabled until an admin grants some;
 * returns the i18n key explaining what's missing, if anything.
 */
export function missingGrant(plugin: Plugin, manifest: PluginManifest | null): string | null {
  if (manifest?.permissions?.users && !plugin.allUsers && parseIds(plugin.users).length === 0) {
    return 'resources.plugin.actions.disabledUsersRequired'
  }
  if (
    manifest?.permissions?.library &&
    !plugin.allLibraries &&
    parseIds(plugin.libraries).length === 0
  ) {
    return 'resources.plugin.actions.disabledLibrariesRequired'
  }
  return null
}
