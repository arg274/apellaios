<script lang="ts">
  import {
    Ellipsis,
    FileDown,
    ListMusic,
    Lock,
    LockOpen,
    Pencil,
    Play,
    Shuffle,
    Sparkles,
    Trash2,
    X,
  } from '@lucide/svelte'
  import { page } from '$app/state'
  import { playAll, playlistMenu, playlistSongs, shuffleAll } from '$lib/actions.svelte'
  import { exportPlaylistM3U, reorderPlaylistTrack } from '$lib/api/native'
  import { getOne, remove, removeMany, update } from '$lib/api/rest'
  import { coverArtUrl } from '$lib/api/subsonic'
  import type { PlaylistTrack } from '$lib/api/types'
  import { Loader, ListController } from '$lib/data.svelte'
  import { canChangeTracks, isSmartPlaylist, isWritable } from '$lib/dnd'
  import { t } from '$lib/i18n/index.svelte'
  import { navigate } from '$lib/nav.svelte'
  import { toast } from '$lib/state/toast.svelte'
  import { ui } from '$lib/state/ui.svelte'
  import { formatDate, formatDuration2, formatBytes } from '$lib/utils/formatters'
  import PageTitle from '$lib/components/layout/PageTitle.svelte'
  import { iconButtonVariants } from '$lib/components/ui/IconButton.svelte'
  import ActionMenu from '$lib/components/ui/menu/ActionMenu.svelte'
  import Artwork from '$lib/components/media/Artwork.svelte'
  import ExpandableText from '$lib/components/media/ExpandableText.svelte'
  import ImageUploadOverlay from '$lib/components/media/ImageUploadOverlay.svelte'
  import Lightbox from '$lib/components/media/Lightbox.svelte'
  import LoveButton from '$lib/components/media/LoveButton.svelte'
  import SongTable from '$lib/components/media/SongTable.svelte'
  import type { ColumnId } from '$lib/components/media/songColumns'
  import ColumnsMenu from '$lib/components/media/ColumnsMenu.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte'
  import EmptyState from '$lib/components/ui/EmptyState.svelte'
  import { menu, separator, type MenuEntry } from '$lib/components/ui/menu/types'
  import Spinner from '$lib/components/ui/Spinner.svelte'

  const id = $derived(page.params.id!)

  const playlist = new Loader(
    () => id,
    (id, signal) => getOne('playlist', id, { signal }),
    { watch: ['playlist'], ids: () => ({ playlist: [id] }) },
  )
  const tracks = new ListController(
    'playlistTrack',
    () => ({ perPage: 10000, sort: 'id', order: 'ASC', filter: { playlist_id: id } }),
    { watch: ['playlistTrack', 'song', 'playlist'] },
  )

  const p = $derived(playlist.value?.id === id ? playlist.value : undefined)
  // undefined while loading keeps the previous page's tint until this one knows its own
  ui.useTint(() => (p ? (p.dominantColor ?? null) : playlist.error ? null : undefined))

  const editable = $derived(!!p && canChangeTracks(p))
  const writable = $derived(!!p && isWritable(p.ownerId))

  let starredBy = $state<Record<string, boolean>>({})
  const starred = $derived(starredBy[id] ?? p?.starred ?? false)
  let publicBy = $state<Record<string, boolean>>({})
  const isPublic = $derived(publicBy[id] ?? p?.public ?? false)

  let selected = $state<string[]>([])
  let lightbox = $state(false)
  let confirmDelete = $state(false)

  const COLS: ColumnId[] = [
    'title',
    'album',
    'artist',
    'year',
    'playCount',
    'quality',
    'genre',
    'rating',
    'love',
    'duration',
  ]
  const OFF: ColumnId[] = ['year', 'playCount', 'quality', 'genre', 'rating']

  const source = () => playlistSongs(id)

  async function removeTracks(rows: PlaylistTrack[]) {
    try {
      await removeMany(
        'playlistTrack',
        rows.map((r) => r.id),
        { playlist_id: id },
      )
      selected = []
      tracks.reload()
      playlist.reload()
    } catch {
      toast.error(t('ra.page.error'))
    }
  }

  async function reorder(from: number, to: number) {
    const rows = tracks.data
    try {
      await reorderPlaylistTrack(id, rows[from].id, Number(rows[to].id))
      tracks.reload()
    } catch {
      toast.error(t('ra.page.error'))
    }
  }

  async function setPublic(value: boolean) {
    if (!p) return
    publicBy[id] = value
    try {
      await update('playlist', id, { ...p, public: value })
    } catch {
      delete publicBy[id]
      toast.error(t('ra.page.error'))
    }
  }

  const removeEntry = (rows: PlaylistTrack[]): MenuEntry => ({
    label: t('ui.removeFromPlaylist'),
    icon: X,
    danger: true,
    onSelect: () => removeTracks(rows),
  })

  const pageMenu = (): MenuEntry[] =>
    p
      ? menu(
          ...playlistMenu(p),
          separator,
          writable && {
            label: t('ra.action.edit'),
            icon: Pencil,
            onSelect: () => navigate(`/playlist/${id}`),
          },
          writable && {
            label: isPublic
              ? t('resources.playlist.actions.makePrivate')
              : t('resources.playlist.actions.makePublic'),
            icon: isPublic ? Lock : LockOpen,
            onSelect: () => setPublic(!isPublic),
          },
          {
            label: t('resources.playlist.actions.export'),
            icon: FileDown,
            onSelect: () =>
              exportPlaylistM3U(id, p.name).catch(() => toast.error(t('ra.page.error'))),
          },
          writable && separator,
          writable && {
            label: t('ra.action.delete'),
            icon: Trash2,
            danger: true,
            onSelect: () => (confirmDelete = true),
          },
        )
      : []
