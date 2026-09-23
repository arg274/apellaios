<script lang="ts">
  import { CircleAlert, Puzzle, RefreshCw } from '@lucide/svelte'
  import { rescanPlugins } from '$lib/api/native'
  import type { Plugin } from '$lib/api/types'
  import { ListController, UrlListParams } from '$lib/data.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import { parseManifest } from '$lib/plugins'
  import { toast } from '$lib/state/toast.svelte'
  import { formatDateTime } from '$lib/utils/formatters'
  import PageHeader from '$lib/components/layout/PageHeader.svelte'
  import PluginToggle from '$lib/components/plugins/PluginToggle.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import DataTable from '$lib/components/ui/DataTable.svelte'
  import type { DataColumn } from '$lib/components/ui/dataTable'
  import EmptyState from '$lib/components/ui/EmptyState.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import Tooltip from '$lib/components/ui/Tooltip.svelte'

  const params = new UrlListParams('plugin', { sort: 'id', order: 'ASC', perPage: 200 })
  const plugins = new ListController('plugin', () => params.params)
  const manifests = $derived(new Map(plugins.data.map((p) => [p.id, parseManifest(p)])))

  let rescanning = $state(false)
  async function rescan() {
    rescanning = true
    try {
      await rescanPlugins()
      plugins.reload()
    } catch (err) {
      toast.warning((err as Error).message || t('ra.page.error'))
    } finally {
      rescanning = false
    }
  }

  const columns = $derived<DataColumn<Plugin>[]>([
    {
      id: 'id',
      label: t('resources.plugin.fields.id'),
      sort: 'id',
      value: (p) => p.id,
      class: 'font-mono text-callout text-label',
    },
    {
      id: 'name',
      label: t('resources.plugin.fields.name'),
      value: (p) => manifests.get(p.id)?.name ?? '—',
    },
    {
      id: 'description',
      label: t('resources.plugin.fields.description'),
      value: (p) => manifests.get(p.id)?.description ?? '—',
      class: 'max-lg:hidden',
      headerClass: 'max-lg:hidden',
    },
    {
      id: 'version',
      label: t('resources.plugin.fields.version'),
      value: (p) => manifests.get(p.id)?.version ?? '—',
    },
    {
      id: 'enabled',
      label: t('resources.plugin.fields.enabled'),
      sort: 'enabled',
      align: 'center',
    },
    {
      id: 'updatedAt',
      label: t('resources.plugin.fields.updatedAt'),
      sort: 'updatedAt',
      value: (p) => formatDateTime(p.updatedAt),
      class: 'max-md:hidden',
      headerClass: 'max-md:hidden',
    },
  ])
</script>

{#snippet rescanButton()}
  <Button size="sm" variant="secondary" disabled={rescanning} onclick={rescan}>
    <RefreshCw class={rescanning ? 'animate-spin' : ''} />{t('resources.plugin.actions.rescan')}
  </Button>
{/snippet}

<PageHeader title={t('resources.plugin.name', { smart_count: 2 })}>
  {#snippet actions()}{@render rescanButton()}{/snippet}
</PageHeader>

{#if plugins.loading && !plugins.data.length}
  <div class="flex justify-center py-24"><Spinner class="size-7" /></div>
{:else if plugins.error}
  <EmptyState icon={Puzzle} title={t('ra.page.error')} message={plugins.error.message} />
{:else if !plugins.data.length}
  <EmptyState icon={Puzzle} title={t('ra.navigation.no_results')}>
    <div class="mt-3">{@render rescanButton()}</div>
  </EmptyState>
{:else}
  <DataTable
    rows={plugins.data}
    {columns}
    loading={plugins.loading}
    sort={params.sort}
    order={params.order}
    onsort={(f) => params.setSort(f)}
    rowHref={(p) => href(`/plugin/${p.id}`)}
  >
    {#snippet cell(p, col)}
      {#if col === 'enabled'}
        {#if p.lastError}
          <Tooltip content={p.lastError}>
            {#snippet trigger(props)}
              <span
                {...props}
                class="inline-flex items-center gap-1 rounded-full bg-danger/15 px-2 py-0.5 text-callout font-semibold text-danger"
              >
                <CircleAlert class="size-3.5" />{t('resources.plugin.fields.hasError')}
              </span>
            {/snippet}
          </Tooltip>
        {:else}
          <PluginToggle
            plugin={p}
            manifest={manifests.get(p.id) ?? null}
            onchange={() => plugins.reload()}
          />
        {/if}
      {/if}
    {/snippet}
  </DataTable>
{/if}
