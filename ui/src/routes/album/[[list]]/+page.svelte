<script lang="ts">
  import {
    ArrowDownWideNarrow,
    ArrowUpNarrowWide,
    CircleAlert,
    Disc3,
    LayoutGrid,
    List as ListIcon,
    Play,
    Shuffle,
  } from '@lucide/svelte'
  import { page } from '$app/state'
  import config from '$lib/config'
  import { albumList, DEFAULT_ALBUM_LIST } from '$lib/albumLists'
  import { albumMenu, playAll, shuffleAll } from '$lib/actions.svelte'
  import { getAll } from '$lib/api/rest'
  import type { Album } from '$lib/api/types'
  import { ListController, UrlListParams } from '$lib/data.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { albumYears, releaseTypeLabel } from '$lib/media'
  import { href } from '$lib/nav.svelte'
  import { auth } from '$lib/state/auth.svelte'
  import { settings } from '$lib/state/settings.svelte'
  import { formatBytes, formatDuration2 } from '$lib/utils/formatters'
  import { GridPages } from '$lib/utils/grid.svelte'
  import PageHeader from '$lib/components/layout/PageHeader.svelte'
  import AlbumGrid, { albumGridColumns } from '$lib/components/media/AlbumGrid.svelte'
  import ArtistLinks from '$lib/components/media/ArtistLinks.svelte'
  import Artwork from '$lib/components/media/Artwork.svelte'
  import ListFilters, { type FilterField } from '$lib/components/media/ListFilters.svelte'
  import LoveButton from '$lib/components/media/LoveButton.svelte'
  import Rating from '$lib/components/media/Rating.svelte'
  import Button from '$lib/components/ui/Button.svelte'
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

  const preset = $derived(albumList(page.params.list ?? DEFAULT_ALBUM_LIST))

  // Recreated per list so each keeps its own defaults and remembered page size
  const params = $derived(
    new UrlListParams(`album.${preset.id}`, {
      sort: preset.sort,
      order: preset.order,
      perPage: 60,
      filter: preset.filter,
    }),
  )

  const grid = $derived(settings.albumView === 'grid')
  const pages = new GridPages({
    grid: () => grid,
    perPage: () => params.perPage,
    columns: albumGridColumns,
  })

  const albums = new ListController('album', () =>
    !pages.ready
      ? null
      : {
          ...params.params,
          perPage: pages.pageSize,
          // A preset's own filter always applies, on top of whatever the user adds
          filter: { ...params.filter, ...preset.filter },
        },
  )

  const sortOptions = $derived(
    [
      ['name', t('resources.album.fields.name')],
      ['artist', t('resources.album.fields.artist')],
      ['max_year', t('resources.album.fields.year')],
      ['recently_added', t('resources.album.fields.createdAt')],
      ['play_count', t('resources.album.fields.playCount')],
      ['play_date', t('resources.song.fields.playDate')],
      ['duration', t('resources.album.fields.duration')],
      ['size', t('resources.album.fields.size')],
      ...(config.enableStarRating ? [['rating', t('resources.album.fields.rating')]] : []),
      ['random', t('resources.album.lists.random')],
    ].map(([value, label]) => ({ value, label })),
  )

  // The legacy album filters
  const fields: FilterField[] = [
    { key: 'artist_id', label: t('resources.album.fields.artist'), kind: 'artist' },
    { key: 'genre_id', label: t('resources.album.fields.genre'), kind: 'genre' },
    {
      key: 'releasetype',
      label: t('resources.album.fields.releaseType'),
      kind: 'tag',
      tagName: 'releasetype',
      multiple: false,
      format: releaseTypeLabel,
    },
    {
      key: 'recordlabel',
      label: t('resources.album.fields.recordLabel'),
      kind: 'tag',
      tagName: 'recordlabel',
      multiple: false,
    },
    {
      key: 'grouping',
      label: t('resources.album.fields.grouping'),
      kind: 'tag',
      tagName: 'grouping',
    },
    { key: 'mood', label: t('resources.album.fields.mood'), kind: 'tag', tagName: 'mood' },
    {
      key: 'media',
      label: t('resources.album.fields.media'),
      kind: 'tag',
      tagName: 'media',
      multiple: false,
    },
    { key: 'compilation', label: t('resources.album.fields.compilation'), kind: 'bool' },
    { key: 'year', label: t('resources.album.fields.year'), kind: 'number' },
  ]

  const source = () =>
    getAll('song', {
      sort: 'album',
      filter: { album_id: albums.data.map((a) => a.id), missing: false },
    })

  let starredBy = $state<Record<string, boolean>>({})
  let ratingBy = $state<Record<string, number>>({})

  const columns = $derived<DataColumn<Album>[]>([
    { id: 'name', label: t('resources.album.fields.name'), sort: 'name' },
    { id: 'artist', label: t('resources.album.fields.albumArtist'), sort: 'artist' },
    {
      id: 'year',
      label: t('resources.album.fields.year'),
      sort: 'max_year',
      value: (a) => albumYears(a),
    },
    {
      id: 'songCount',
      label: t('resources.album.fields.songCount'),
      sort: 'song_count',
      align: 'right',
      value: (a) => a.songCount,
    },
    {
      id: 'playCount',
      label: t('resources.album.fields.playCount'),
      sort: 'play_count',
      align: 'right',
      value: (a) => a.playCount ?? 0,
    },
    {
      id: 'duration',
      label: t('resources.album.fields.duration'),
      sort: 'duration',
      align: 'right',
      value: (a) => formatDuration2(a.duration),
    },
    {
      id: 'size',
      label: t('resources.album.fields.size'),
      sort: 'size',
      align: 'right',
      value: (a) => formatBytes(a.size),
    },
    ...(config.enableStarRating
      ? [{ id: 'rating', label: t('resources.album.fields.rating'), sort: 'rating' }]
      : []),
    { id: 'actions', label: '', class: 'w-24', align: 'right' as const },
  ])
