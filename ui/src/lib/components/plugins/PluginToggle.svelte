<script lang="ts">
  // Enables or disables a plugin right away. Blocked while the plugin has an error or still
  // needs its user/library grants.
  import { HttpError } from '$lib/api/http'
  import { update } from '$lib/api/rest'
  import type { Plugin } from '$lib/api/types'
  import { t } from '$lib/i18n/index.svelte'
  import { missingGrant, type PluginManifest } from '$lib/plugins'
  import { toast } from '$lib/state/toast.svelte'
  import Switch from '$lib/components/ui/Switch.svelte'
  import Tooltip from '$lib/components/ui/Tooltip.svelte'

  let {
    plugin,
    manifest,
    showLabel = false,
    onchange,
  }: {
    plugin: Plugin
    manifest: PluginManifest | null
    showLabel?: boolean
    onchange?: (plugin: Plugin) => void
  } = $props()

  // Optimistic until the server answers
  let pending = $state<boolean | null>(null)
  const enabled = $derived(pending ?? plugin.enabled)

  const blockedBy = $derived(
    plugin.lastError
      ? 'resources.plugin.actions.disabledDueToError'
      : !plugin.enabled
        ? missingGrant(plugin, manifest)
        : null,
  )
  const actionLabel = $derived(
    t(enabled ? 'resources.plugin.actions.disable' : 'resources.plugin.actions.enable'),
  )

  async function toggle(on: boolean) {
    pending = on
    try {
      const updated = await update('plugin', plugin.id, { enabled: on })
      toast.success(
        t(
          on ? 'resources.plugin.notifications.enabled' : 'resources.plugin.notifications.disabled',
        ),
      )
      onchange?.(updated)
    } catch (err) {
      // A failed enable comes back with the plugin, now carrying its error
      const body =
        err instanceof HttpError ? (err.body as { message?: string; plugin?: Plugin } | null) : null
      toast.warning(body?.message || t('resources.plugin.notifications.error'))
      if (body?.plugin) onchange?.(body.plugin)
    } finally {
      pending = null
    }
  }
</script>

<Tooltip content={blockedBy ? t(blockedBy) : actionLabel}>
  {#snippet trigger(props)}
    <span {...props} class="inline-flex items-center gap-2.5">
      <Switch
        label={actionLabel}
        checked={enabled}
        disabled={pending !== null || !!blockedBy}
        onCheckedChange={toggle}
      />
      {#if showLabel}<span class="text-body text-label">{actionLabel}</span>{/if}
    </span>
  {/snippet}
</Tooltip>
