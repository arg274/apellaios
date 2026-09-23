<script lang="ts">
  import { LayoutGrid, List as ListIcon, Play, Plus, Radio as RadioIcon } from '@lucide/svelte'
  import { radioMenu } from '$lib/actions.svelte'
  import type { Radio } from '$lib/api/types'
  import { ListController, UrlListParams } from '$lib/data.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import { player } from '$lib/player/player.svelte'
  import { auth } from '$lib/state/auth.svelte'
  import { settings } from '$lib/state/settings.svelte'
  import { formatDate } from '$lib/utils/formatters'
  import PageHeader from '$lib/components/layout/PageHeader.svelte'
  import Artwork from '$lib/components/media/Artwork.svelte'
  import RadioCard from '$lib/components/media/RadioCard.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import DataTable from '$lib/components/ui/DataTable.svelte'
  import type { DataColumn } from '$lib/components/ui/dataTable'
  import EmptyState from '$lib/components/ui/EmptyState.svelte'
  import IconButton from '$lib/components/ui/IconButton.svelte'
  import ActionMenu from '$lib/components/ui/menu/ActionMenu.svelte'
  import Pagination from '$lib/components/ui/Pagination.svelte'
  import SearchField from '$lib/components/ui/SearchField.svelte'
  import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'

  const params = new UrlListParams('radio', { sort: 'name', order: 'ASC', perPage: 60 })
  const radios = new ListController('radio', () => params.params)
  const view = $derived(settings.view('radio'))

  const columns = $derived<DataColumn<Radio>[]>([
    { id: 'name', label: t('resources.radio.fields.name'), sort: 'name' },
    { id: 'homePageUrl', label: t('resources.radio.fields.homePageUrl'), sort: 'home_page_url' },
    {
      id: 'updatedAt',
      label: t('resources.radio.fields.updatedAt'),
      sort: 'updated_at',
      value: (r) => formatDate(r.updatedAt),
    },
    { id: 'actions', label: '', class: 'w-16', align: 'right' },
  ])
</script>

<PageHeader title={t('resources.radio.name', { smart_count: 2 })}>
  {#snippet actions()}
    <SearchField
      value={(params.filter.name as string) ?? ''}
      onsearch={(q) => params.patchFilter({ name: q || undefined })}
    />
    <SegmentedControl
      size="sm"
      value={view}
      onValueChange={(v) => settings.setView('radio', v)}
      label={t('ui.view')}
      options={[
        { value: 'grid', label: t('ui.grid'), icon: LayoutGrid, iconOnly: true },
        { value: 'table', label: t('ui.list'), icon: ListIcon, iconOnly: true },
      ]}
    />
    {#if auth.isAdmin}
      <Button size="sm" href={href('/radio/create')}><Plus />{t('ra.action.create')}</Button>
    {/if}
  {/snippet}
</PageHeader>

{#if radios.loading && !radios.data.length}
  <div class="flex justify-center py-24"><Spinner class="size-7" /></div>
{:else if radios.error}
  <EmptyState icon={RadioIcon} title={t('ra.page.error')} message={radios.error.message} />
{:else if !radios.data.length}
  <EmptyState icon={RadioIcon} title={t('ra.navigation.no_results')}>
    {#if auth.isAdmin}
      <Button href={href('/radio/create')} class="mt-3"><Plus />{t('ra.action.create')}</Button>
    {/if}
  </EmptyState>
{:else if view === 'grid'}
  <div
    class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-5 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] {radios.loading
      ? 'opacity-60'
      : ''}"
  >
    {#each radios.data as radio, i (radio.id)}
      <RadioCard {radio} eager={i < 12} />
    {/each}
  </div>
{:else}
  <DataTable
    rows={radios.data}
    {columns}
    loading={radios.loading}
    sort={params.sort}
    order={params.order}
    onsort={(f) => params.setSort(f)}
    onrowclick={(r) => player.playRadio(r)}
  >
    {#snippet cell(r, col)}
      {#if col === 'name'}
        <div class="flex min-w-0 items-center gap-3">
          <div class="size-10 shrink-0">
            <Artwork kind="radio" record={r.uploadedImage ? r : null} size={40} />
          </div>
          <span class="truncate text-label">{r.name}</span>
        </div>
      {:else if col === 'homePageUrl'}
        {#if r.homePageUrl}
          <a
            href={r.homePageUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="truncate text-label-2 hover:text-accent hover:underline">{r.homePageUrl}</a
          >
        {/if}
      {:else if col === 'actions'}
        <div class="flex items-center justify-end gap-1">
          <IconButton
            size="sm"
            label={t('resources.radio.actions.playNow')}
            onclick={() => player.playRadio(r)}><Play fill="currentColor" /></IconButton
          >
          <ActionMenu items={() => radioMenu(r)} />
        </div>
      {/if}
    {/snippet}
  </DataTable>
{/if}

{#if radios.data.length}
  <Pagination
    class="mt-10"
    total={radios.total}
    bind:page={() => params.page, (v) => (params.page = v)}
    bind:perPage={() => params.perPage, (v) => (params.perPage = v)}
    perPageOptions={[30, 60, 120]}
  />
{/if}
