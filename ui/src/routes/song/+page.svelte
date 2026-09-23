<script lang="ts">
  import { CircleAlert, Heart, Music, Shuffle } from '@lucide/svelte'
  import config from '$lib/config'
  import { shuffleAll } from '$lib/actions.svelte'
  import { getList } from '$lib/api/rest'
  import { ListController, UrlListParams } from '$lib/data.svelte'
  import { t } from '$lib/i18n/index.svelte'
  import { auth } from '$lib/state/auth.svelte'
  import PageHeader from '$lib/components/layout/PageHeader.svelte'
  import ColumnsMenu from '$lib/components/media/ColumnsMenu.svelte'
  import ListFilters, { type FilterField } from '$lib/components/media/ListFilters.svelte'
  import SongTable from '$lib/components/media/SongTable.svelte'
  import type { ColumnId } from '$lib/components/media/songColumns'
  import Button from '$lib/components/ui/Button.svelte'
  import EmptyState from '$lib/components/ui/EmptyState.svelte'
  import FilterChip from '$lib/components/ui/FilterChip.svelte'
  import Pagination from '$lib/components/ui/Pagination.svelte'
  import SearchField from '$lib/components/ui/SearchField.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'

  const params = new UrlListParams('song', { sort: 'title', order: 'ASC', perPage: 50 })
  const songs = new ListController('song', () => params.params)

  // Same columns and defaults as the legacy song list
  const COLS: ColumnId[] = [
    'title',
    'album',
    'artist',
    'albumArtist',
    'composer',
    'trackNumber',
    'playCount',
    'playDate',
    'year',
    'quality',
    'channels',
    'bpm',
    'genre',
    'mood',
    'comment',
    'path',
    'createdAt',
    'rating',
    'love',
    'duration',
  ]
  const OFF: ColumnId[] = [
    'composer',
    'channels',
    'bpm',
    'playDate',
    'albumArtist',
    'genre',
    'mood',
    'comment',
    'path',
    'createdAt',
    'trackNumber',
  ]

  const fields: FilterField[] = [
    { key: 'genre_id', label: t('resources.song.fields.genre'), kind: 'genre' },
    {
      key: 'grouping',
      label: t('resources.song.fields.grouping'),
      kind: 'tag',
      tagName: 'grouping',
    },
    { key: 'mood', label: t('resources.song.fields.mood'), kind: 'tag', tagName: 'mood' },
  ]

  let selected = $state<string[]>([])

  // "Shuffle all" plays a random sample of everything matching the current filters
  const shuffleSource = async () =>
    (
      await getList('song', {
        perPage: 500,
        sort: 'random',
        filter: { ...params.filter, missing: false },
      })
    ).data
</script>

<PageHeader title={t('resources.song.name', { smart_count: 2 })}>
  {#snippet actions()}
    <SearchField
      value={(params.filter.title as string) ?? ''}
      onsearch={(q) => params.patchFilter({ title: q || undefined })}
    />
    <ListFilters {params} {fields} />
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
        label={t('resources.song.fields.missing')}
        icon={CircleAlert}
        active={params.filter.missing === true}
        onclick={() =>
          params.patchFilter({ missing: params.filter.missing === true ? undefined : true })}
      />
    {/if}
    <Button size="sm" variant="secondary" onclick={shuffleAll(shuffleSource)}>
      <Shuffle />{t('resources.song.actions.shuffleAll')}
    </Button>
    <ColumnsMenu listKey="song" columns={COLS} defaultOff={OFF} />
  {/snippet}
</PageHeader>

{#if songs.loading && !songs.data.length}
  <div class="flex justify-center py-24"><Spinner class="size-7" /></div>
{:else if songs.error}
  <EmptyState icon={Music} title={t('ra.page.error')} message={songs.error.message} />
{:else}
  <div class="transition-opacity {songs.loading ? 'opacity-60' : ''}">
    <SongTable
      songs={songs.data}
      listKey="song"
      variant="list"
      columns={COLS}
      defaultOff={OFF}
      sort={params.sort}
      order={params.order}
      onsort={(f) => params.setSort(f)}
      numberOffset={(params.page - 1) * params.perPage}
      bind:selected
    >
      {#snippet empty()}
        <EmptyState icon={Music} title={t('ra.navigation.no_results')} />
      {/snippet}
    </SongTable>
  </div>
  {#if songs.total}
    <Pagination
      class="mt-8"
      total={songs.total}
      bind:page={() => params.page, (v) => (params.page = v)}
      bind:perPage={() => params.perPage, (v) => (params.perPage = v)}
      perPageOptions={[25, 50, 100, 200]}
    />
  {/if}
{/if}
