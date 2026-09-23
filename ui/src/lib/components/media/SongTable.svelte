<script lang="ts" generics="S extends Song | PlaylistTrack">
  // The track list used across album, playlist, song and artist pages. Interaction follows Apple
  // Music: click selects (Ctrl/Cmd toggles, Shift extends), double-click plays, the track number
  // turns into a play button on hover, and touch devices play on tap. One context menu and one
  // "..." menu are shared by all rows, so long lists stay cheap.
  import { ArrowDown, ArrowUp, Ellipsis, Play, TriangleAlert } from '@lucide/svelte'
  import { DropdownMenu } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import { songMenu, songsMenu } from '$lib/actions.svelte'
  import type { SortOrder } from '$lib/api/rest'
  import type { Album, PlaylistTrack, Song } from '$lib/api/types'
  import { dragMusic } from '$lib/dnd'
  import { t } from '$lib/i18n/index.svelte'
  import { groupByDisc } from '$lib/media'
  import { href } from '$lib/nav.svelte'
  import { player } from '$lib/player/player.svelte'
  import { settings } from '$lib/state/settings.svelte'
  import { cn } from '$lib/utils/cn'
  import { formatBytes, formatDateTime, formatTrackDuration } from '$lib/utils/formatters'
  import ContextMenuArea from '$lib/components/ui/menu/ContextMenuArea.svelte'
  import MenuEntries from '$lib/components/ui/menu/MenuEntries.svelte'
  import { menuContent } from '$lib/components/ui/menu/styles'
  import type { MenuEntry } from '$lib/components/ui/menu/types'
  import ArtistLinks from './ArtistLinks.svelte'
  import Artwork from './Artwork.svelte'
  import LoveButton from './LoveButton.svelte'
  import PlayingBars from './PlayingBars.svelte'
  import QualityBadge from './QualityBadge.svelte'
  import Rating from './Rating.svelte'
  import { COLUMNS, columnEnabled, columnFits, type ColumnId } from './songColumns'

  let {
    songs,
    listKey,
    columns,
    defaultOff = [],
    variant = 'list',
    album,
    sort,
    order,
    onsort,
    onplay,
    rowMenu,
    bulkMenu,
    discMenu,
    reorderable = false,
    onreorder,
    selected = $bindable([]),
    header = variant === 'list',
    numberOffset = 0,
    empty,
  }: {
    songs: S[]
    /** Key under which column visibility is remembered */
    listKey: string
    /** Columns this table offers, in display order */
    columns: ColumnId[]
    /** Columns that start hidden until turned on */
    defaultOff?: ColumnId[]
    /** album: track numbers and disc headers; list: artwork and artist under each title */
    variant?: 'album' | 'list'
    /** For disc headers and disc artwork */
    album?: Album
    sort?: string
    order?: SortOrder
    onsort?: (field: string) => void
    /** Play starting at a row; defaults to playing the whole table from there */
    onplay?: (index: number) => void
    /** Extra entries for a single row's menu (e.g. "Remove from playlist") */
    rowMenu?: (song: S, index: number) => MenuEntry[]
    /** Extra entries for a multi-selection menu */
    bulkMenu?: (songs: S[]) => MenuEntry[]
    /** Menu for a disc header */
    discMenu?: (disc: number) => MenuEntry[]
    reorderable?: boolean
    onreorder?: (from: number, to: number) => void
    /** Selected row ids */
    selected?: string[]
    header?: boolean
    /** Added to row numbers in list variant (paging) */
    numberOffset?: number
    empty?: Snippet
  } = $props()

  const visible = $derived(
    columns.filter(
      (c) =>
        columnEnabled(c) &&
        (c === 'title' || (columnFits(c) && settings.column(listKey, c, !defaultOff.includes(c)))),
    ),
  )
  const selectedSet = $derived(new Set(selected))
  const mediaId = (s: S) => ('mediaFileId' in s && s.mediaFileId ? s.mediaFileId : s.id)
  const playingId = $derived(player.currentSong?.id)

  // Local overrides for stars and ratings toggled in this table
  let starOverrides = $state<Record<string, boolean>>({})
  let ratingOverrides = $state<Record<string, number>>({})

  const discs = $derived(
    variant === 'album' ? groupByDisc(songs) : [{ disc: 0, subtitle: undefined, songs }],
  )
  const showDiscHeaders = $derived(variant === 'album' && discs.length > 1)
  const indexOf = $derived(new Map(songs.map((s, i) => [s.id, i])))

  // ---- Selection -----------------------------------------------------------------------------

  let anchor = -1
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches

  function select(index: number, e: MouseEvent | KeyboardEvent) {
    const id = songs[index].id
    if (e.shiftKey && anchor >= 0) {
      const [a, b] = anchor < index ? [anchor, index] : [index, anchor]
      selected = songs.slice(a, b + 1).map((s) => s.id)
      return
    }
    anchor = index
    if (e.ctrlKey || e.metaKey) {
      selected = selectedSet.has(id) ? selected.filter((x) => x !== id) : [...selected, id]
    } else {
      selected = [id]
    }
  }

  function play(index: number) {
    const song = songs[index]
    if (song.missing) return
    if (onplay) onplay(index)
    else player.playTracks(songs, { startIndex: index })
  }

  function onRowClick(index: number, e: MouseEvent) {
    if ((e.target as HTMLElement).closest('a,button')) return
    if (coarse) play(index)
    else select(index, e)
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') selected = []
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault()
      selected = songs.map((s) => s.id)
    }
  }

  const selection = $derived(songs.filter((s) => selectedSet.has(s.id)))

  // ---- Menus ---------------------------------------------------------------------------------

  let menuIndex = $state(-1)

  function menuFor(index: number): MenuEntry[] {
    const song = songs[index]
    if (!song) return []
    if (selectedSet.has(song.id) && selection.length > 1) {
      return songsMenu(selection, bulkMenu?.(selection) ?? [])
    }
    return songMenu(song, {
      starred: starOverrides[song.id] ?? song.starred,
      onStar: (v) => (starOverrides[song.id] = v),
      extra: rowMenu?.(song, index),
    })
  }

  // One shared "..." dropdown, anchored to whichever row button opened it
  let moreOpen = $state(false)
  let moreAnchor = $state<HTMLElement | null>(null)
  const moreItems = $derived(moreOpen ? menuFor(menuIndex) : [])

  function openMore(index: number, e: MouseEvent) {
    e.stopPropagation()
    menuIndex = index
    moreAnchor = e.currentTarget as HTMLElement
    moreOpen = true
  }

  // ---- Drag ----------------------------------------------------------------------------------

  let dragFrom = $state<number | null>(null)
  let dropBefore = $state<number | null>(null)

  function dragStart(index: number, e: DragEvent) {
    const song = songs[index]
    const group = selectedSet.has(song.id) ? selection : [song]
    dragMusic({
      ids: group.map(mediaId),
      label: group.length === 1 ? song.title : `${group.length}`,
    })(e)
    if (reorderable) dragFrom = index
  }

  // ---- Cells ---------------------------------------------------------------------------------

  const sortableField = (c: ColumnId) => (onsort ? COLUMNS[c].sort : undefined)
  const alignClass = (c: ColumnId) =>
    COLUMNS[c].align === 'right'
      ? 'text-right'
      : COLUMNS[c].align === 'center'
        ? 'text-center'
        : 'text-left'
