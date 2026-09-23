<script lang="ts">
  import {
    ArrowDownWideNarrow,
    ArrowUpNarrowWide,
    CircleAlert,
    Heart,
    LayoutGrid,
    List as ListIcon,
    MicVocal,
  } from '@lucide/svelte'
  import config from '$lib/config'
  import { artistMenu } from '$lib/actions.svelte'
  import type { Artist, Role } from '$lib/api/types'
  import { ListController, UrlListParams } from '$lib/data.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import { auth } from '$lib/state/auth.svelte'
  import { settings } from '$lib/state/settings.svelte'
  import { formatBytes } from '$lib/utils/formatters'
  import { GridPages, responsiveColumns } from '$lib/utils/grid.svelte'
  import PageHeader from '$lib/components/layout/PageHeader.svelte'
  import ArtistCard from '$lib/components/media/ArtistCard.svelte'
  import Artwork from '$lib/components/media/Artwork.svelte'
  import LoveButton from '$lib/components/media/LoveButton.svelte'
  import Rating from '$lib/components/media/Rating.svelte'
  import DataTable from '$lib/components/ui/DataTable.svelte'
  import type { DataColumn } from '$lib/components/ui/dataTable'
  import EmptyState from '$lib/components/ui/EmptyState.svelte'
  import FilterChip from '$lib/components/ui/FilterChip.svelte'
  import IconButton from '$lib/components/ui/IconButton.svelte'
  import ActionMenu from '$lib/components/ui/menu/ActionMenu.svelte'
  import Pagination from '$lib/components/ui/Pagination.svelte'
  import SearchField from '$lib/components/ui/SearchField.svelte'
  import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte'
  import Select from '$lib/components/ui/Select.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'

  const params = new UrlListParams('artist', {
    sort: 'name',
    order: 'ASC',
    perPage: 60,
    filter: { role: 'albumartist' },
  })

  const view = $derived(settings.view('artist'))
  // The grid pages by whole rows at the current width; columns mirror the grid classes below
  const pages = new GridPages({
    grid: () => view === 'grid',
    perPage: () => params.perPage,
    columns: (width) => responsiveColumns(width, 140, 160),
  })
  const artists = new ListController('artist', () =>
    pages.ready ? { ...params.params, perPage: pages.pageSize } : null,
  )

  const ROLES: Role[] = [
    'albumartist',
    'artist',
    'composer',
    'conductor',
    'lyricist',
    'arranger',
    'producer',
    'director',
    'engineer',
    'mixer',
    'remixer',
    'djmixer',
    'performer',
    'maincredit',
  ]
  const roleOptions = $derived(
    ROLES.map((r) => ({
      value: r as string,
      label: t(`resources.artist.roles.${r}`, { smart_count: 2 }),
    })).sort((a, b) => a.label.localeCompare(b.label)),
  )
  const role = $derived((params.filter.role as string | undefined) ?? '')

  // Counters follow the selected role, like the legacy list
  const stat = (a: Artist, key: 'albumCount' | 'songCount' | 'size') =>
    role ? (a.stats?.[role as Role]?.[key] ?? 0) : (a[key] ?? 0)

  const sortOptions = $derived([
    { value: 'name', label: t('resources.artist.fields.name') },
    { value: 'albumCount', label: t('resources.artist.fields.albumCount') },
    { value: 'songCount', label: t('resources.artist.fields.songCount') },
    { value: 'size', label: t('resources.artist.fields.size') },
    { value: 'playCount', label: t('resources.artist.fields.playCount') },
    ...(config.enableFavourites
      ? [{ value: 'starred_at', label: t('resources.song.fields.starred') }]
      : []),
    ...(config.enableStarRating
      ? [{ value: 'rating', label: t('resources.artist.fields.rating') }]
      : []),
  ])

  let starredBy = $state<Record<string, boolean>>({})
  let ratingBy = $state<Record<string, number>>({})

  const columns = $derived<DataColumn<Artist>[]>([
    { id: 'name', label: t('resources.artist.fields.name'), sort: 'name' },
    {
      id: 'albumCount',
      label: t('resources.artist.fields.albumCount'),
      sort: 'albumCount',
      align: 'right',
      value: (a) => stat(a, 'albumCount'),
    },
    {
      id: 'songCount',
      label: t('resources.artist.fields.songCount'),
      sort: 'songCount',
      align: 'right',
      value: (a) => stat(a, 'songCount'),
    },
    {
      id: 'size',
      label: t('resources.artist.fields.size'),
      sort: 'size',
      align: 'right',
      value: (a) => formatBytes(stat(a, 'size')),
    },
    {
      id: 'playCount',
      label: t('resources.artist.fields.playCount'),
      sort: 'playCount',
      align: 'right',
      value: (a) => a.playCount ?? 0,
    },
    ...(config.enableStarRating
      ? [{ id: 'rating', label: t('resources.artist.fields.rating'), sort: 'rating' }]
      : []),
    { id: 'actions', label: '', class: 'w-24', align: 'right' as const },
  ])