</script>

<PageHeader title={t(`resources.album.lists.${preset.id}`)}>
  {#snippet actions()}
    <SearchField
      value={(params.filter.name as string) ?? ''}
      onsearch={(q) => params.patchFilter({ name: q || undefined })}
    />
    <ListFilters {params} {fields} locked={Object.keys(preset.filter)} />
    {#if auth.isAdmin}
      <FilterChip
        label={t('resources.album.fields.missing')}
        icon={CircleAlert}
        active={params.filter.missing === true}
        onclick={() =>
          params.patchFilter({ missing: params.filter.missing === true ? undefined : true })}
      />
    {/if}
    {#if preset.id !== 'random'}
      <Select
        value={params.sort}
        options={sortOptions}
        label={t('ui.sortBy')}
        class="h-7"
        onValueChange={(v) => params.setSort(v, params.order)}
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
    {/if}
    <SegmentedControl
      size="sm"
      bind:value={settings.albumView}
      label={t('ui.view')}
      options={[
        { value: 'grid', label: t('ui.grid'), icon: LayoutGrid, iconOnly: true },
        { value: 'table', label: t('ui.list'), icon: ListIcon, iconOnly: true },
      ]}
    />
  {/snippet}
</PageHeader>

<div class="-mt-3 mb-6 flex gap-2">
  <Button size="sm" onclick={playAll(source)} disabled={!albums.data.length}>
    <Play fill="currentColor" />{t('resources.album.actions.playAll')}
  </Button>
  <Button size="sm" variant="secondary" onclick={shuffleAll(source)} disabled={!albums.data.length}>
    <Shuffle />{t('resources.album.actions.shuffle')}
  </Button>
</div>

<div bind:clientWidth={pages.width}>
  {#if (albums.loading || !pages.ready) && !albums.data.length}
    <div class="flex justify-center py-24"><Spinner class="size-7" /></div>
  {:else if albums.error}
    <EmptyState icon={Disc3} title={t('ra.page.error')} message={albums.error.message} />
  {:else if !albums.data.length}
    <EmptyState icon={Disc3} title={t('ra.navigation.no_results')} />
  {:else if grid}
    <AlbumGrid albums={albums.data} loading={albums.loading} />
  {:else}
    <DataTable
      rows={albums.data}
      {columns}
      loading={albums.loading}
      sort={params.sort}
      order={params.order}
      onsort={(f) => params.setSort(f)}
      rowHref={(a) => href(`/album/${a.id}/show`)}
    >
      {#snippet cell(a, col)}
        {#if col === 'name'}
          <div class="flex min-w-0 items-center gap-3 {a.missing ? 'opacity-50' : ''}">
            <div class="size-10 shrink-0"><Artwork kind="album" record={a} size={40} /></div>
            <div class="min-w-0">
              <div class="truncate text-label">{a.name}</div>
              {#if a.tags?.releasetype}
                <div class="truncate text-callout text-label-3">
                  {releaseTypeLabel(a.tags.releasetype.join(';'))}
                </div>
              {/if}
            </div>
          </div>
        {:else if col === 'artist'}
          <ArtistLinks record={a} role="albumartist" class="block truncate" />
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
                albumMenu(a, {
                  starred: starredBy[a.id] ?? a.starred,
                  onStar: (v) => (starredBy[a.id] = v),
                })}
            />
          </div>
        {/if}
      {/snippet}
    </DataTable>
  {/if}

  {#if albums.data.length}
    <Pagination
      class="mt-10"
      total={albums.total}
      bind:page={() => params.page, (v) => (params.page = v)}
      bind:perPage={() => params.perPage, (v) => (params.perPage = v)}
      pageSize={pages.pageSize}
      perPageOptions={[30, 60, 90, 120]}
    />
  {/if}
</div>
