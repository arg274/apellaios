<script lang="ts">
  import { Copy, Download, ExternalLink } from '@lucide/svelte'
  import { BRAND } from '$lib/brand'
  import config from '$lib/config'
  import { configToToml, separateAndSortConfigs, type ConfigEntry } from '$lib/aboutConfig'
  import { getInsights, getServerConfig } from '$lib/api/native'
  import { t } from '$lib/i18n/index.svelte'
  import { activity } from '$lib/state/activity.svelte'
  import { auth } from '$lib/state/auth.svelte'
  import { toast } from '$lib/state/toast.svelte'
  import { ui } from '$lib/state/ui.svelte'
  import { copyText } from '$lib/utils/misc'
  import Button from '$lib/components/ui/Button.svelte'
  import Dialog from '$lib/components/ui/Dialog.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import Tabs from '$lib/components/ui/Tabs.svelte'

  const LINKS: [string, string][] = [
    ['homepage', 'navidrome.org'],
    ['source', 'github.com/navidrome/navidrome'],
    ['bugReports', 'github.com/navidrome/navidrome/issues/new/choose'],
    ['featureRequests', 'github.com/navidrome/navidrome/discussions/new'],
  ]

  const showConfig = $derived(auth.isAdmin && config.devUIShowConfig)
  let tab = $state('about')

  let insights = $state<string | null>(null)
  let serverConfig = $state<{ config: Record<string, unknown> } | null>(null)
  let configError = $state('')

  // Load on open; the config tab only for admins
  $effect(() => {
    if (!ui.about) return
    if (auth.isAdmin) {
      getInsights()
        .then((r) => (insights = r?.lastRun ?? null))
        .catch(() => (insights = null))
    }
    if (showConfig) {
      getServerConfig()
        .then((r) => (serverConfig = r))
        .catch((e) => (configError = (e as Error).message))
    }
  })

  const insightsStatus = $derived(
    insights === 'disabled'
      ? t('about.links.insights.disabled')
      : insights?.startsWith('1969-12-31')
        ? t('about.links.insights.waiting')
        : (insights ?? 'N/A'),
  )

  const configs = $derived(serverConfig ? separateAndSortConfigs(serverConfig.config) : null)
  const configFile = $derived(
    (serverConfig?.config as { ConfigFile?: string } | undefined)?.ConfigFile,
  )

  const serverVersion = $derived(activity.serverStart.version ?? config.version)

  async function exportToml() {
    if (!serverConfig) return
    const ok = await copyText(configToToml(serverConfig, t))
    if (ok) toast.success(t('about.config.exportSuccess'))
    else toast.error(t('about.config.exportFailed'))
  }

  function downloadToml() {
    if (!serverConfig) return
    const blob = new Blob([configToToml(serverConfig, t)], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'navidrome.toml'
    a.click()
    URL.revokeObjectURL(url)
  }
</script>

{#snippet configTable(rows: ConfigEntry[])}
  <table class="w-full text-callout">
    <tbody>
      {#each rows as row (row.key)}
        <tr class="border-b border-divider align-top">
          <td class="py-1.5 pr-3 font-mono text-label">{row.key}</td>
          <td class="py-1.5 pr-3 font-mono text-label-3">{row.envVar}</td>
          <td class="py-1.5 font-mono break-all text-label-2">{row.value}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{/snippet}

<Dialog bind:open={ui.about} title={BRAND} size={tab === 'config' ? 'xl' : 'md'}>
  <Tabs
    bind:value={tab}
    tabs={[
      { value: 'about', label: t('about.tabs.about') },
      ...(showConfig ? [{ value: 'config', label: t('about.tabs.config') }] : []),
    ]}
  >
    {#snippet panel(value)}
      {#if value === 'about'}
        <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-body">
          <dt class="text-label-2">{t('menu.version')}</dt>
          <dd class="font-mono text-label">{serverVersion}</dd>
          {#if serverVersion !== config.version}
            <dt class="text-label-2">UI</dt>
            <dd class="font-mono text-label">{config.version}</dd>
          {/if}
          {#each LINKS as [key, url] (key)}
            <dt class="text-label-2">{t(`about.links.${key}`, { _: key })}</dt>
            <dd>
              <a
                href="https://{url}"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-accent hover:underline"
              >
                {url}<ExternalLink class="size-3" />
              </a>
            </dd>
          {/each}
          {#if auth.isAdmin}
            <dt class="text-label-2">{t('about.links.lastInsightsCollection')}</dt>
            <dd>
              <a
                href="https://navidrome.org/docs/getting-started/insights"
                target="_blank"
                rel="noopener noreferrer"
                class="text-accent hover:underline"
              >
                {insightsStatus}
              </a>
            </dd>
          {/if}
        </dl>
      {:else if value === 'config'}
        {#if configError}
          <p class="text-danger">{configError}</p>
        {:else if !configs}
          <div class="flex justify-center py-10"><Spinner /></div>
        {:else}
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onclick={exportToml}
              ><Copy />{t('about.config.exportToml')}</Button
            >
            <Button size="sm" variant="secondary" onclick={downloadToml}
              ><Download />{t('about.config.downloadToml')}</Button
            >
            {#if configFile}
              <span class="ml-auto font-mono text-callout text-label-2"
                >{t('about.config.configurationFile')}: {configFile}</span
              >
            {/if}
          </div>
          <div class="max-h-[55vh] overflow-auto">
            {@render configTable(configs.regularConfigs)}
            {#if configs.devConfigs.length}
              <h3 class="mt-5 mb-1 text-body font-semibold text-label">
                🚧 {t('about.config.devFlagsHeader')}
              </h3>
              {@render configTable(configs.devConfigs)}
            {/if}
          </div>
        {/if}
      {/if}
    {/snippet}
  </Tabs>
</Dialog>