</script>

<PageHeader title={t('resources.artist.name', { smart_count: 2 })}>
  {#snippet actions()}
    <SearchField
      value={(params.filter.name as string) ?? ''}
      onsearch={(q) => params.patchFilter({ name: q || undefined })}
    />
    <Select
      value={role}
      options={roleOptions}
      label={t('resources.artist.fields.role')}
      class="h-7"
      onValueChange={(v) => params.patchFilter({ role: v })}
    />
    {#if config.enableFavourites}
      <FilterChip
        label={t('ui.favourites')}
        icon={Heart}
        active={params.filter.starred === true}
        onclick={() =>
          params.patchFilter({ starred: params.filter.starred === true ? undefined : true })}
      />
    {/if}
    {#if auth.isAdmin}
      <FilterChip
        label={t('resources.artist.fields.missing')}
        icon={CircleAlert}
        active={params.filter.missing === true}
        onclick={() =>
          params.patchFilter({ missing: params.filter.missing === true ? undefined : true })}
      />
    {/if}
    <Select
      value={params.sort}
      options={sortOptions}
      label={t('ui.sortBy')}
      class="h-7"
      onValueChange={(v) => params.setSort(v, v === 'name' ? 'ASC' : 'DESC')}
    />
    <IconButton
      label={params.order === 'ASC' ? t('ui.ascending') : t('ui.descending')}
      variant="filled"
      size="sm"
      class="rounded-lg"
      onclick={() => params.setSort(params.sort, params.order === 'ASC' ? 'DESC' : 'ASC')}
    >
      {#if params.order === 'ASC'}<ArrowUpNarrowWide />{:else}<ArrowDownWideNarrow />{/if}
    </IconButton>
    <SegmentedControl
      size="sm"
      value={view}
      onValueChange={(v) => settings.setView('artist', v)}
      label={t('ui.view', { _: 'View' })}
      options={[
        { value: 'grid', label: t('ui.grid'), icon: LayoutGrid, iconOnly: true },
        { value: 'table', label: t('ui.list'), icon: ListIcon, iconOnly: true },
      ]}
    />
  {/snippet}
</PageHeader>

<div bind:clientWidth={pages.width}>
  {#if (artists.loading || !pages.ready) && !artists.data.length}
    <div class="flex justify-center py-24"><Spinner class="size-7" /></div>
  {:else if artists.error}
    <EmptyState icon={MicVocal} title={t('ra.page.error')} message={artists.error.message} />
  {:else if !artists.data.length}
    <EmptyState icon={MicVocal} title={t('ra.navigation.no_results')} />
  {:else if view === 'grid'}
    <div
      class="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-x-5 gap-y-7 transition-opacity sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] {artists.loading
        ? 'opacity-60'
        : ''}"
    >
      {#each artists.data as artist, i (artist.id)}
        <ArtistCard
          {artist}
          eager={i < 12}
          subtitle={t('ui.albums', { smart_count: stat(artist, 'albumCount') })}
        />
      {/each}
    </div>
  {:else}
    <DataTable
      rows={artists.data}
      {columns}
      loading={artists.loading}
      sort={params.sort}
      order={params.order}
      onsort={(f) => params.setSort(f)}
      rowHref={(a) => href(`/artist/${a.id}/show`)}
    >
      {#snippet cell(a, col)}
        {#if col === 'name'}
          <div class="flex items-center gap-3 {a.missing ? 'opacity-50' : ''}">
            <div class="size-9 shrink-0"><Artwork kind="artist" record={a} size={36} round /></div>
            <span class="truncate text-label">{a.name}</span>
          </div>
        {:else if col === 'rating'}
          <Rating
            id={a.id}
            bind:rating={() => ratingBy[a.id] ?? a.rating ?? 0, (v) => (ratingBy[a.id] = v)}
          />
        {:else if col === 'actions'}
          <div class="flex items-center justify-end gap-1">
            <LoveButton
              id={a.id}
              size="sm"
              bind:starred={
                () => starredBy[a.id] ?? a.starred ?? false, (v) => (starredBy[a.id] = v)
              }
            />
            <ActionMenu
              items={() =>
                artistMenu(a, {
                  starred: starredBy[a.id] ?? a.starred,
                  onStar: (v) => (starredBy[a.id] = v),
                })}
            />
          </div>
        {/if}
      {/snippet}
    </DataTable>
  {/if}

  {#if artists.data.length}
    <Pagination
      class="mt-10"
      total={artists.total}
      bind:page={() => params.page, (v) => (params.page = v)}
      bind:perPage={() => params.perPage, (v) => (params.perPage = v)}
      pageSize={pages.pageSize}
      perPageOptions={[30, 60, 120]}
    />
  {/if}
</div>