</script>

<PageTitle title={p?.name ?? ''} />

{#if playlist.error}
  <EmptyState icon={ListMusic} title={t('ra.page.error')} message={playlist.error.message} />
{:else if !p}
  <div class="flex justify-center py-24"><Spinner class="size-7" /></div>
{:else}
  <!-- Artwork top at 44px, as measured on music.apple.com (32px shell padding + 12px) -->
  <section class="flex flex-col gap-6 pt-3 md:flex-row md:items-stretch md:gap-8">
    <div
      class="group/art relative w-[min(270px,70vw)] shrink-0 self-center overflow-hidden rounded-art-lg shadow-[0_10px_20px_rgb(0_0_0/0.3)] md:self-auto"
    >
      <button
        type="button"
        class="block w-full"
        aria-label={p.name}
        onclick={() => (lightbox = true)}
      >
        <Artwork kind="playlist" record={p} size={270} eager class="rounded-art-lg" />
      </button>
      {#if writable}
        <ImageUploadOverlay
          entity="playlist"
          id={p.id}
          hasUploadedImage={!!p.uploadedImage}
          onchange={() => playlist.reload()}
        />
      {/if}
    </div>

    <div class="flex min-w-0 flex-1 flex-col text-center md:text-left">
      <div class="hidden flex-1 md:block"></div>
      <h1
        class="mb-px flex items-center justify-center gap-2 text-[26px] leading-[30px] font-bold text-label md:justify-start"
      >
        {#if isSmartPlaylist(p)}<Sparkles class="size-6 shrink-0 text-accent" />{/if}
        {p.name}
      </h1>
      <div class="text-[26px] leading-[30px] text-label">{p.ownerName}</div>
      <div class="mt-1 text-callout leading-[15px] font-semibold text-label-2">
        {isPublic ? t('resources.playlist.fields.public') : t('ui.private', { _: 'Private' })}
        · {t('ui.updated', {
          date: formatDate(p.updatedAt),
          _: `Updated ${formatDate(p.updatedAt)}`,
        })}
      </div>
      <div class="hidden flex-1 md:block"></div>
      {#if p.comment}
        <ExpandableText
          text={p.comment}
          lines={3}
          class="mt-4 max-w-[440px] self-center text-left md:mt-0 md:mb-[15px] md:self-start"
        />
      {/if}
      <div class="mt-4 flex flex-wrap items-center justify-center gap-2.5 md:mt-0 md:justify-start">
        <Button size="lg" onclick={playAll(source)} disabled={!p.songCount}>
          <Play fill="currentColor" />{t('resources.album.actions.playAll')}
        </Button>
        <Button size="lg" variant="secondary" onclick={shuffleAll(source)} disabled={!p.songCount}>
          <Shuffle />{t('resources.album.actions.shuffle')}
        </Button>
        <div class="flex items-center gap-1 md:ml-auto">
          <ColumnsMenu listKey="playlistTrack" columns={COLS} defaultOff={OFF} />
          <LoveButton
            id={p.id}
            size="lg"
            bind:starred={() => starred, (v) => (starredBy[id] = v)}
          />
          <ActionMenu items={pageMenu}>
            {#snippet trigger(props)}
              <button
                {...props}
                aria-label={t('ui.more')}
                class={iconButtonVariants({ variant: 'filled', size: 'lg', class: 'text-accent' })}
              >
                <Ellipsis />
              </button>
            {/snippet}
          </ActionMenu>
        </div>
      </div>
    </div>
  </section>

  <section class="mt-10">
    {#if tracks.loading && !tracks.data.length}
      <div class="flex justify-center py-12"><Spinner /></div>
    {:else}
      <SongTable
        songs={tracks.data}
        listKey="playlistTrack"
        variant="list"
        header={false}
        columns={COLS}
        defaultOff={OFF}
        bind:selected
        reorderable={editable}
        onreorder={reorder}
        rowMenu={editable ? (song) => [removeEntry([song])] : undefined}
        bulkMenu={editable ? (rows) => [removeEntry(rows)] : undefined}
      >
        {#snippet empty()}
          <EmptyState
            icon={ListMusic}
            title={t('ui.emptyPlaylist', { _: 'This playlist is empty' })}
            message={t('ui.emptyPlaylistHint', {
              _: 'Drag songs or albums onto it in the sidebar, or use "Add to Playlist".',
            })}
          />
        {/snippet}
      </SongTable>
    {/if}
  </section>

  {#if p.songCount}
    <section class="mt-[34px] flex flex-col pl-3 text-body leading-[18px] text-label-2">
      <p>
        {t('ui.songs', { smart_count: p.songCount })}, {formatDuration2(p.duration)} · {formatBytes(
          p.size,
        )}
      </p>
    </section>
  {/if}

  <Lightbox bind:open={lightbox} src={coverArtUrl('playlist', p)} title={p.name} />

  <ConfirmDialog
    bind:open={confirmDelete}
    title={t('ra.message.delete_title', {
      name: t('resources.playlist.name', { smart_count: 1 }),
      id: p.name,
    })}
    message={t('ra.message.delete_content', {
      name: t('resources.playlist.name', { smart_count: 1 }),
    })}
    danger
    confirmLabel={t('ra.action.delete')}
    onConfirm={async () => {
      await remove('playlist', id)
      toast.success(t('ra.notification.deleted', { smart_count: 1 }))
      void navigate('/playlist', { replace: true })
    }}
  />
{/if}
