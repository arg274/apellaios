<script lang="ts">
  import { Heart, LayoutGrid, List as ListIcon, ListMusic, Plus, Sparkles } from '@lucide/svelte'
  import config from '$lib/config'
  import { playlistMenu } from '$lib/actions.svelte'
  import { getAll, update } from '$lib/api/rest'
  import type { Playlist } from '$lib/api/types'
  import { Loader, ListController, UrlListParams } from '$lib/data.svelte'
  import { isSmartPlaylist, isWritable } from '$lib/dnd'
  import { t } from '$lib/i18n/index.svelte'
  import { href } from '$lib/nav.svelte'
  import { auth } from '$lib/state/auth.svelte'
  import { settings } from '$lib/state/settings.svelte'
  import { toast } from '$lib/state/toast.svelte'
  import { formatDate, formatDuration2 } from '$lib/utils/formatters'
  import PageHeader from '$lib/components/layout/PageHeader.svelte'
  import Artwork from '$lib/components/media/Artwork.svelte'
  import LoveButton from '$lib/components/media/LoveButton.svelte'
  import PlaylistCard from '$lib/components/media/PlaylistCard.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import DataTable from '$lib/components/ui/DataTable.svelte'
  import type { DataColumn } from '$lib/components/ui/dataTable'
  import EmptyState from '$lib/components/ui/EmptyState.svelte'
  import FilterChip from '$lib/components/ui/FilterChip.svelte'
  import ActionMenu from '$lib/components/ui/menu/ActionMenu.svelte'
  import Pagination from '$lib/components/ui/Pagination.svelte'
  import SearchField from '$lib/components/ui/SearchField.svelte'
  import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte'
  import Select from '$lib/components/ui/Select.svelte'
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import Switch from '$lib/components/ui/Switch.svelte'

  const params = new UrlListParams('playlist', { sort: 'name', order: 'ASC', perPage: 60 })
  const playlists = new ListController('playlist', () => params.params)
  const view = $derived(settings.view('playlist'))

  // Admins can narrow the list to one owner, like the legacy filter
  const users = new Loader(
    () => (auth.isAdmin ? 'users' : null),
    () => getAll('user', { sort: 'name', order: 'ASC' }),
  )
  const ownerOptions = $derived([
    { value: '', label: t('ui.any', { _: 'Any' }) },
    ...(users.value ?? []).map((u) => ({ value: u.id, label: u.name || u.userName })),
  ])

  // Optimistic toggles, keyed by playlist
  let publicBy = $state<Record<string, boolean>>({})
  let syncBy = $state<Record<string, boolean>>({})
  let starredBy = $state<Record<string, boolean>>({})

  async function setFlag(pls: Playlist, key: 'public' | 'sync', value: boolean) {
    const store = key === 'public' ? publicBy : syncBy
    store[pls.id] = value
    try {
      await update('playlist', pls.id, { ...pls, [key]: value })
    } catch {
      delete store[pls.id]
      toast.error(t('ra.page.error'))
    }
  }

  const columns = $derived<DataColumn<Playlist>[]>([
    { id: 'name', label: t('resources.playlist.fields.name'), sort: 'name' },
    {
      id: 'ownerName',
      label: t('resources.playlist.fields.ownerName'),
      sort: 'owner_name',
      value: (p) => p.ownerName,
    },
    {
      id: 'songCount',
      label: t('resources.playlist.fields.songCount'),
      sort: 'song_count',
      align: 'right',
      value: (p) => p.songCount,
    },
    {
      id: 'duration',
      label: t('resources.playlist.fields.duration'),
      sort: 'duration',
      align: 'right',
      value: (p) => formatDuration2(p.duration),
    },
    {
      id: 'updatedAt',
      label: t('resources.playlist.fields.updatedAt'),
      sort: 'updated_at',
      value: (p) => formatDate(p.updatedAt),
    },
    { id: 'public', label: t('resources.playlist.fields.public'), sort: 'public', align: 'center' },
    { id: 'sync', label: t('resources.playlist.fields.sync'), align: 'center' },
    { id: 'actions', label: '', class: 'w-24', align: 'right' },
  ])
</script>

