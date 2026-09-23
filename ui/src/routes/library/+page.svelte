<script lang="ts">
  import { Check, FolderSearch, Library as LibraryIcon, Plus, RefreshCw } from '@lucide/svelte'
  import type { Library } from '$lib/api/types'
  import { ListController, UrlListParams } from '$lib/data.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import { scanLibraries } from '$lib/scan'
  import { activity } from '$lib/state/activity.svelte'
  import { formatBytes, formatDateTime, formatNumber } from '$lib/utils/formatters'
  import PageHeader from '$lib/components/layout/PageHeader.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import DataTable from '$lib/components/ui/DataTable.svelte'
  import type { DataColumn } from '$lib/components/ui/dataTable'
  import EmptyState from '$lib/components/ui/EmptyState.svelte'
  import SearchField from '$lib/components/ui/SearchField.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'

  const params = new UrlListParams('library', { sort: 'name', order: 'ASC', perPage: 100 })
  const libraries = new ListController('library', () => params.params)

  // Scans apply to the selected libraries, or to all of them when nothing is selected
  let selected = $state<(string | number)[]>([])
  let starting = $state(false)
  const scanDisabled = $derived(starting || activity.scanStatus.scanning)

  async function scan(full: boolean) {
    starting = true
    if (await scanLibraries(full, selected)) selected = []
    starting = false
  }

  const columns = $derived<DataColumn<Library>[]>([
    { id: 'name', label: t('resources.library.fields.name'), sort: 'name' },
    {
      id: 'defaultNewUsers',
      label: t('resources.library.fields.defaultNewUsers'),
      sort: 'defaultNewUsers',
      align: 'center',
      class: 'max-md:hidden',
      headerClass: 'max-md:hidden',
    },
    {
      id: 'totalSongs',
      label: t('resources.library.fields.totalSongs'),
      sort: 'totalSongs',
      align: 'right',
      value: (l) => formatNumber(l.totalSongs),
    },
    {
      id: 'totalAlbums',
      label: t('resources.library.fields.totalAlbums'),
      sort: 'totalAlbums',
      align: 'right',
      value: (l) => formatNumber(l.totalAlbums),
    },
    {
      id: 'totalMissingFiles',
      label: t('resources.library.fields.totalMissingFiles'),
      sort: 'totalMissingFiles',
      align: 'right',
      value: (l) => formatNumber(l.totalMissingFiles),
      class: 'max-lg:hidden',
      headerClass: 'max-lg:hidden',
    },
    {
      id: 'totalSize',
      label: t('resources.library.fields.totalSize'),
      sort: 'totalSize',
      align: 'right',
      value: (l) => formatBytes(l.totalSize),
    },
    {
      id: 'lastScanAt',
      label: t('resources.library.fields.lastScanAt'),
      sort: 'lastScanAt',
      value: (l) => formatDateTime(l.lastScanAt),
      class: 'max-md:hidden',
      headerClass: 'max-md:hidden',
    },
  ])
</script>

<PageHeader title={t('resources.library.name', { smart_count: 2 })}>
  {#snippet actions()}
    <SearchField
      value={(params.filter.name as string) ?? ''}
      onsearch={(q) => params.patchFilter({ name: q || undefined })}
    />
    <Button size="sm" variant="secondary" disabled={scanDisabled} onclick={() => scan(false)}>
      <RefreshCw class={activity.scanStatus.scanning ? 'animate-spin' : ''} />{t(
        'resources.library.actions.quickScan',
      )}
    </Button>
    <Button size="sm" variant="secondary" disabled={scanDisabled} onclick={() => scan(true)}>
      <FolderSearch />{t('resources.library.actions.fullScan')}
    </Button>
    <Button size="sm" href={href('/library/create')}><Plus />{t('ra.action.create')}</Button>
  {/snippet}
</PageHeader>

{#if libraries.loading && !libraries.data.length}
  <div class="flex justify-center py-24"><Spinner class="size-7" /></div>
{:else if libraries.error}
  <EmptyState icon={LibraryIcon} title={t('ra.page.error')} message={libraries.error.message} />
{:else if !libraries.data.length}
  <EmptyState icon={LibraryIcon} title={t('ra.navigation.no_results')} />
{:else}
  {#if selected.length}
    <p class="mb-2 text-callout text-label-2">
      {t('ra.action.bulk_actions', { smart_count: selected.length })}
    </p>
  {/if}
  <DataTable
    rows={libraries.data}
    {columns}
    loading={libraries.loading}
    sort={params.sort}
    order={params.order}
    onsort={(f) => params.setSort(f)}
    rowHref={(l) => href(`/library/${l.id}`)}
    selectable
    bind:selected
  >
    {#snippet cell(l, col)}
      {#if col === 'name'}
        <div class="min-w-0">
          <div class="truncate text-label">{l.name}</div>
          <div class="truncate text-callout text-label-3">{l.path}</div>
        </div>
      {:else if col === 'defaultNewUsers' && l.defaultNewUsers}
        <Check class="mx-auto size-4 text-label-2" />
      {/if}
    {/snippet}
  </DataTable>
{/if}