</script>

{#snippet numberCell(song: S, index: number)}
  {@const isPlaying = mediaId(song) === playingId}
  <div
    class="relative flex h-full items-center {variant === 'album'
      ? 'justify-center'
      : 'justify-end'}"
  >
    {#if isPlaying}
      <span class="group-hover:hidden"><PlayingBars playing={!player.paused} /></span>
    {:else if song.missing}
      <TriangleAlert class="size-3.5 text-warning group-hover:hidden" />
    {:else}
      <span class="leading-[18px] text-label-2 tabular-nums group-hover:hidden">
        {variant === 'album' ? song.trackNumber || '' : numberOffset + index + 1}
      </span>
    {/if}
    {#if !song.missing}
      <button
        type="button"
        class="hidden size-6 items-center justify-center rounded-full text-label group-hover:flex"
        aria-label={t('ui.play')}
        onclick={(e) => {
          e.stopPropagation()
          play(index)
        }}
      >
        <Play class="size-3.5" fill="currentColor" />
      </button>
    {/if}
  </div>
{/snippet}

{#snippet titleCell(song: S)}
  {@const isPlaying = mediaId(song) === playingId}
  <div class="flex min-w-0 items-center gap-3">
    {#if variant === 'list'}
      <div class="size-10 shrink-0">
        <Artwork kind="song" record={{ ...song, id: mediaId(song) }} size={40} />
      </div>
    {/if}
    <div class="min-w-0">
      <div class={cn('truncate text-body', isPlaying ? 'font-semibold text-accent' : 'text-label')}>
        {song.title}{#if song.tags?.subtitle?.[0]}<span class="text-label-2">
            ({song.tags.subtitle[0]})</span
          >{/if}
      </div>
      {#if variant === 'list' || (song.artist && album && song.artist !== album.albumArtist)}
        <div class="truncate text-callout text-label-2">
          <ArtistLinks record={song} role="artist" />
        </div>
      {/if}
    </div>
  </div>
{/snippet}

{#snippet cell(c: ColumnId, song: S, index: number)}
  {#if c === 'trackNumber'}
    {@render numberCell(song, index)}
  {:else if c === 'title'}
    {@render titleCell(song)}
  {:else if c === 'artist'}
    <ArtistLinks record={song} role="artist" class="block truncate" />
  {:else if c === 'albumArtist'}
    <ArtistLinks record={song} role="albumartist" class="block truncate" />
  {:else if c === 'composer'}
    <ArtistLinks record={song} role="composer" limit={3} class="block truncate" />
  {:else if c === 'album'}
    <a href={href(`/album/${song.albumId}/show`)} class="block truncate hover:underline"
      >{song.album}</a
    >
  {:else if c === 'year'}
    {song.year || ''}
  {:else if c === 'duration'}
    <span class="tabular-nums">{formatTrackDuration(song.duration)}</span>
  {:else if c === 'playCount'}
    <span class="tabular-nums">{song.playCount || ''}</span>
  {:else if c === 'playDate'}
    {song.playDate ? formatDateTime(song.playDate) : ''}
  {:else if c === 'createdAt'}
    {formatDateTime(song.createdAt)}
  {:else if c === 'quality'}
    <QualityBadge {song} />
  {:else if c === 'size'}
    <span class="tabular-nums">{formatBytes(song.size)}</span>
  {:else if c === 'bitRate'}
    <span class="tabular-nums">{song.bitRate || ''}</span>
  {:else if c === 'channels'}
    <span class="tabular-nums">{song.channels || ''}</span>
  {:else if c === 'bpm'}
    <span class="tabular-nums">{song.bpm || ''}</span>
  {:else if c === 'genre'}
    <span class="block truncate">{song.genre}</span>
  {:else if c === 'comment'}
    <span class="block truncate" title={song.comment}>{song.comment ?? ''}</span>
  {:else if c === 'path'}
    <span class="block truncate font-mono text-callout" title={song.path}>{song.path}</span>
  {:else if c === 'mood'}
    <span class="block truncate">{song.tags?.mood?.[0] ?? ''}</span>
  {:else if c === 'rating'}
    <Rating
      id={mediaId(song)}
      bind:rating={
        () => ratingOverrides[song.id] ?? song.rating ?? 0, (v) => (ratingOverrides[song.id] = v)
      }
    />
  {:else if c === 'love'}
    <LoveButton
      id={mediaId(song)}
      size="sm"
      class={cn(
        !(starOverrides[song.id] ?? song.starred) &&
          'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
      )}
      bind:starred={
        () => starOverrides[song.id] ?? song.starred ?? false, (v) => (starOverrides[song.id] = v)
      }
    />
  {/if}
{/snippet}

{#snippet row(song: S, index: number)}
  {@const isSelected = selectedSet.has(song.id)}
  <tr
    class={cn(
      // Measured on music.apple.com: 46px rows, each drawing its separator along its top edge (so
      // the first track has one above it), a 12px-radius highlight on hover
      'group h-[46px] border-t border-row-divider text-body text-label-2 [contain-intrinsic-size:auto_46px] [content-visibility:auto] last:border-b',
      '[&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl',
      isSelected ? '[&>td]:bg-accent/20' : 'hover:[&>td]:bg-hover',
      song.missing && 'opacity-50',
      dropBefore === index && dragFrom !== null && 'shadow-[inset_0_2px_0_var(--accent)]',
    )}
    aria-selected={isSelected}
    draggable={!song.missing}
    onclick={(e) => onRowClick(index, e)}
    ondblclick={() => play(index)}
    oncontextmenu={() => {
      menuIndex = index
      if (!isSelected) selected = [song.id]
    }}
    ondragstart={(e) => dragStart(index, e)}
    ondragover={(e) => {
      if (dragFrom === null) return
      e.preventDefault()
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      dropBefore = e.clientY < rect.top + rect.height / 2 ? index : index + 1
    }}
    ondrop={(e) => {
      if (dragFrom === null || dropBefore === null) return
      e.preventDefault()
      const to = dropBefore > dragFrom ? dropBefore - 1 : dropBefore
      if (to !== dragFrom) onreorder?.(dragFrom, to)
      dragFrom = dropBefore = null
    }}
    ondragend={() => (dragFrom = dropBefore = null)}
  >
    {#if variant === 'list'}
      <td class="w-10 pr-1 pl-2">{@render numberCell(song, index)}</td>
    {/if}
    {#each visible as c (c)}
      <td
        class={cn(
          'overflow-hidden px-2',
          c === 'trackNumber' && 'px-0',
          // The title starts right at the 40px number column, as in Apple's tracklist
          c === 'title' && variant === 'album' && 'pl-0',
          alignClass(c),
          c === 'title' && 'text-label',
        )}
      >
        {@render cell(c, song, index)}
      </td>
    {/each}
    <td class="pr-[18px] text-right">
      <button
        type="button"
        aria-label={t('ui.more')}
        class="inline-flex size-7 items-center justify-center rounded-full text-label-2 hover:bg-fill hover:text-label"
        onclick={(e) => openMore(index, e)}
      >
        <Ellipsis class="size-4" />
      </button>
    </td>
  </tr>
{/snippet}

{#if songs.length === 0}
  {@render empty?.()}
{:else}
  <div
    tabindex="0"
    role="grid"
    aria-multiselectable="true"
    class="outline-none"
    onkeydown={onKeydown}
  >
    <table class="w-full table-fixed border-collapse">
      <colgroup>
        {#if variant === 'list'}<col class="w-10" />{/if}
        {#each visible as c (c)}
          <col style:width={COLUMNS[c].width === 'auto' ? undefined : COLUMNS[c].width} />
        {/each}
        <col class="w-[53px]" />
      </colgroup>
      {#if header}
        <thead class="sticky top-0 z-10 bg-page">
          <tr class="h-8 border-b border-divider text-subhead font-semibold text-label-2">
            {#if variant === 'list'}<th class="pr-1 pl-2 text-right font-semibold">#</th>{/if}
            {#each visible as c (c)}
              {@const field = sortableField(c)}
              <th
                class={cn('px-2 font-semibold first:pl-3', alignClass(c))}
                aria-sort={sort === field
                  ? order === 'ASC'
                    ? 'ascending'
                    : 'descending'
                  : undefined}
              >
                {#if field}
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 hover:text-label"
                    onclick={() => onsort?.(field)}
                  >
                    {c === 'trackNumber' ? '#' : c === 'love' ? '' : t(COLUMNS[c].label)}
                    {#if sort === field}
                      {#if order === 'ASC'}<ArrowUp class="size-3" />{:else}<ArrowDown
                          class="size-3"
                        />{/if}
                    {/if}
                  </button>
                {:else}
                  {c === 'trackNumber' ? '#' : c === 'love' ? '' : t(COLUMNS[c].label)}
                {/if}
              </th>
            {/each}
            <th></th>
          </tr>
        </thead>
      {/if}
      <ContextMenuArea items={() => menuFor(menuIndex)}>
        {#snippet children(props)}
          <tbody {...props}>
            {#each discs as group, gi (group.disc)}
              {#if showDiscHeaders}
                <!-- Apple's disc header: a 12/15 semibold label 9px above the first separator, 38px
                     of space before every disc after the first -->
                <tr
                  draggable={!!album}
                  ondragstart={album
                    ? dragMusic({
                        discs: [
                          {
                            albumId: album.id,
                            releaseDate: album.releaseDate ?? '',
                            discNumber: group.disc,
                          },
                        ],
                        label: `${album.name} (${group.disc})`,
                      })
                    : undefined}
                >
                  <td
                    colspan={visible.length + 1 + (variant === 'list' ? 1 : 0)}
                    class={cn('pr-[18px] pb-[9px]', gi > 0 && 'pt-[38px]')}
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-callout leading-[15px] font-semibold text-label-2">
                        {t('resources.song.fields.disc', { discNumber: group.disc })}{group.subtitle
                          ? `: ${group.subtitle}`
                          : ''}
                      </span>
                      {#if discMenu}
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger
                            class="ml-auto inline-flex size-7 items-center justify-center rounded-full text-accent hover:bg-fill"
                            aria-label={t('ui.more')}
                          >
                            <Ellipsis class="size-4" />
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content class={menuContent} align="end" sideOffset={4}>
                              <MenuEntries items={discMenu(group.disc)} />
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      {/if}
                    </div>
                  </td>
                </tr>
              {/if}
              {#each group.songs as song (song.id)}
                {@render row(song, indexOf.get(song.id) ?? 0)}
              {/each}
            {/each}
          </tbody>
        {/snippet}
      </ContextMenuArea>
    </table>
  </div>

  <DropdownMenu.Root bind:open={moreOpen}>
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        class={menuContent}
        customAnchor={moreAnchor}
        align="end"
        sideOffset={4}
        collisionPadding={8}
      >
        <MenuEntries items={moreItems} />
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
{/if}