<PageHeader title={t('resources.playlist.name', { smart_count: 2 })}>
  {#snippet actions()}
    <SearchField
      value={(params.filter.q as string) ?? ''}
      onsearch={(q) => params.patchFilter({ q: q || undefined })}
    />
    {#if auth.isAdmin}
      <Select
        value={(params.filter.owner_id as string) ?? ''}
        options={ownerOptions}
        label={t('resources.playlist.fields.ownerName')}
        class="h-7"
        onValueChange={(v) => params.patchFilter({ owner_id: v || undefined })}
      />
    {/if}
    {#if config.enableFavourites}
      <FilterChip
        label={t('ui.favourites')}
        icon={Heart}
        active={params.filter.starred === true}
        onclick={() =>
          params.patchFilter({ starred: params.filter.starred === true ? undefined : true })}
      />
    {/if}
    <SegmentedControl
      size="sm"
      value={view}
      onValueChange={(v) => settings.setView('playlist', v)}
      label={t('ui.view')}
      options={[
        { value: 'grid', label: t('ui.grid'), icon: LayoutGrid, iconOnly: true },
        { value: 'table', label: t('ui.list'), icon: ListIcon, iconOnly: true },
      ]}
    />
    <Button size="sm" href={href('/playlist/create')}><Plus />{t('ra.action.create')}</Button>
  {/snippet}
</PageHeader>

{#if playlists.loading && !playlists.data.length}
  <div class="flex justify-center py-24"><Spinner class="size-7" /></div>
{:else if playlists.error}
  <EmptyState icon={ListMusic} title={t('ra.page.error')} message={playlists.error.message} />
{:else if !playlists.data.length}
  <EmptyState icon={ListMusic} title={t('ra.navigation.no_results')}>
    <Button href={href('/playlist/create')} class="mt-3"><Plus />{t('ra.action.create')}</Button>
  </EmptyState>
{:else if view === 'grid'}
  <div
    class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-5 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] {playlists.loading
      ? 'opacity-60'
      : ''}"
  >
    {#each playlists.data as playlist, i (playlist.id)}
      <PlaylistCard {playlist} eager={i < 12} />
    {/each}
  </div>
{:else}
  <DataTable
    rows={playlists.data}
    {columns}
    loading={playlists.loading}
    sort={params.sort}
    order={params.order}
    onsort={(f) => params.setSort(f)}
    rowHref={(p) => href(`/playlist/${p.id}/show`)}
  >
    {#snippet cell(p, col)}
      {#if col === 'name'}
        <div class="flex min-w-0 items-center gap-3">
          <div class="size-10 shrink-0"><Artwork kind="playlist" record={p} size={40} /></div>
          <span class="flex min-w-0 items-center gap-1 truncate text-label">
            {#if isSmartPlaylist(p)}<Sparkles class="size-3.5 shrink-0 text-accent" />{/if}{p.name}
          </span>
        </div>
      {:else if col === 'public'}
        <Switch
          label={t('resources.playlist.fields.public')}
          checked={publicBy[p.id] ?? p.public}
          disabled={!isWritable(p.ownerId)}
          onCheckedChange={(v) => setFlag(p, 'public', v)}
        />
      {:else if col === 'sync'}
        {#if p.path}
          <Switch
            label={t('resources.playlist.fields.sync')}
            checked={syncBy[p.id] ?? p.sync}
            disabled={!isWritable(p.ownerId)}
            onCheckedChange={(v) => setFlag(p, 'sync', v)}
          />
        {/if}
      {:else if col === 'actions'}
        <div class="flex items-center justify-end gap-1">
          <LoveButton
            id={p.id}
            size="sm"
            bind:starred={() => starredBy[p.id] ?? p.starred ?? false, (v) => (starredBy[p.id] = v)}
          />
          <ActionMenu items={() => playlistMenu(p)} />
        </div>
      {/if}
    {/snippet}
  </DataTable>
{/if}

{#if playlists.data.length}
  <Pagination
    class="mt-10"
    total={playlists.total}
    bind:page={() => params.page, (v) => (params.page = v)}
    bind:perPage={() => params.perPage, (v) => (params.perPage = v)}
    perPageOptions={[30, 60, 120]}
  />
{/if}
